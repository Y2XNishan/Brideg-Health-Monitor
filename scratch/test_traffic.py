import sys
from pathlib import Path
import requests

# Add project root and backend to python path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from traffic import classify_vehicle, generate_crossing_event, TrafficMonitor, VEHICLE_TYPES

def test_programmatic_classification():
    print("Testing programmatic classification ...")
    
    # 1. Motorcycle
    res = classify_vehicle(peak_vib=0.40, strain_delta=5, duration=1.8)
    assert res["type"] == "Motorcycle", f"Expected Motorcycle, got {res['type']}"
    assert not res["overloaded"], "Motorcycle should not be overloaded"
    print("  [OK] Motorcycle range classification passed.")

    # 2. Car / SUV
    res = classify_vehicle(peak_vib=0.60, strain_delta=10, duration=3.0)
    assert res["type"] == "Car / SUV", f"Expected Car / SUV, got {res['type']}"
    print("  [OK] Car / SUV range classification passed.")

    # 3. Light Truck (threshold 10t, typical 8t)
    res = classify_vehicle(peak_vib=1.25, strain_delta=38, duration=7.5)
    assert res["type"] == "Light Truck", f"Expected Light Truck, got {res['type']}"
    print(f"  [OK] Light Truck classification passed. Weight: {res['load_estimate_tonnes']:.1f}t, Overloaded: {res['overloaded']}")

    # 4. Overloaded Truck (vib > 1.70 always Overloaded Truck)
    res = classify_vehicle(peak_vib=1.95, strain_delta=80, duration=10.0)
    assert res["type"] == "Overloaded Truck", f"Expected Overloaded Truck, got {res['type']}"
    assert res["overloaded"], "Overloaded Truck should be flagged overloaded"
    print("  [OK] Overloaded Truck classification passed.")

def test_programmatic_monitor():
    print("\nTesting programmatic TrafficMonitor state ...")
    monitor = TrafficMonitor(1)
    
    # Check initial state
    stats = monitor.get_stats()
    assert stats["today"]["total_vehicles"] == 0
    assert stats["today"]["total_tonnage"] == 0.0
    assert stats["today"]["fatigue_score"] == 0.0
    print("  [OK] Initial stats are clean.")

    # Create mockup crossings
    e1 = {
        "timestamp": "2026-06-02T10:15:30",
        "load_estimate_tonnes": 1.5,
        "overloaded": False
    }
    e2 = {
        "timestamp": "2026-06-02T10:45:00",
        "load_estimate_tonnes": 45.0,
        "overloaded": True
    }
    
    monitor.add_crossing(e1)
    monitor.add_crossing(e2)
    
    stats = monitor.get_stats()
    assert stats["today"]["total_vehicles"] == 2
    assert stats["today"]["total_tonnage"] == 46.5
    # Fatigue check: e1 (1.5t < 5t) -> +0.001, e2 (overloaded) -> +0.065. Total = 0.066
    assert abs(stats["today"]["fatigue_score"] - 0.1) < 0.05, f"Expected ~0.1 fatigue, got {stats['today']['fatigue_score']}"
    print(f"  [OK] Crossing additions and fatigue tracking passed. Fatigue score: {stats['today']['fatigue_score']:.3f}")

    # Test reset
    monitor.reset()
    stats = monitor.get_stats()
    assert stats["today"]["total_vehicles"] == 0
    assert stats["today"]["fatigue_score"] == 0.0
    print("  [OK] Monitor reset successfully cleared all state.")

def test_http_endpoints():
    print("\nTesting HTTP API Endpoints ...")
    BASE_URL = "http://localhost:8000"
    
    # 1. Test GET /api/traffic
    print("Testing GET /api/traffic ...")
    res = requests.get(f"{BASE_URL}/api/traffic?bridge_id=1")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert "today" in data, "Response should contain today's stats"
    assert "hourly_counts" in data, "Response should contain hourly_counts list"
    assert len(data["hourly_counts"]) == 24, f"Expected 24 hours, got {len(data['hourly_counts'])}"
    print("  [OK] GET /api/traffic successful.")
    
    # 2. Test GET /api/traffic/crossing
    print("Testing GET /api/traffic/crossing (force event) ...")
    res = requests.get(f"{BASE_URL}/api/traffic/crossing?bridge_id=1")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    event = res.json()
    assert "vehicle_type" in event, "Event should contain vehicle_type"
    assert "load_estimate_tonnes" in event, "Event should contain load_estimate_tonnes"
    print(f"  [OK] Forced crossing successful. Vehicle: {event['vehicle_type']} | Load: {event['load_estimate_tonnes']}t | Overloaded: {event['overloaded']}")

    # 3. Verify stats updated
    res = requests.get(f"{BASE_URL}/api/traffic?bridge_id=1")
    data = res.json()
    assert data["today"]["total_vehicles"] >= 1, "Total vehicles should be updated"
    print(f"  [OK] Verified statistics updated dynamically. Total: {data['today']['total_vehicles']}")

    # 4. Test POST /api/traffic/reset
    print("Testing POST /api/traffic/reset ...")
    res = requests.post(f"{BASE_URL}/api/traffic/reset?bridge_id=1")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    res_data = res.json()
    assert res_data["status"] == "reset"
    
    # Verify stats cleared
    res = requests.get(f"{BASE_URL}/api/traffic?bridge_id=1")
    data = res.json()
    assert data["today"]["total_vehicles"] == 0, "Stats should be 0 after reset"
    print("  [OK] POST /api/traffic/reset successfully cleared stats.")

if __name__ == "__main__":
    try:
        test_programmatic_classification()
        test_programmatic_monitor()
        test_http_endpoints()
        print("\nALL VEHICLE MONITORING TESTS PASSED SUCCESSFULLY!")
    except AssertionError as e:
        print(f"\n[TEST FAILED] Assertion Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[TEST ERROR] Unexpected Exception: {e}")
        sys.exit(1)
