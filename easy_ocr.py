import sys
from PIL import Image

try:
    import easyocr
    reader = easyocr.Reader(['en'])
    res1 = reader.readtext(r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media__1790750627203.png', detail=0)
    print("--- EasyOCR Image 1 ---")
    for item in res1:
        print(item)
    res2 = reader.readtext(r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media__1790750645937.png', detail=0)
    print("--- EasyOCR Image 2 ---")
    for item in res2:
        print(item)
except Exception as e:
    print("EasyOCR error:", e)
