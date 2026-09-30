from PIL import Image
import os

files = [
    r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media_1788957938767.jpg',
    r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media_1788963671215.png',
    r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media_1790236405629.jpg',
    r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media__1790750627203.png'
]

for f in files:
    if os.path.exists(f):
        img = Image.open(f)
        print(f, img.size)
