from PIL import Image

img = Image.open(r'C:\Users\Admin\.gemini\antigravity\brain\af73e8b4-d3bc-4e79-9888-14f789041ec1\.user_uploaded\media_1790236405629.jpg')
w, h = img.size

# Let's crop into 7 Region boxes
# In Image 1, let's locate exact Y coordinates for each region title
# The region titles are in blue background or bold text
# Let's write a script to crop regions with exact boundaries

regions = [
    ("Chengalpattu", 20, ["Chengalpattu", "Maduranthagam", "Maraimalainagar", "Thiruvallur", "Poonamallee", "Tiruttani", "Thiruverkadu", "Chidambaram", "Panruti", "Virudhachalam", "Nellikuppam", "Mangadu", "Kundrathur", "Ponneri", "Thirunindravur", "Thittakudi", "Vadalur", "Nandhivaram Guduvancheri", "Mamallapuram", "Sriperumbudur"]),
    ("Vellore", 22, ["Arakkonam", "Gudiyatham", "Tirupathur", "Arcot", "Ambur", "Ranipet", "Vaniyambadi", "Walajapet", "Jolarpet", "Melvisharam", "Pernampattu", "Arani", "Tiruvathipuram", "Vandavasi", "Villupuram", "Tindivanam", "Kallakurichi", "Sholinghur", "Kottakuppam", "Ulundurpettai", "Tirukkoyilur", "Polur"]),
    ("Salem", 18, ["Mettur", "Attur", "Idappadi", "Narasingapuram", "Tiruchengode", "Komarapalayam", "Rasipuram", "Pallipalayam", "Dharmapuri", "Krishnagiri", "Kulithalai", "Edanganasalai", "Pallapatti", "Pugalur", "Tharamangalam", "Harur", "Sangagiri", "Pennagaram"]), # Let's check!
]
