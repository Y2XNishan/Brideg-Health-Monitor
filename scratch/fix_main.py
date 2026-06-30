import os

filepath = 'backend/main.py'
content = open(filepath, 'r', encoding='utf-8').read()

old_part = """        if grade in ["A", "B"]:
            alert_count = 0
            grade = live_sim_3["health_grade"]
            status = live_sim_3["health_status"]
            alert_count = len(alerts(bridge_id=3))
        else:
            # Seeded deterministic pseudo-random parameters based on bridge ID
            val = (bid * 37 + 101) % 1000
            score = round(45.0 + (val / 1000.0) * (98.0 - 45.0), 1)
            
            if score >= 85:
                grade, status = "A", "Excellent"
                alert_count = 0
            elif score >= 70:
                grade, status = "B", "Good"
                alert_count = 0
            elif score >= 55:
                grade, status = "C", "Fair"
                alert_count = 0
            elif score >= 40:
                grade, status = "D", "Poor"
                alert_count = int(5 + (val % 8))
            else:
                grade, status = "F", "Critical"
                alert_count = int(12 + (val % 9))"""

new_part = """        if grade in ["A", "B"]:
            alert_count = 0
        elif grade == "C":
            alert_count = int(2 + (bid % 3))
        elif grade == "D":
            alert_count = int(5 + (bid % 4))
        else:
            alert_count = int(10 + (bid % 6))"""

# Normalize line endings for comparison
old_part_lf = old_part.replace('\r\n', '\n')
old_part_crlf = old_part.replace('\r\n', '\n').replace('\n', '\r\n')
new_part_lf = new_part.replace('\r\n', '\n')
new_part_crlf = new_part.replace('\r\n', '\n').replace('\n', '\r\n')

if old_part_lf in content:
    content = content.replace(old_part_lf, new_part_lf)
    print("Found and replaced LF line endings!")
elif old_part_crlf in content:
    content = content.replace(old_part_crlf, new_part_crlf)
    print("Found and replaced CRLF line endings!")
else:
    print("Could not find the exact pattern. Printing content snippet around line 1345:")
    lines = content.splitlines()
    for idx in range(min(len(lines), 1335), min(len(lines), 1380)):
        print(f"{idx+1}: {lines[idx]}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished script execution.")
