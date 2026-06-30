import os
import sys
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

# Set environment variables to avoid tf logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import backend.main as main

def main_test():
    # Make sure sensors are loaded and simulators initialized
    main.ensure_simulator_exists(1)
    bridges = main.get_india_bridges()
    print("Bridge ID | Health Score | Anomaly Score | Health Grade")
    print("-" * 55)
    for b in bridges:
        print(f"{b['id']:<9} | {b['health_score']:<12} | {b['anomaly_score']:<13} | {b['health_grade']}")

if __name__ == '__main__':
    main_test()
