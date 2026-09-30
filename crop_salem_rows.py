from PIL import Image

img = Image.open("region_crop_salem.png")
print("Salem crop size:", img.size)

# Let's crop into 19 equal height horizontal slices (1 region header + 18 municipalities)
h = img.height
row_h = h / 19

for i in range(19):
    y1 = int(i * row_h)
    y2 = int((i + 1) * row_h)
    row_crop = img.crop((0, y1, img.width, y2))
    row_crop_scale = row_crop.resize((img.width * 2, row_crop.height * 2), Image.Resampling.LANCZOS)
    row_crop_scale.save(f"salem_row_{i}.png")

print("Saved 19 rows for Salem.")
