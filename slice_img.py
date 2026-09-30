from PIL import Image

img = Image.open(r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media__1790750627203.png')
w, h = img.size
print(f"Image 1 width: {w}, height: {h}")

# Let's crop into 4 vertical slices from top to bottom and scale them up
h_chunk = h // 4
for i in range(4):
    box = (0, i * h_chunk, w, (i + 1) * h_chunk if i < 3 else h)
    crop = img.crop(box)
    crop_large = crop.resize((w * 5, crop.height * 5), Image.Resampling.LANCZOS)
    crop_large.save(f"crop_img1_part{i+1}.png")

print("Saved crop_img1_part1..4.png")
