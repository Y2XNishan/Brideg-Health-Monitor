import sys
from pathlib import Path

import joblib
import matplotlib

matplotlib.use('Agg')

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    auc,
    f1_score,
    precision_score,
    recall_score,
    roc_curve,
)


try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


PROJECT_ROOT = Path(__file__).resolve().parents[1]
FEATURE_PATH = PROJECT_ROOT / 'data' / 'bridge_features.csv'
MODEL_DIR = PROJECT_ROOT / 'models'
PLOTS_DIR = PROJECT_ROOT / 'plots'
OUTPUT_PATH = PROJECT_ROOT / 'data' / 'pipeline_b_scores.csv'
PLOT_PATH = PLOTS_DIR / '14_pipeline_b_scores.png'

RF_MODEL_PATH = MODEL_DIR / 'random_forest.pkl'
RF_SCALER_PATH = MODEL_DIR / 'rf_scaler.pkl'
XGB_MODEL_PATH = MODEL_DIR / 'xgboost_model.pkl'
XGB_SCALER_PATH = MODEL_DIR / 'xgb_scaler.pkl'

FORECAST_HORIZON = 30
TRAIN_FRACTION = 0.80
RF_WEIGHT = 0.40
XGB_WEIGHT = 0.60
THRESHOLD = 0.30

EXCLUDE_COLS = {
    'timestamp',
    'is_fault',
    'label_failure_30min',
    'failure_in_30min',
}

ALERT_COLORS = {
    'NORMAL': 'green',
    'WATCH': 'yellow',
    'WARNING': 'orange',
    'CRITICAL': 'red',
}


def load_models():
    rf_model = joblib.load(RF_MODEL_PATH)
    rf_scaler = joblib.load(RF_SCALER_PATH)
    xgb_model = joblib.load(XGB_MODEL_PATH)
    xgb_scaler = joblib.load(XGB_SCALER_PATH)
    print('[Pipeline B] Models and scalers loaded.')
    return rf_model, rf_scaler, xgb_model, xgb_scaler


def load_and_prepare_data():
    df = pd.read_csv(FEATURE_PATH)
    if 'is_fault' not in df.columns:
        raise ValueError("data/bridge_features.csv must contain an 'is_fault' column.")

    df['is_fault'] = df['is_fault'].astype(int)
    df['failure_in_30min'] = df['is_fault'].shift(-FORECAST_HORIZON)
    df = df.dropna(subset=['failure_in_30min']).copy()
    df['failure_in_30min'] = df['failure_in_30min'].astype(int)

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    feature_cols = [col for col in numeric_cols if col not in EXCLUDE_COLS]
    X = df.loc[:, feature_cols]
    y = df['failure_in_30min'].astype(int)

    split_idx = int(len(df) * TRAIN_FRACTION)
    X_test = X.iloc[split_idx:]
    y_test = y.iloc[split_idx:]
    test_meta = df.iloc[split_idx:].copy()

    print(f"[Pipeline B] Test rows: {len(X_test)}")
    print(
        '[Pipeline B] Test class distribution:',
        y_test.value_counts().sort_index().to_dict(),
    )
    return X_test, y_test, test_meta


def get_alert_level(score):
    if score >= 0.85:
        return 'CRITICAL'
    if score >= 0.60:
        return 'WARNING'
    if score >= 0.30:
        return 'WATCH'
    return 'NORMAL'


def score_models(rf_model, rf_scaler, xgb_model, xgb_scaler, X_test):
    rf_probs = rf_model.predict_proba(rf_scaler.transform(X_test))[:, 1]
    xgb_probs = xgb_model.predict_proba(xgb_scaler.transform(X_test))[:, 1]
    combined_scores = np.clip(
        RF_WEIGHT * rf_probs + XGB_WEIGHT * xgb_probs,
        0.0,
        1.0,
    )
    return rf_probs, xgb_probs, combined_scores


def evaluate(combined_scores, y_test):
    y_pred = (combined_scores >= THRESHOLD).astype(int)
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    fpr, tpr, _ = roc_curve(y_test, combined_scores)
    auc_roc = auc(fpr, tpr)

    print(f"[Pipeline B] Accuracy : {accuracy:.3f}")
    print(f"[Pipeline B] Precision: {precision:.3f}")
    print(f"[Pipeline B] Recall   : {recall:.3f}")
    print(f"[Pipeline B] F1 Score : {f1:.3f}")
    print(f"[Pipeline B] AUC-ROC  : {auc_roc:.3f}")
    print(f"[Pipeline B] Threshold: {THRESHOLD:.2f}")
    return y_pred, auc_roc


def save_outputs(test_meta, y_test, combined_scores):
    alert_levels = [get_alert_level(score) for score in combined_scores]
    output_df = pd.DataFrame(
        {
            'timestamp': test_meta['timestamp'].to_numpy(),
            'combined_score': combined_scores,
            'alert_level': alert_levels,
            'actual_label': y_test.to_numpy(),
        }
    )
    output_df.to_csv(OUTPUT_PATH, index=False)
    print('[Pipeline B] Saved → data/pipeline_b_scores.csv')
    return output_df


def plot_scores(output_df):
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)
    x = np.arange(len(output_df))

    fig, ax = plt.subplots(figsize=(14, 5))
    for level, color in ALERT_COLORS.items():
        masked_scores = output_df['combined_score'].where(
            output_df['alert_level'] == level,
            np.nan,
        )
        ax.plot(
            x,
            masked_scores,
            color=color,
            linewidth=1.2,
            label=level,
        )

    ax.axhline(0.30, color='yellow', linestyle='--', linewidth=1.0, alpha=0.8)
    ax.axhline(0.60, color='orange', linestyle='--', linewidth=1.0, alpha=0.8)
    ax.axhline(0.85, color='red', linestyle='--', linewidth=1.0, alpha=0.8)
    ax.set_title('Pipeline B combined failure risk score over time')
    ax.set_xlabel('test row index')
    ax.set_ylabel('combined score')
    ax.set_ylim(-0.02, 1.02)
    ax.grid(True, alpha=0.25)
    ax.legend(loc='upper right')

    fig.tight_layout()
    fig.savefig(PLOT_PATH, dpi=150)
    plt.close(fig)
    print('[Pipeline B] Saved → plots/14_pipeline_b_scores.png')


def main():
    rf_model, rf_scaler, xgb_model, xgb_scaler = load_models()
    X_test, y_test, test_meta = load_and_prepare_data()
    rf_probs, xgb_probs, combined_scores = score_models(
        rf_model,
        rf_scaler,
        xgb_model,
        xgb_scaler,
        X_test,
    )
    evaluate(combined_scores, y_test)
    output_df = save_outputs(test_meta, y_test, combined_scores)
    plot_scores(output_df)
    print('[Pipeline B] Prediction pipeline complete.')


if __name__ == '__main__':
    main()
