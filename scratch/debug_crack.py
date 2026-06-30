import sys
import os
from PIL import Image
import io

# Add backend and parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

try:
    from backend.crack_detection import analyze_crack_image
    print("Successfully imported analyze_crack_image")
except Exception as e:
    print(f"Import error: {e}")
    sys.exit(1)

# Generate a mock image bytes
img = Image.new("RGB", (200, 200), color="white")
buffered = io.BytesIO()
img.save(buffered, format="JPEG")
image_bytes = buffered.getvalue()

print("Running analyze_crack_image with mock image...")
try:
    report = analyze_crack_image(image_bytes, 1, "Brahmaputra Main Bridge")
    print("SUCCESS!")
    print(f"Report: {report}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
