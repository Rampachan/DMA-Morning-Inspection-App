from PIL import Image

img = Image.open(r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media_1790236405629.jpg').convert('L')
w, h = img.size

# Let's crop Salem region: from 43 to 60 (18 rows + 1 header = 19 rows)
# The image height is 1024.
# Total rows in image ~ 153.
# Row height ~ 1024 / 153 = 6.69 pixels per row!

# Salem header starts around y = 290
# 18 rows * 6.69 = ~120px height
y_start = 285
y_end = 415
salem_crop = img.crop((0, y_start, w, y_end))
salem_crop.save("salem_region_clean.png")

# Let's crop into 19 rows of height ~6.8px each
row_h = (y_end - y_start) / 19.0
for i in range(19):
    r_y1 = int(y_start + i * row_h)
    r_y2 = int(y_start + (i + 1) * row_h)
    r_img = img.crop((0, r_y1, w, r_y2))
    r_scale = r_img.resize((w * 3, (r_y2 - r_y1) * 4), Image.Resampling.LANCZOS)
    r_scale.save(f"salem_clean_row_{i}.png")

print("Saved clean Salem rows 0..18")
