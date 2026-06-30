import sys
from pathlib import Path
import traceback

# Add project root and backend to python path
sys.path.append(str(Path(__file__).resolve().parents[1]))
sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

try:
    from backend.main import agent_inspect_pdf, AgentInspectPDFRequest
    print("Imports successful.")
except Exception as e:
    print("Failed to import main.py components:")
    traceback.print_exc()
    sys.exit(1)

# Mock data matching the test result we got earlier
mock_payload = {
    "bridge_id": 1,
    "bridge_name": "Brahmaputra Main Bridge",
    "severity": "NORMAL",
    "health_score": 98.4,
    "alert_level": "NORMAL",
    "sensor_summary": {
      "vibration": 0.3615,
      "strain": 149.2363,
      "crack_gap": 0.2148,
      "water_level": 2.1918,
      "health_score": 98.4,
      "alert_level": "NORMAL"
    },
    "issues_detected": [
      "WARNING: Crack gap 0.215mm requires monitoring"
    ],
    "recommendations": [
      "Schedule structural assessment within 30 days"
    ],
    "full_report": "# Test Report\n\n### 1. EXECUTIVE SUMMARY\nThis is a test executive summary.\n\n## 2. DETAIL FINDINGS\nThis is detailed findings."
}

try:
    req = AgentInspectPDFRequest(**mock_payload)
    # Mock FastAPI Depends user object
    class MockUser:
        def __getitem__(self, key):
            if key == "email":
                return "admin@nhai.gov.in"
            if key == "role":
                return "admin"
            return None
            
    user = MockUser()
    print("Calling agent_inspect_pdf...")
    response = agent_inspect_pdf(req, user)
    print("Call completed successfully!")
    print("Response type:", type(response))
except Exception as e:
    print("\n--- ERROR DETECTED ---")
    traceback.print_exc()
