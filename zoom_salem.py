from PIL import Image

img = Image.open(r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media__1790750627203.png')

# Height region for Salem (lines 43-60 out of 146 + headers)
# Total lines including headers = 146 + 7 region headers = 153 headers/rows approx
# 43 to 60 is roughly 43/153 * 1024 to 68/153 * 1024
y1 = int(1024 * (40 / 155))
y2 = int(1024 * (70 / 155))

crop = img.crop((0, y1, img.width, y2))
crop_large = crop.resize((img.width * 10, crop.height * 10), Image.Resampling.NEAREST)
crop_large.save("salem_region_zoom.png")
print("Saved salem_region_zoom.png", crop.size, crop_large.size)
