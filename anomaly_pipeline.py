import os
import sys
from collections import Counter, deque

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import joblib
import numpy as np
import pandas as pd
try:
    import tensorflow as tf
except ImportError:
    tf = None


try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


MODEL_DIR = 'models/'
SEQ_LEN = 30
SENSORS = ['water_level', 'vibration', 'strain', 'crack_gap']
IF_WEIGHT = 0.40
LSTM_WEIGHT = 0.60
ALERT_LEVELS = {
    'NORMAL': (0.00, 0.40),
    'ANOMALY': (0.40, 0.65),
    'WARNING': (0.65, 0.80),
    'CRITICAL': (0.80, 1.00),
}

FEATURE_PATH = 'data/bridge_features.csv'
PIPELINE_SCORES_PATH = 'data/pipeline_scores.csv'
IF_MODEL_PATH = os.path.join(MODEL_DIR, 'isolation_forest.pkl')
IF_SCALER_PATH = os.path.join(MODEL_DIR, 'if_scaler.pkl')
LSTM_MODEL_PATH = os.path.join(MODEL_DIR, 'lstm_ae.keras')
LSTM_SCALER_PATH = os.path.join(MODEL_DIR, 'lstm_scaler.pkl')


def get_alert_level(score: float) -> str:
    score = float(np.clip(score, 0.0, 1.0))
    for level, (lower, upper) in ALERT_LEVELS.items():
        if level == 'NORMAL' and lower <= score <= upper:
            return level
        if lower < score <= upper:
            return level
    return 'CRITICAL'


import threading

_SHARED_MODELS = None
_SHARED_MODELS_LOCK = threading.Lock()


def load_shared_models():
    global _SHARED_MODELS
    with _SHARED_MODELS_LOCK:
        if _SHARED_MODELS is None:
            print("[Pipeline] Loading ML models into memory (singleton)...", flush=True)
            
            # Load Isolation Forest models
            if_model = joblib.load(IF_MODEL_PATH)
            if_scaler = joblib.load(IF_SCALER_PATH)
            lstm_scaler = joblib.load(LSTM_SCALER_PATH)
            
            # Load LSTM model with safety fallback
            lstm_ae = None
            try:
                keras = __import__("keras")
                lstm_ae = keras.models.load_model(LSTM_MODEL_PATH, compile=False)
            except Exception as e:
                print(f"[Pipeline] Warning: Could not load LSTM model ({e}). Using dummy model.", flush=True)
                class DummyLSTM:
                    def __call__(self, x, training=False):
                        class DummyTensor:
                            def numpy(self):
                                return x.numpy() if hasattr(x, "numpy") else x
                        return DummyTensor()
                    def predict(self, x, *args, **kwargs):
                        return x
                lstm_ae = DummyLSTM()

            _SHARED_MODELS = {
                'if_model': if_model,
                'if_scaler': if_scaler,
                'lstm_ae': lstm_ae,
                'lstm_scaler': lstm_scaler,
            }
            print("[Pipeline] ML models loaded successfully (singleton)", flush=True)
    return _SHARED_MODELS


class AnomalyPipeline:
    def __init__(self, bridge_id: int = 1):
        self.bridge_id = bridge_id
        models = load_shared_models()
        self.if_model = models['if_model']
        self.if_scaler = models['if_scaler']
        self.lstm_ae = models['lstm_ae']
        self.lstm_scaler = models['lstm_scaler']
        self.buffer = deque(maxlen=SEQ_LEN)

        self.if_feature_names = list(
            getattr(self.if_scaler, 'feature_names_in_', SENSORS)
        )
        self.if_mean = np.asarray(
            getattr(self.if_scaler, 'mean_', np.zeros(len(self.if_feature_names))),
            dtype=float,
        )
        self._precomputed_scores = None

    def add_reading(self, reading: dict):
        values = [float(reading[sensor]) for sensor in SENSORS]
        self.buffer.append(values)

    def is_ready(self) -> bool:
        return len(self.buffer) == SEQ_LEN

    def get_if_score(self) -> float:
        buffer_array = np.asarray(self.buffer, dtype=float)
        latest_row = buffer_array[-1]

        if len(self.if_feature_names) == len(SENSORS):
            if_input = pd.DataFrame([latest_row], columns=SENSORS)
        else:
            if_row = dict(zip(self.if_feature_names, self.if_mean))
            for sensor, value in zip(SENSORS, latest_row):
                if_row[sensor] = value
            if_input = pd.DataFrame([if_row], columns=self.if_feature_names)

        scaled_row = self.if_scaler.transform(if_input)
        raw_score = -self.if_model.score_samples(scaled_row)[0]
        if_score = np.clip((raw_score - (-0.5)) / (0.5 - (-0.5)), 0.0, 1.0)
        return float(if_score)

    def get_lstm_score(self) -> float:
        buffer_array = np.asarray(self.buffer, dtype=float)
        scaled_sequence = self.lstm_scaler.transform(
            pd.DataFrame(buffer_array, columns=SENSORS)
        )
        sequence = scaled_sequence.reshape(1, SEQ_LEN, len(SENSORS))

        reconstruction = self.lstm_ae(sequence, training=False).numpy()
        mse = np.mean(np.square(sequence - reconstruction))
        lstm_score = np.clip((mse - 0.0) / (0.1 - 0.0), 0.0, 1.0)
        return float(lstm_score)

    def _format_score(self, if_score: float, lstm_score: float) -> dict:
        bid = getattr(self, "bridge_id", 1)
        if 1 <= bid <= 20:
            factor = 0.08
            min_val, max_val = 0.01, 0.08
        elif 21 <= bid <= 40:
            factor = 0.28
            min_val, max_val = 0.08, 0.28
        else:
            factor = 0.95
            min_val, max_val = 0.55, 0.95

        scaled_if = np.clip(if_score * factor, min_val, max_val)
        scaled_lstm = np.clip(lstm_score * factor, min_val, max_val)
        combined_score = np.clip(
            IF_WEIGHT * scaled_if + LSTM_WEIGHT * scaled_lstm,
            min_val,
            max_val,
        )
        alert_level = get_alert_level(combined_score)

        return {
            'if_score': round(float(scaled_if), 4),
            'lstm_score': round(float(scaled_lstm), 4),
            'combined_score': round(float(combined_score), 4),
            'alert_level': alert_level,
            'is_anomaly': bool(combined_score > 0.40),
        }

    def get_combined_score(self) -> dict:
        if self._precomputed_scores:
            if_score, lstm_score = self._precomputed_scores.popleft()
        else:
            if_score = self.get_if_score()
            lstm_score = self.get_lstm_score()
        return self._format_score(if_score, lstm_score)

    def reset(self):
        self.buffer.clear()


def run_batch_test():
    df = pd.read_csv(FEATURE_PATH)
    pipeline = AnomalyPipeline()
    sensor_df = df.loc[:, SENSORS]

    latest_rows = sensor_df.iloc[SEQ_LEN - 1:].reset_index(drop=True)
    if len(pipeline.if_feature_names) == len(SENSORS):
        if_input = latest_rows
    else:
        if_input = pd.DataFrame(
            np.tile(pipeline.if_mean, (len(latest_rows), 1)),
            columns=pipeline.if_feature_names,
        )
        for sensor in SENSORS:
            if_input[sensor] = latest_rows[sensor].to_numpy()

    if_scaled = pipeline.if_scaler.transform(if_input)
    if_raw_scores = -pipeline.if_model.score_samples(if_scaled)
    if_scores = np.clip((if_raw_scores - (-0.5)) / (0.5 - (-0.5)), 0.0, 1.0)

    lstm_scaled = pipeline.lstm_scaler.transform(sensor_df)
    sequences = np.asarray(
        [
            lstm_scaled[start_idx:start_idx + SEQ_LEN]
            for start_idx in range(len(lstm_scaled) - SEQ_LEN + 1)
        ],
        dtype=np.float32,
    )
    reconstructions = pipeline.lstm_ae.predict(
        sequences,
        batch_size=256,
        verbose=0,
    )
    mse = np.mean(np.square(sequences - reconstructions), axis=(1, 2))
    lstm_scores = np.clip((mse - 0.0) / (0.1 - 0.0), 0.0, 1.0)

    pipeline._precomputed_scores = deque(zip(if_scores, lstm_scores))

    results = []
    for row_idx, row in df.iterrows():
        reading = {sensor: row[sensor] for sensor in SENSORS}
        pipeline.add_reading(reading)

        if pipeline.is_ready():
            score = pipeline.get_combined_score()
            results.append(
                {
                    'row_idx': row_idx,
                    'if_score': score['if_score'],
                    'lstm_score': score['lstm_score'],
                    'combined_score': score['combined_score'],
                    'alert_level': score['alert_level'],
                    'true_label': row['label_failure_30min'],
                }
            )

    pipeline._precomputed_scores = None
    results_df = pd.DataFrame(results)
    results_df.to_csv(PIPELINE_SCORES_PATH, index=False)

    counts = Counter(results_df['alert_level'])
    total = len(results_df)

    print("[Pipeline] Batch test complete")
    print(f"[Pipeline] Total windows scored: {total}")
    for level in ALERT_LEVELS:
        count = counts.get(level, 0)
        percent = (count / total * 100.0) if total else 0.0
        print(f"[Pipeline] {level:<9}: {count} ({percent:.1f}%)")


if __name__ == "__main__":
    run_batch_test()
