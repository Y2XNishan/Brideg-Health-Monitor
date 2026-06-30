import requests
import sys

BASE_URL = "http://localhost:8000"

def run_tests():
    print("=== STARTING AUTH & RBAC SECURITY TESTING ===")
    
    # 1. Test Invalid Login
    print("\n--- Test 1: Invalid Login ---")
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "wrong@nhai.gov.in", "password": "bad"})
    print("Status:", res.status_code)
    print("Response:", res.json())
    assert res.status_code == 401
    assert "error" in res.json()
    print("Success: Invalid login blocked as expected.")

    # 2. Test Admin Login
    print("\n--- Test 2: Admin Login ---")
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@nhai.gov.in", "password": "admin123"})
    print("Status:", res.status_code)
    assert res.status_code == 200
    admin_data = res.json()
    admin_token = admin_data["token"]
    print("Admin Name:", admin_data["user"]["name"])
    print("Admin Role:", admin_data["user"]["role"])
    print("Admin Token:", admin_token[:10] + "...")
    assert admin_data["user"]["role"] == "admin"
    print("Success: Admin logged in.")

    # 3. Test Engineer Login
    print("\n--- Test 3: Engineer Login ---")
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "engineer@nhai.gov.in", "password": "eng123"})
    print("Status:", res.status_code)
    assert res.status_code == 200
    eng_data = res.json()
    eng_token = eng_data["token"]
    print("Engineer Role:", eng_data["user"]["role"])
    assert eng_data["user"]["role"] == "engineer"
    print("Success: Engineer logged in.")

    # 4. Test Viewer Login
    print("\n--- Test 4: Viewer Login ---")
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "viewer@pwdassam.gov.in", "password": "view123"})
    print("Status:", res.status_code)
    assert res.status_code == 200
    view_data = res.json()
    view_token = view_data["token"]
    print("Viewer Role:", view_data["user"]["role"])
    assert view_data["user"]["role"] == "viewer"
    print("Success: Viewer logged in.")

    # 5. Test Profile Verification (/api/auth/me)
    print("\n--- Test 5: Profile Verification (/api/auth/me) ---")
    res = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    print("Status:", res.status_code)
    print("Name from token:", res.json()["name"])
    assert res.status_code == 200
    assert res.json()["role"] == "admin"
    print("Success: Profile verified.")

    # 6. Test User Management Access (/api/auth/users)
    print("\n--- Test 6: User Management RBAC Access ---")
    # Admin (Allowed)
    res = requests.get(f"{BASE_URL}/api/auth/users", headers={"Authorization": f"Bearer {admin_token}"})
    print("Admin Status:", res.status_code)
    assert res.status_code == 200
    print("Users found:", len(res.json()))
    
    # Engineer (Forbidden)
    res = requests.get(f"{BASE_URL}/api/auth/users", headers={"Authorization": f"Bearer {eng_token}"})
    print("Engineer Status:", res.status_code)
    assert res.status_code == 403
    
    # Viewer (Forbidden)
    res = requests.get(f"{BASE_URL}/api/auth/users", headers={"Authorization": f"Bearer {view_token}"})
    print("Viewer Status:", res.status_code)
    assert res.status_code == 403
    print("Success: User management access correctly restricted to Admins only.")

    # 7. Test Audit Log Access (/api/audit-log)
    print("\n--- Test 7: Audit Log RBAC Access ---")
    # Admin (Allowed)
    res = requests.get(f"{BASE_URL}/api/audit-log", headers={"Authorization": f"Bearer {admin_token}"})
    print("Admin Status:", res.status_code)
    assert res.status_code == 200
    print("Log Entries count:", len(res.json()))
    
    # Engineer (Allowed)
    res = requests.get(f"{BASE_URL}/api/audit-log", headers={"Authorization": f"Bearer {eng_token}"})
    print("Engineer Status:", res.status_code)
    assert res.status_code == 200
    
    # Viewer (Forbidden)
    res = requests.get(f"{BASE_URL}/api/audit-log", headers={"Authorization": f"Bearer {view_token}"})
    print("Viewer Status:", res.status_code)
    assert res.status_code == 403
    print("Success: Audit log access correctly restricted to Admin and Engineer roles only.")

    # 8. Test Bridge Activation Guards
    print("\n--- Test 8: Bridge Activation Guards ---")
    # Viewer (Forbidden)
    res = requests.post(f"{BASE_URL}/api/bridges/activate", json={"bridge_id": 4}, headers={"Authorization": f"Bearer {view_token}"})
    print("Viewer Activate Status:", res.status_code)
    assert res.status_code == 403

    # Engineer (Allowed)
    res = requests.post(f"{BASE_URL}/api/bridges/activate", json={"bridge_id": 4}, headers={"Authorization": f"Bearer {eng_token}"})
    print("Engineer Activate Status:", res.status_code)
    assert res.status_code == 200
    print("Success: Bridge activation guarded perfectly.")

    # 9. Test Federated Controls Guards
    print("\n--- Test 9: Federated Run Round Guards ---")
    # Engineer (Forbidden)
    res = requests.post(f"{BASE_URL}/api/federated/run-round", headers={"Authorization": f"Bearer {eng_token}"})
    print("Engineer Run-round Status:", res.status_code)
    assert res.status_code == 403

    # Admin (Allowed)
    res = requests.post(f"{BASE_URL}/api/federated/run-round", headers={"Authorization": f"Bearer {admin_token}"})
    print("Admin Run-round Status:", res.status_code)
    assert res.status_code == 200
    print("Success: Federated round control guarded perfectly.")

    # 10. Test Report Fallback Query Parameter Auth
    print("\n--- Test 10: PDF Report Auth & Fallback ---")
    # Anonymous (Unauthorized)
    res = requests.get(f"{BASE_URL}/api/report?bridge_id=1")
    print("Anonymous Report Status:", res.status_code)
    assert res.status_code == 401

    # Viewer (Header Auth Succeeded)
    res = requests.get(f"{BASE_URL}/api/report?bridge_id=1", headers={"Authorization": f"Bearer {view_token}"})
    print("Viewer Header Report Status:", res.status_code)
    assert res.status_code == 200
    assert res.headers.get("Content-Type") == "application/pdf"

    # Viewer (Query Param Fallback Auth Succeeded)
    res = requests.get(f"{BASE_URL}/api/report?bridge_id=1&token={view_token}")
    print("Viewer Query-Param Report Status:", res.status_code)
    assert res.status_code == 200
    assert res.headers.get("Content-Type") == "application/pdf"
    print("Success: PDF report endpoint properly secured with dual-channel auth.")

    # 11. Test Audit Log ledger size
    print("\n--- Test 11: Audit Logs Verification ---")
    res = requests.get(f"{BASE_URL}/api/audit-log", headers={"Authorization": f"Bearer {admin_token}"})
    logs = res.json()
    print("Recent logs summary:")
    for log in logs[:10]:
        print(f"- {log['timestamp']} | {log['user_email']} ({log['user_role']}) | {log['action']} -> {log['target']} | {log['status']}")
    
    print("\n=== ALL SECURITY VERIFICATION TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    try:
        run_tests()
    except AssertionError:
        print("\n❌ TEST SUITE ASSERTION FAILURE!")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ TEST SUITE RUNTIME FAILURE: {e}")
        sys.exit(1)
