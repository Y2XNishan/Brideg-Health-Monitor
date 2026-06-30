import importlib.util
import subprocess
import sys
from pathlib import Path


REQUIRED_PACKAGES = {
    'imblearn': 'imbalanced-learn',
    'joblib': 'joblib',
    'matplotlib': 'matplotlib',
    'numpy': 'numpy',
    'pandas': 'pandas',
    'sklearn': 'scikit-learn',
    'xgboost': 'xgboost',
}


def install_missing_libraries():
    for module_name, package_name in REQUIRED_PACKAGES.items():
        if importlib.util.find_spec(module_name) is None:
            print(f"[XGB] Installing missing library: {package_name}")
            subprocess.check_call(
                [sys.executable, '-m', 'pip', 'install', package_name]
            )


install_missing_libraries()

import joblib
import matplotlib

matplotlib.use('Agg')

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.metrics import (
    accuracy_score,
    auc,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_curve,
)
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier


try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


PROJECT_ROOT = Path(__file__).resolve().parents[1]
FEATURE_PATH = PROJECT_ROOT / 'data' / 'bridge_features.csv'
MODEL_DIR = PROJECT_ROOT / 'models'
PLOTS_DIR = PROJECT_ROOT / 'plots'
PREDICTIONS_PATH = PROJECT_ROOT / 'data' / 'xgb_predictions.csv'
MODEL_PATH = MODEL_DIR / 'xgboost_model.pkl'
SCALER_PATH = MODEL_DIR / 'xgb_scaler.pkl'

RANDOM_STATE = 42
FORECAST_HORIZON = 30
TRAIN_FRACTION = 0.80
PREDICTION_THRESHOLD = 0.30

EXCLUDE_COLS = {
    'timestamp',
    'is_fault',
    'label_failure_30min',
    'failure_in_30min',
}


def load_data():
    print('[XGB] Loading data/bridge_features.csv')
    df = pd.read_csv(FEATURE_PATH)
    print(f"[XGB] Loaded shape: {df.shape}")
    return df


def ensure_is_fault(df):
    if 'is_fault' not in df.columns:
        raise ValueError(
            "data/bridge_features.csv must contain an 'is_fault' column."
        )

    df['is_fault'] = df['is_fault'].astype(int)
    return df


def create_target(df):
    df['failure_in_30min'] = df['is_fault'].shift(-FORECAST_HORIZON)
    df = df.dropna(subset=['failure_in_30min']).copy()
    df['failure_in_30min'] = df['failure_in_30min'].astype(int)
    print(
        '[XGB] Target distribution:',
        df['failure_in_30min'].value_counts().sort_index().to_dict(),
    )
    return df


def get_feature_matrix(df):
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    feature_cols = [col for col in numeric_cols if col not in EXCLUDE_COLS]
    X = df.loc[:, feature_cols]
    y = df['failure_in_30min'].astype(int)
    print(f"[XGB] Feature matrix shape: {X.shape}")
    return X, y, feature_cols


def print_class_distribution(name, y):
    y_series = pd.Series(y)
    counts = y_series.value_counts().reindex([0, 1], fill_value=0).sort_index()
    percentages = (counts / len(y_series) * 100.0).round(1)
    print(
        f"[XGB] {name} class distribution: "
        f"0={counts[0]} ({percentages[0]:.1f}%), "
        f"1={counts[1]} ({percentages[1]:.1f}%)"
    )
    return counts


def split_time_ordered(X, y, df):
    split_idx = int(len(df) * TRAIN_FRACTION)
    X_train = X.iloc[:split_idx]
    X_test = X.iloc[split_idx:]
    y_train = y.iloc[:split_idx]
    y_test = y.iloc[split_idx:]
    test_meta = df.iloc[split_idx:].copy()

    print(f"[XGB] Train rows: {len(X_train)}")
    print(f"[XGB] Test rows: {len(X_test)}")
    print_class_distribution('Train', y_train)
    print_class_distribution('Test', y_test)

    if y_train.nunique() < 2 or y_test.nunique() < 2:
        raise ValueError(
            'Train and test splits must both contain classes 0 and 1.'
        )

    return X_train, X_test, y_train, y_test, test_meta


def train_model(X_train, y_train, X_test):
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    train_counts = y_train.value_counts().reindex([0, 1], fill_value=0)
    scale_pos_weight = train_counts[0] / train_counts[1]
    print(f"[XGB] scale_pos_weight: {scale_pos_weight:.3f}")

    smote = SMOTE(random_state=RANDOM_STATE)
    X_train_resampled, y_train_resampled = smote.fit_resample(
        X_train_scaled,
        y_train,
    )
    print_class_distribution('Train after SMOTE', y_train_resampled)

    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=scale_pos_weight,
        objective='binary:logistic',
        eval_metric='logloss',
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    print('[XGB] Training XGBoost classifier...')
    model.fit(X_train_resampled, y_train_resampled)
    print('[XGB] Training complete.')
    return model, scaler, X_test_scaled


def evaluate_model(model, X_test_scaled, y_test):
    y_prob = model.predict_proba(X_test_scaled)[:, 1]
    y_pred = (y_prob >= PREDICTION_THRESHOLD).astype(int)

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)

    fpr, tpr, _ = roc_curve(y_test, y_prob)
    auc_roc = auc(fpr, tpr)

    tn, fp, fn, tp = confusion_matrix(y_test, y_pred, labels=[0, 1]).ravel()

    print(f"[XGB] Accuracy : {accuracy:.3f}")
    print(f"[XGB] Precision: {precision:.3f}")
    print(f"[XGB] Recall   : {recall:.3f}")
    print(f"[XGB] F1 Score : {f1:.3f}")
    print(f"[XGB] AUC-ROC  : {auc_roc:.3f}")
    print(f"[XGB] Threshold: {PREDICTION_THRESHOLD:.2f}")
    print(f"[XGB] Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")

    return y_pred, y_prob, fpr, tpr, auc_roc


def save_model_outputs(model, scaler):
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print('[XGB] Saved → models/xgboost_model.pkl')
    print('[XGB] Saved → models/xgb_scaler.pkl')


def save_predictions(test_meta, y_test, y_pred, y_prob):
    predictions = pd.DataFrame(
        {
            'row_idx': test_meta.index,
            'failure_in_30min': y_test.to_numpy(),
            'prediction': y_pred,
            'failure_probability': y_prob,
        }
    )
    if 'timestamp' in test_meta.columns:
        predictions.insert(1, 'timestamp', test_meta['timestamp'].to_numpy())

    predictions.to_csv(PREDICTIONS_PATH, index=False)
    print('[XGB] Saved → data/xgb_predictions.csv')


def plot_confusion_matrix(y_test, y_pred):
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])

    fig, ax = plt.subplots(figsize=(6, 5))
    image = ax.imshow(cm, cmap='Purples')
    fig.colorbar(image, ax=ax)

    ax.set_title('XGBoost Confusion Matrix')
    ax.set_xlabel('Predicted label')
    ax.set_ylabel('True label')
    ax.set_xticks([0, 1])
    ax.set_yticks([0, 1])
    ax.set_xticklabels(['0', '1'])
    ax.set_yticklabels(['0', '1'])

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(
                j,
                i,
                str(cm[i, j]),
                ha='center',
                va='center',
                color='white' if cm[i, j] > cm.max() / 2 else 'black',
            )

    fig.tight_layout()
    fig.savefig(PLOTS_DIR / '12_xgb_confusion_matrix.png', dpi=150)
    plt.close(fig)
    print('[XGB] Saved → plots/12_xgb_confusion_matrix.png')


def plot_roc_curve(fpr, tpr, auc_roc):
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(7, 5))
    ax.plot(
        fpr,
        tpr,
        color='darkorange',
        linewidth=2,
        label=f'ROC curve (AUC = {auc_roc:.3f})',
    )
    ax.plot([0, 1], [0, 1], color='navy', linestyle='--', linewidth=1)
    ax.set_title('XGBoost ROC Curve')
    ax.set_xlabel('False Positive Rate')
    ax.set_ylabel('True Positive Rate')
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1.05)
    ax.grid(True, alpha=0.3)
    ax.legend(loc='lower right')

    fig.tight_layout()
    fig.savefig(PLOTS_DIR / '13_xgb_roc_curve.png', dpi=150)
    plt.close(fig)
    print('[XGB] Saved → plots/13_xgb_roc_curve.png')


def main():
    df = load_data()
    df = ensure_is_fault(df)
    df = create_target(df)
    X, y, feature_cols = get_feature_matrix(df)
    X_train, X_test, y_train, y_test, test_meta = split_time_ordered(X, y, df)
    model, scaler, X_test_scaled = train_model(X_train, y_train, X_test)
    y_pred, y_prob, fpr, tpr, auc_roc = evaluate_model(
        model,
        X_test_scaled,
        y_test,
    )

    save_model_outputs(model, scaler)
    save_predictions(test_meta, y_test, y_pred, y_prob)
    plot_confusion_matrix(y_test, y_pred)
    plot_roc_curve(fpr, tpr, auc_roc)
    print('[XGB] XGBoost prediction pipeline complete.')


if __name__ == '__main__':
    main()
