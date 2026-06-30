import requests

BASE_URL = "http://localhost:8000"

def test_login(email, password, expected_role):
    print(f"Testing login for {email} ...")
    try:
        res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
        if res.status_code == 200:
            data = res.json()
            user = data.get("user", {})
            token = data.get("token")
            print(f"  [SUCCESS] Token: {token[:8]}... | User: {user.get('name')} | Role: {user.get('role')} (Expected: {expected_role})")
            return user.get("role") == expected_role
        else:
            print(f"  [FAILED] Status code: {res.status_code} | Body: {res.text}")
            return False
    except Exception as e:
        print(f"  [CONNECTION ERROR] {e}")
        return False

# 1. Google (Admin)
g_ok = test_login("admin@nhai.gov.in", "demo123", "admin")

# 2. GitHub (Engineer)
gh_ok = test_login("engineer@bridgeiq.in", "demo123", "engineer")

# 3. NHAI SSO (Viewer)
nhai_ok = test_login("viewer@nhai.gov.in", "demo123", "viewer")

if g_ok and gh_ok and nhai_ok:
    print("\nALL Demo OAuth accounts successfully authenticated in backend!")
else:
    print("\nSome tests failed. Please check the backend log or configuration.")
