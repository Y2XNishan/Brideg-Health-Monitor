import os
import sys

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.callbacks import Callback, EarlyStopping
from tensorflow.keras.layers import LSTM, Dense, Input, RepeatVector, TimeDistributed
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam


try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


FEATURE_PATH = 'data/bridge_features.csv'
MODEL_DIR = 'models/'
SCORES_PATH = 'data/lstm_anomaly_scores.csv'
SEQ_LEN = 30
BATCH_SIZE = 32
EPOCHS = 10
LEARNING_RATE = 0.001
RANDOM_STATE = 42

SENSORS = ['water_level', 'vibration', 'strain', 'crack_gap']


class LSTMProgressLogger(Callback):
    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        loss = logs.get('loss', 0.0)
        val_loss = logs.get('val_loss', 0.0)
        print(
            f"[LSTM] Epoch {epoch + 1}/{EPOCHS} - "
            f"loss: {loss:.4f} - val_loss: {val_loss:.4f}"
        )


def load_and_scale(path):
    print("[LSTM] Loading and scaling data...")
    df = pd.read_csv(path)
    X = df.loc[:, SENSORS]
    y = df['label_failure_30min']

    normal_mask = y == 0
    scaler = MinMaxScaler()
    scaler.fit(X.loc[normal_mask])
    X_scaled = scaler.transform(X)

    print(f"[LSTM] Scaled sensor matrix shape: {X_scaled.shape}")
    return X_scaled, y, scaler


def make_sequences(X, y, seq_len):
    sequences = []
    for start_idx in range(len(X) - seq_len + 1):
        end_idx = start_idx + seq_len
        sequences.append(X[start_idx:end_idx])

    sequences = np.asarray(sequences, dtype=np.float32)
    seq_labels = y.iloc[seq_len - 1:].to_numpy()

    print(f"[LSTM] Total sequences: {len(sequences)}")
    return sequences, seq_labels


def build_lstm_ae(seq_len, n_features):
    inputs = Input(shape=(seq_len, n_features))
    encoded = LSTM(64, return_sequences=False, name='encoder_lstm')(inputs)
    repeated = RepeatVector(seq_len)(encoded)
    decoded = LSTM(64, return_sequences=True, name='decoder_lstm')(repeated)
    outputs = TimeDistributed(Dense(n_features), name='output')(decoded)

    model = Model(inputs, outputs)
    model.compile(optimizer=Adam(learning_rate=LEARNING_RATE), loss='mse')
    model.summary()
    return model


def train(model, X_normal_seqs):
    print(f"[LSTM] Normal sequences for training: {len(X_normal_seqs)}")
    print("[LSTM] Training LSTM Autoencoder...")

    early_stop = EarlyStopping(
        monitor='val_loss',
        patience=3,
        restore_best_weights=True,
    )

    history = model.fit(
        X_normal_seqs,
        X_normal_seqs,
        validation_split=0.1,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=[early_stop, LSTMProgressLogger()],
        verbose=0,
        shuffle=True,
    )

    best_val_loss = min(history.history.get('val_loss', [0.0]))
    normal_reconstructions = model.predict(X_normal_seqs, batch_size=BATCH_SIZE, verbose=0)
    normal_mse = np.mean(
        np.square(X_normal_seqs - normal_reconstructions),
        axis=(1, 2),
    )
    model.normal_mse_min_ = normal_mse.min()
    model.normal_mse_max_ = normal_mse.max()

    print(f"[LSTM] Training complete. Best val_loss: {best_val_loss:.4f}")
    return model, history


def compute_anomaly_scores(model, sequences):
    reconstructions = model.predict(sequences, batch_size=BATCH_SIZE, verbose=0)
    mse = np.mean(np.square(sequences - reconstructions), axis=(1, 2))
    mse_min = getattr(model, 'normal_mse_min_', mse.min())
    mse_max = getattr(model, 'normal_mse_max_', mse.max())

    if mse_max == mse_min:
        return np.zeros_like(mse, dtype=float)

    anomaly_scores = np.clip((mse - mse_min) / (mse_max - mse_min), 0.0, 1.0)
    return anomaly_scores.astype(float)


def evaluate(anomaly_scores, seq_labels):
    eval_mask = seq_labels != -1
    y_eval = seq_labels[eval_mask]
    scores_eval = anomaly_scores[eval_mask]

    y_true = (y_eval == 1).astype(int)
    y_pred = (scores_eval >= 0.5).astype(int)

    auc = roc_auc_score(y_true, scores_eval)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    fault_above_threshold = int(((y_eval == 1) & (scores_eval >= 0.5)).sum())

    print(f"[LSTM] AUC-ROC: {auc:.3f}")
    print(f"[LSTM] F1 Score: {f1:.3f}")
    print(f"[LSTM] Precision: {precision:.3f}")
    print(f"[LSTM] Recall: {recall:.3f}")
    print(f"[LSTM] Fault sequences above 0.5: {fault_above_threshold}")


def save_outputs(model, scaler, anomaly_scores, seq_labels, df):
    os.makedirs(MODEL_DIR, exist_ok=True)

    model_path = os.path.join(MODEL_DIR, 'lstm_ae.keras')
    scaler_path = os.path.join(MODEL_DIR, 'lstm_scaler.pkl')

    model.save(model_path)
    joblib.dump(scaler, scaler_path)

    sequence_end_idx = np.arange(SEQ_LEN - 1, SEQ_LEN - 1 + len(anomaly_scores))
    scores_df = pd.DataFrame(
        {
            'sequence_end_idx': sequence_end_idx,
            'anomaly_score_lstm': anomaly_scores,
            'label': seq_labels,
        }
    )
    scores_df.to_csv(SCORES_PATH, index=False)

    print("[LSTM] Saved → models/lstm_ae.keras")
    print("[LSTM] Saved → models/lstm_scaler.pkl")
    print("[LSTM] Saved → data/lstm_anomaly_scores.csv")


def main():
    np.random.seed(RANDOM_STATE)
    tf.random.set_seed(RANDOM_STATE)

    df = pd.read_csv(FEATURE_PATH)
    X_scaled, y, scaler = load_and_scale(FEATURE_PATH)
    sequences, seq_labels = make_sequences(X_scaled, y, SEQ_LEN)
    model = build_lstm_ae(SEQ_LEN, sequences.shape[2])
    X_normal_seqs = sequences[seq_labels == 0]
    model, history = train(model, X_normal_seqs)
    anomaly_scores = compute_anomaly_scores(model, sequences)
    evaluate(anomaly_scores, seq_labels)
    save_outputs(model, scaler, anomaly_scores, seq_labels, df)


if __name__ == "__main__":
    main()
