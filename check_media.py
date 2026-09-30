import os
from PIL import Image

media_dirs = [
    r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded',
    r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.tempmediaStorage'
]

for d in media_dirs:
    if not os.path.exists(d):
        continue
    print("=== Directory:", d)
    for fname in os.listdir(d):
        fpath = os.path.join(d, fname)
        if os.path.isfile(fpath):
            try:
                img = Image.open(fpath)
                print(f"{fname}: {img.size}, {img.format}")
            except Exception as e:
                print(f"{fname}: not an image ({os.path.getsize(fpath)} bytes)")
