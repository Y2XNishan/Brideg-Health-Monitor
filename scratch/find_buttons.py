import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("c:/Users/KIIT0001/OneDrive/Desktop/bridge-monitor/backend/main.py", 'r', encoding='utf-8') as f:
    lines = f.readlines()

def print_around(pattern):
    print(f"=== Searching for: {pattern} ===")
    for idx, line in enumerate(lines):
        if pattern in line:
            start = max(0, idx - 2)
            end = min(len(lines), idx + 8)
            for i in range(start, end):
                print(f"{i+1}: {lines[i].strip()}")

print_around("def activate_bridge")
print_around("def deactivate_bridge")
print_around("def get_report")
print_around("def run_federated_round")
print_around("def reset_federated")
