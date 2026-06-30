import httpx

base_url = "http://localhost:8000"

def test_pdf_generation():
    print("Logging in...")
    login_res = httpx.post(f"{base_url}/api/auth/login", json={
        "email": "admin@nhai.gov.in",
        "password": "admin123"
    })
    
    if login_res.status_code != 200:
        print("Login failed")
        return
        
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. First trigger the inspection agent
    print("Running inspection agent first...")
    inspect_res = httpx.post(
        f"{base_url}/api/agent/inspect",
        json={"bridge_id": 1, "bridge_name": "Brahmaputra Main Bridge"},
        headers=headers,
        timeout=30.0
    )
    
    if inspect_res.status_code != 200:
        print("Inspection failed")
        return
        
    inspection_data = inspect_res.json()
    print("Inspection succeeded. Sending payload to PDF generator...")
    
    # 2. Trigger PDF generator
    pdf_res = httpx.post(
        f"{base_url}/api/agent/inspect/pdf",
        json=inspection_data,
        headers=headers,
        timeout=30.0
    )
    
    print(f"PDF Endpoint Status Code: {pdf_res.status_code}")
    if pdf_res.status_code == 200:
        content_type = pdf_res.headers.get("Content-Type")
        print(f"Response Content-Type: {content_type}")
        
        pdf_bytes = pdf_res.content
        print(f"Downloaded PDF size: {len(pdf_bytes)} bytes")
        
        # Save to local file
        out_path = "scratch/test_report.pdf"
        with open(out_path, "wb") as f:
            f.write(pdf_bytes)
        print(f"Saved PDF to {out_path}")
    else:
        print(f"PDF Generation failed: {pdf_res.text}")

if __name__ == "__main__":
    test_pdf_generation()
