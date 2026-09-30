from PIL import Image

img = Image.open(r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media__1790750627203.png')
print("Image dims:", img.size)

# Let's cut the image into 10 vertical slices so each slice has ~15 rows
h = img.height
slice_h = h / 10

for i in range(10):
    box = (0, int(i * slice_h), img.width, int((i + 1) * slice_h))
    crop = img.crop(box)
    crop_scale = crop.resize((img.width * 8, crop.height * 8), Image.Resampling.NEAREST)
    crop_scale.save(f"slice_{i+1:02d}.png")

print("Saved 10 slices.")
