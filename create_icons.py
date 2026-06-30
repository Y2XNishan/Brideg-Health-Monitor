from PIL import Image, ImageDraw, ImageFont
import os

icons_dir = r'c:\Users\KIIT0001\OneDrive\Desktop\bridge-monitor\frontend\public\icons'
os.makedirs(icons_dir, exist_ok=True)

for size in [192, 512]:
    img = Image.new('RGB', (size, size), '#0EA5E9')
    draw = ImageDraw.Draw(img)
    text = 'BQ'
    font_size = size // 3
    try:
        font = ImageFont.truetype('arial.ttf', font_size)
    except:
        font = ImageFont.load_default()
        
    bbox = draw.textbbox((0,0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw.text(((size-w)//2, (size-h)//2), text, fill='white', font=font)
    
    img.save(os.path.join(icons_dir, f'icon-{size}.png'))
    print(f'Created icon-{size}.png')
