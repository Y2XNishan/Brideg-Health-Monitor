import json
import os
from datetime import datetime
import numpy as np

HISTORY_PATH = os.path.join(os.path.dirname(__file__), 'fed_history.json')

class FederationServer:
    """
    Central server coordinating federated learning.
    Manages global weights, averages client weights via FedAvg, and tracks training history.
    """
    def __init__(self):
        self.global_weights = np.array([0.25, 0.25, 0.25, 0.25, -0.5, 0.5, 1.0, 1.0])
        self.load_history()
        
    def load_history(self):
        if os.path.exists(HISTORY_PATH):
            try:
                with open(HISTORY_PATH, 'r') as f:
                    self.history = json.load(f)
            except Exception:
                self.history = []
        else:
            self.history = []
            self.save_history()

    def save_history(self):
        try:
            with open(HISTORY_PATH, 'w') as f:
                json.dump(self.history, f, indent=2)
        except Exception as e:
            print(f"[fed-server] Error saving history: {e}")

    def get_current_round(self) -> int:
        if not self.history:
            return 0
        return self.history[-1]['round_number']

    def aggregate(self, client_weights_list: list, sample_counts: list) -> list:
        """
        Aggregate client weights using weighted average FedAvg algorithm.
        """
        total_samples = sum(sample_counts)
        if total_samples == 0:
            return self.global_weights.tolist()
            
        weighted_sum = np.zeros_like(self.global_weights)
        for weights, count in zip(client_weights_list, sample_counts):
            weighted_sum += np.array(weights) * count
            
        self.global_weights = weighted_sum / total_samples
        return self.global_weights.tolist()

    def record_round(self, participating_bridges: list, client_metrics_list: list) -> dict:
        """
        Records the results of a finished federated learning round.
        Simulates progress of global AUC accuracy.
        """
        current_round = self.get_current_round() + 1
        
        # Simulates global AUC improving each round: starts at 0.88, increases with convergence.
        if current_round == 1:
            global_auc = 0.88 + np.random.uniform(-0.005, 0.005)
        else:
            prev_auc = self.history[-1]['global_auc']
            improvement = np.random.uniform(0.008, 0.015)
            global_auc = min(0.991, prev_auc + improvement)
            
        round_data = {
            "round_number": current_round,
            "timestamp": datetime.now().isoformat(),
            "participating_bridges": participating_bridges,
            "global_auc": round(float(global_auc), 4),
            "client_metrics": client_metrics_list
        }
        
        self.history.append(round_data)
        self.save_history()
        return round_data

    def get_federation_history(self) -> list:
        return self.history

    def reset(self):
        """Reset the server states to initial rounds."""
        self.history = []
        self.global_weights = np.array([0.25, 0.25, 0.25, 0.25, -0.5, 0.5, 1.0, 1.0])
        self.save_history()
