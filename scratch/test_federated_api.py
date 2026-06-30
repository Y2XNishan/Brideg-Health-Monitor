import urllib.request
import json
import time

API_BASE = "http://localhost:8000/api"

def test_endpoint(name, url, method="GET", data=None):
    print(f"\n[Test] {name} ({method} {url}) ...")
    req = urllib.request.Request(url, method=method)
    if data:
        req.add_header('Content-Type', 'application/json')
        data_bytes = json.dumps(data).encode('utf-8')
    else:
        data_bytes = None
        
    try:
        with urllib.request.urlopen(req, data=data_bytes) as response:
            status_code = response.getcode()
            content = response.read().decode('utf-8')
            parsed = json.loads(content)
            print(f"Success (HTTP {status_code})!")
            return parsed
    except Exception as e:
        print(f"FAILED! Error: {e}")
        return None

def run_tests():
    # 1. Reset
    test_endpoint("Reset Federated Server", f"{API_BASE}/federated/reset", method="POST")
    
    # 2. Get Status
    status = test_endpoint("Get Status", f"{API_BASE}/federated/status")
    if status:
        print(f"Current round: {status['current_round']}")
        print(f"Bridges count: {status['total_bridges']}")
        print(f"Participating bridges: {status['participating_bridges']}")
        print(f"Global AUC: {status['global_auc']}")
        
    # 3. Run round
    round_res = test_endpoint("Run Round 1", f"{API_BASE}/federated/run-round", method="POST")
    if round_res:
        summary = round_res["round_summary"]
        print(f"Completed round: {summary['round_number']}")
        print(f"New global AUC: {summary['global_auc']}")
        for client in summary["client_metrics"]:
            print(f"  Client {client['bridge_name']} samples: {client['samples']}, AUC before: {client['auc_before']:.4f} -> after: {client['auc_after']:.4f}")
            
    # 4. Get Status again
    status2 = test_endpoint("Get Status post Round 1", f"{API_BASE}/federated/status")
    if status2:
        print(f"Current round: {status2['current_round']}")
        print(f"Weights shared bytes: {status2['weights_shared_bytes']} bytes")
        
    # 5. Get Bridge Stats
    bridge_stats = test_endpoint("Get Stats for Bridge 1", f"{API_BASE}/federated/bridge-stats?bridge_id=1")
    if bridge_stats:
        print(f"Stats length: {len(bridge_stats)}")
        for stat in bridge_stats:
            print(f"  Round {stat['round_number']} improvement: {stat['improvement']:.4f}")

if __name__ == "__main__":
    print("Waiting 2 seconds for backend to ensure fully ready...")
    time.sleep(2)
    run_tests()
