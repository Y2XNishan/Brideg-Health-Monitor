import numpy as np

def fed_avg(weights_list: list, sample_counts: list) -> list:
    """
    Weighted averaging FedAvg algorithm.
    """
    total_samples = sum(sample_counts)
    if total_samples == 0:
        return np.zeros_like(weights_list[0]).tolist()
        
    weighted_sum = np.zeros_like(weights_list[0])
    for w, count in zip(weights_list, sample_counts):
        weighted_sum += np.array(w) * count
        
    return (weighted_sum / total_samples).tolist()

def compute_model_divergence(w1: list, w2: list) -> float:
    """
    Compute similarity / divergence between two model weight vectors using Cosine Similarity.
    Returns value between -1.0 and 1.0.
    """
    vec1 = np.array(w1)
    vec2 = np.array(w2)
    
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
        
    cosine_sim = np.dot(vec1, vec2) / (norm1 * norm2)
    return float(cosine_sim)

def check_convergence(history: list, threshold: float = 0.001) -> bool:
    """
    Returns True if the global model has converged.
    Defined as global AUC improvements of less than threshold over the last 3 rounds.
    """
    if len(history) < 3:
        return False
        
    auc_history = [r['global_auc'] for r in history[-3:]]
    
    diff1 = abs(auc_history[1] - auc_history[0])
    diff2 = abs(auc_history[2] - auc_history[1])
    
    return diff1 < threshold and diff2 < threshold
