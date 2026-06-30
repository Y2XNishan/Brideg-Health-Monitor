import os
import sys

import matplotlib

matplotlib.use('Agg')

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


plt.style.use('dark_background')

IF_SCORES_PATH = 'data/if_anomaly_scores.csv'
LSTM_SCORES_PATH = 'data/lstm_anomaly_scores.csv'
PIPELINE_SCORES_PATH = 'data/pipeline_scores.csv'
PLOTS_DIR = 'plots'

ALERT_COLORS = {
    'NORMAL': 'green',
    'ANOMALY': 'yellow',
    'WARNING': 'orange',
    'CRITICAL': 'red',
}
LABEL_COLORS = {
    -1: 'blue',
    0: 'gray',
    1: 'red',
}


def _ensure_plots_dir():
    os.makedirs(PLOTS_DIR, exist_ok=True)


def _shade_fault_regions(ax, x, labels):
    fault_mask = np.asarray(labels) == 1
    starts = np.flatnonzero(fault_mask & ~np.r_[False, fault_mask[:-1]])
    ends = np.flatnonzero(fault_mask & ~np.r_[fault_mask[1:], False])

    for idx, (start, end) in enumerate(zip(starts, ends)):
        ax.axvspan(
            x[start],
            x[end],
            color='red',
            alpha=0.18,
            label='fault regions' if idx == 0 else None,
        )


def plot_if_scores_over_time(if_df):
    _ensure_plots_dir()
    x = np.arange(len(if_df))

    fig, ax = plt.subplots(figsize=(14, 4))
    ax.plot(x, if_df['anomaly_score_if'], label='score', linewidth=1.0)
    _shade_fault_regions(ax, x, if_df['label_failure_30min'])
    ax.axhline(0.5, color='orange', linestyle='--', linewidth=1.0, label='threshold')
    ax.set_title('Isolation Forest — anomaly score over time')
    ax.set_xlabel('row index')
    ax.set_ylabel('anomaly score')
    ax.set_ylim(-0.02, 1.02)
    ax.grid(True, alpha=0.2)
    ax.legend(loc='upper right')

    fig.tight_layout()
    output_path = os.path.join(PLOTS_DIR, '05_if_scores_over_time.png')
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
    print('[eval] Saved → plots/05_if_scores_over_time.png')


def plot_lstm_scores_over_time(lstm_df):
    _ensure_plots_dir()
    x = lstm_df['sequence_end_idx'].to_numpy()

    fig, ax = plt.subplots(figsize=(14, 4))
    ax.plot(x, lstm_df['anomaly_score_lstm'], label='score', linewidth=1.0)
    _shade_fault_regions(ax, x, lstm_df['label'])
    ax.axhline(0.5, color='orange', linestyle='--', linewidth=1.0, label='threshold')
    ax.set_title('LSTM Autoencoder — anomaly score over time')
    ax.set_xlabel('row index')
    ax.set_ylabel('anomaly score')
    ax.set_ylim(-0.02, 1.02)
    ax.grid(True, alpha=0.2)
    ax.legend(loc='upper right')

    fig.tight_layout()
    output_path = os.path.join(PLOTS_DIR, '06_lstm_scores_over_time.png')
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
    print('[eval] Saved → plots/06_lstm_scores_over_time.png')


def plot_combined_score_over_time(pipeline_df):
    _ensure_plots_dir()
    x = pipeline_df['row_idx'].to_numpy()
    scores = pipeline_df['combined_score']

    fig, ax = plt.subplots(figsize=(14, 5))
    for level, color in ALERT_COLORS.items():
        masked_scores = scores.where(pipeline_df['alert_level'] == level, np.nan)
        ax.plot(
            x,
            masked_scores,
            color=color,
            linewidth=1.0,
            label=level,
        )

    ax.axhline(
        0.40,
        color='yellow',
        linestyle='--',
        linewidth=1.0,
        label='anomaly threshold',
    )
    ax.axhline(
        0.65,
        color='orange',
        linestyle='--',
        linewidth=1.0,
        label='warning threshold',
    )
    ax.axhline(
        0.80,
        color='red',
        linestyle='--',
        linewidth=1.0,
        label='critical threshold',
    )
    ax.set_title('Combined anomaly pipeline — score over time')
    ax.set_xlabel('row index')
    ax.set_ylabel('combined anomaly score')
    ax.set_ylim(-0.02, 1.02)
    ax.grid(True, alpha=0.2)
    ax.legend(loc='upper right', ncol=2)

    fig.tight_layout()
    output_path = os.path.join(PLOTS_DIR, '07_combined_score_over_time.png')
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
    print('[eval] Saved → plots/07_combined_score_over_time.png')


def plot_if_vs_lstm_scatter(pipeline_df):
    _ensure_plots_dir()

    fig, ax = plt.subplots(figsize=(8, 8))
    for label, color in LABEL_COLORS.items():
        subset = pipeline_df[pipeline_df['true_label'] == label]
        ax.scatter(
            subset['if_score'],
            subset['lstm_score'],
            color=color,
            alpha=0.3,
            s=8,
            label=str(label),
        )

    ax.plot([0, 1], [0, 1], color='white', linestyle='--', linewidth=1.0)
    ax.set_title('IF score vs LSTM score per window')
    ax.set_xlabel('isolation forest score')
    ax.set_ylabel('lstm autoencoder score')
    ax.set_xlim(-0.02, 1.02)
    ax.set_ylim(-0.02, 1.02)
    ax.grid(True, alpha=0.2)
    ax.legend(title='true_label', loc='upper left')

    fig.tight_layout()
    output_path = os.path.join(PLOTS_DIR, '08_if_vs_lstm_scatter.png')
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
    print('[eval] Saved → plots/08_if_vs_lstm_scatter.png')


def plot_alert_level_timeline(pipeline_df):
    _ensure_plots_dir()
    x = pipeline_df['row_idx'].to_numpy()
    rolling_levels = pd.DataFrame(index=pipeline_df.index)

    for level in ALERT_COLORS:
        rolling_levels[level] = (
            (pipeline_df['alert_level'] == level)
            .astype(float)
            .rolling(window=500, min_periods=1)
            .mean()
        )

    fig, ax = plt.subplots(figsize=(14, 5))
    ax.stackplot(
        x,
        [rolling_levels[level] for level in ALERT_COLORS],
        labels=list(ALERT_COLORS.keys()),
        colors=[ALERT_COLORS[level] for level in ALERT_COLORS],
        alpha=0.85,
    )
    ax.set_title('Alert level distribution over time')
    ax.set_xlabel('row index')
    ax.set_ylabel('fraction of rolling window')
    ax.set_ylim(0, 1)
    ax.grid(True, alpha=0.2)
    ax.legend(loc='upper right')

    fig.tight_layout()
    output_path = os.path.join(PLOTS_DIR, '09_alert_level_timeline.png')
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
    print('[eval] Saved → plots/09_alert_level_timeline.png')


def main():
    if_df = pd.read_csv(IF_SCORES_PATH)
    lstm_df = pd.read_csv(LSTM_SCORES_PATH)
    pipeline_df = pd.read_csv(PIPELINE_SCORES_PATH)

    plot_if_scores_over_time(if_df)
    plot_lstm_scores_over_time(lstm_df)
    plot_combined_score_over_time(pipeline_df)
    plot_if_vs_lstm_scatter(pipeline_df)
    plot_alert_level_timeline(pipeline_df)

    print('[eval] All 5 plots saved.')


if __name__ == "__main__":
    main()
