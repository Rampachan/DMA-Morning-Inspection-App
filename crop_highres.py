from PIL import Image

img = Image.open(r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media_1790236405629.jpg')
w, h = img.size
print("High res img size:", w, h)

# S.No 43 to 60 is Salem region. Let's slice the image into 7 regions and save each region!
# Region headers are: Chengalpattu, Vellore, Salem, Thanjavur, Madurai, Tiruppur, Tirunelveli

# Let's save 7 region crops
# 1. Chengalpattu (1-20) ~ y: 0 to 145
# 2. Vellore (21-42) ~ y: 145 to 300
# 3. Salem (43-60) ~ y: 300 to 425
# 4. Thanjavur (61-81) ~ y: 425 to 570
# 5. Madurai (82-100) ~ y: 570 to 700
# 6. Tiruppur (101-124) ~ y: 700 to 860
# 7. Tirunelveli (125-146) ~ y: 860 to 1024

regions_crop = [
    ("chengalpattu", 0, 150),
    ("vellore", 145, 305),
    ("salem", 300, 430),
    ("thanjavur", 425, 575),
    ("madurai", 570, 705),
    ("tiruppur", 700, 865),
    ("tirunelveli", 860, 1024)
]

for name, y1, y2 in regions_crop:
    crop = img.crop((0, y1, w, y2))
    crop.save(f"region_crop_{name}.png")
    print(f"Saved region_crop_{name}.png")
