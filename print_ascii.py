import sys
from PIL import Image

def ascii_art(img_path, width=100):
    img = Image.open(img_path).convert('L')
    img = img.point(lambda p: 255 if p > 160 else 0)
    aspect = img.height / img.width
    height = max(1, int(width * aspect * 0.6))
    img = img.resize((width, height), Image.Resampling.NEAREST)
    pixels = list(img.getdata())
    chars = ["#", " "]
    out = []
    for i, p in enumerate(pixels):
        out.append(chars[0] if p == 0 else chars[1])
        if (i + 1) % width == 0:
            out.append("\n")
    return "".join(out)

for r in range(15, 19):
    print(f"=== ROW {r} ===")
    print(ascii_art(f"salem_row_{r}.png", width=100))
