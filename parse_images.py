import os
from PIL import Image

img1_path = r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media__1790750627203.png'
img2_path = r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media__1790750645937.png'

img1 = Image.open(img1_path)
img2 = Image.open(img2_path)

print('Img 1:', img1.size, img1.format, img1.mode)
print('Img 2:', img2.size, img2.format, img2.mode)

# Let's crop img1 into vertical sections and attempt pytesseract if available, or save slices for inspection
try:
    import pytesseract
    print("--- OCR Image 1 ---")
    print(pytesseract.image_to_string(img1))
    print("--- OCR Image 2 ---")
    print(pytesseract.image_to_string(img2))
except Exception as e:
    print("Tesseract not available:", e)
