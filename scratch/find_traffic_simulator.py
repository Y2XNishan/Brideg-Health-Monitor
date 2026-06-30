with open("backend/main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

search_terms = ["thread", "threading", "startup", "on_event", "loop", "interval", "background"]
for i, line in enumerate(lines):
    line_lower = line.lower()
    for term in search_terms:
        if term in line_lower:
            print(f"{i+1}: {line.strip()}")
            break
