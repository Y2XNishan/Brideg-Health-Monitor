with open('frontend/src/pages/AIIntelligenceCenter.jsx', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f):
        if 'predictMap' in line or 'alertsMap' in line:
            print(f"Line {idx+1}: {line.strip().encode('ascii', 'replace').decode('ascii')}")
