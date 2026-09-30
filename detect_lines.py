import numpy as np
from PIL import Image

img = Image.open(r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media_1790236405629.jpg').convert('L')
arr = np.array(img)

# Detect horizontal dark lines (table borders)
row_means = np.mean(arr, axis=1)
# Find horizontal lines where mean brightness is low (dark grid lines)
lines = np.where(row_means < 200)[0]
print("Total rows:", len(arr))

# Let's crop Salem region by slicing between y=270 and y=430 and finding lines
salem_img = img.crop((0, 270, img.width, 430))
salem_arr = np.array(salem_img)
s_means = np.mean(salem_arr, axis=1)

import matplotlib.pyplot as plt
# Let's save a plot or print y values where dark lines occur
line_y = []
for y in range(1, len(s_means)-1):
    if s_means[y] < 210 and s_means[y] < s_means[y-1] and s_means[y] <= s_means[y+1]:
        line_y.append(y)

print("Line Ys in Salem region:", line_y)

for idx in range(len(line_y)-1):
    y_start = line_y[idx]
    y_end = line_y[idx+1]
    if y_end - y_start > 3: # row height > 3
        r_crop = salem_img.crop((0, y_start, salem_img.width, y_end))
        r_crop_large = r_crop.resize((r_crop.width * 3, r_crop.height * 3), Image.Resampling.LANCZOS)
        r_crop_large.save(f"salem_grid_row_{idx+1}.png")

print("Grid rows saved!")
