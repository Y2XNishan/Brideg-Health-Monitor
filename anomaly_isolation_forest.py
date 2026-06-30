import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.preprocessing import StandardScaler


try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


FEATURE_PATH = 'data/bridge_features.csv'
MODEL_DIR = 'models/'
SCORES_PATH = 'data/if_anomaly_scores.csv'
CONTAMINATION = 0.02
RANDOM_STATE = 42

EXCLUDE_COLS = [
    'timestamp',
    'label_failure_30min',
    'hour_of_day',
    'day_of_week',
    'is_night',
    'sensor_alert_count',
]


def load_data(path):
    print("[IF] Loading features...")
    df = pd.read_csv(path)
    feature_names = [col for col in df.columns if col not in EXCLUDE_COLS]
    X = df.loc[:, feature_names]
    y = df['label_failure_30min']
    print(f"[IF] Feature matrix shape: {X.shape}")
    return X, y, feature_names


def get_scaler_and_normal(X, y):
    normal_mask = y == 0
    X_normal = X.loc[normal_mask]

    print(f"[IF] Training on {len(X_normal)} normal samples...")
    scaler = StandardScaler()
    scaler.fit(X_normal)

    X_scaled_full = scaler.transform(X)
    X_normal_scaled = scaler.transform(X_normal)
    return X_scaled_full, X_normal_scaled, scaler


def train_isolation_forest(X_normal_scaled):
    model = IsolationForest(
        n_estimators=200,
        contamination=CONTAMINATION,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    model.fit(X_normal_scaled)
    print("[IF] Training complete.")
    return model


def score_full_dataset(model, X_scaled_full):
    print("[IF] Scoring full dataset...")
    raw_scores = -model.score_samples(X_scaled_full)
    score_min = raw_scores.min()
    score_max = raw_scores.max()

    if score_max == score_min:
        return np.zeros_like(raw_scores, dtype=float)

    anomaly_scores = (raw_scores - score_min) / (score_max - score_min)
    return anomaly_scores.astype(float)


def evaluate(anomaly_scores, y):
    eval_mask = y != -1
    y_eval = y.loc[eval_mask]
    scores_eval = anomaly_scores[eval_mask.to_numpy()]

    y_true = (y_eval == 1).astype(int)
    y_pred = (scores_eval >= 0.5).astype(int)

    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    auc = roc_auc_score(y_true, scores_eval)

    fault_above_threshold = int(((y_eval == 1) & (scores_eval >= 0.5)).sum())
    normal_above_threshold = int(((y_eval == 0) & (scores_eval >= 0.5)).sum())

    print(f"[IF] Precision: {precision:.3f}")
    print(f"[IF] Recall: {recall:.3f}")
    print(f"[IF] AUC-ROC: {auc:.3f}")
    print(f"[IF] F1 Score: {f1:.3f}")
    print(f"[IF] True fault rows above 0.5: {fault_above_threshold}")
    print(f"[IF] Normal rows above 0.5: {normal_above_threshold}")


def save_outputs(model, scaler, anomaly_scores, df):
    os.makedirs(MODEL_DIR, exist_ok=True)

    model_path = os.path.join(MODEL_DIR, 'isolation_forest.pkl')
    scaler_path = os.path.join(MODEL_DIR, 'if_scaler.pkl')

    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)

    scores_df = pd.DataFrame(
        {
            'timestamp': df['timestamp'],
            'anomaly_score_if': anomaly_scores,
            'label_failure_30min': df['label_failure_30min'],
        }
    )
    scores_df.to_csv(SCORES_PATH, index=False)

    print("[IF] Saved → models/isolation_forest.pkl")
    print("[IF] Saved → models/if_scaler.pkl")
    print("[IF] Saved → data/if_anomaly_scores.csv")


def main():
    df = pd.read_csv(FEATURE_PATH)
    X, y, feature_names = load_data(FEATURE_PATH)
    X_scaled_full, X_normal_scaled, scaler = get_scaler_and_normal(X, y)
    model = train_isolation_forest(X_normal_scaled)
    anomaly_scores = score_full_dataset(model, X_scaled_full)
    evaluate(anomaly_scores, y)
    save_outputs(model, scaler, anomaly_scores, df)


if __name__ == "__main__":
    main()
