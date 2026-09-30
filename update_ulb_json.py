import json

data = {
  "totalRegions": 7,
  "regions": [
    {
      "name": "Chengalpattu",
      "municipalityCount": 20,
      "municipalities": [
        "Chengalpattu",
        "Madhuranthagam",
        "Maraimalainagar",
        "Tiruvallur",
        "Ponnamallee",
        "Tiruthani",
        "Tiruverkadu",
        "Chidambaram",
        "Panruti",
        "Virudhachalam",
        "Nellikuppam",
        "Mangadu",
        "Kundrathur",
        "Ponneri",
        "Thirunindravur",
        "Thittakudi",
        "Vadalur",
        "Nandhivaram Guduvancheri",
        "Mamallapuram",
        "Sriperumbudur"
      ]
    },
    {
      "name": "Vellore",
      "municipalityCount": 22,
      "municipalities": [
        "Arakkonam",
        "Gudiyatham",
        "Tirupathur",
        "Arcot",
        "Ambur",
        "Ranipet",
        "Vaniyambadi",
        "Walajapet",
        "Jolarpet",
        "Melvisharam",
        "Pernampattu",
        "Arani",
        "Tiruvathipuram",
        "Vandavasi",
        "Villupuram",
        "Tindivanam",
        "Kallakurichi",
        "Sholinghur",
        "Kottakuppam",
        "Ulundurpettai",
        "Tirukkoyilur",
        "Polur"
      ]
    },
    {
      "name": "Salem",
      "municipalityCount": 18,
      "municipalities": [
        "Mettur",
        "Attur",
        "Idappadi",
        "Narasingapuram",
        "Tiruchengode",
        "Komarapalayam",
        "Rasipuram",
        "Pallipalayam",
        "Dharmapuri",
        "Krishnagiri",
        "Kulithalai",
        "Edanganasalai",
        "Pallapatti",
        "Pugalur",
        "Tharamangalam",
        "Harur",
        "Sangagiri",
        "Pennagaram"
      ]
    },
    {
      "name": "Thanjavur",
      "municipalityCount": 21,
      "municipalities": [
        "Pattukottai",
        "Mayiladuthurai",
        "Nagapattinam",
        "Sirkali",
        "Vedaranyam",
        "Mannargudi",
        "Tiruvarur",
        "Thiruthuraipoondi",
        "Koothanallur",
        "Aranthangi",
        "Thuraiyur",
        "Manaparai",
        "Thuvagudi",
        "Perambalur",
        "Jayankondam",
        "Ariyalur",
        "Adiramapattinam",
        "Musiri",
        "Lalgudi",
        "Thiruvaiyaru",
        "Ponnamaravathi"
      ]
    },
    {
      "name": "Madurai",
      "municipalityCount": 19,
      "municipalities": [
        "Thirumangalam",
        "Melur",
        "Usilampatti",
        "Theni Allinagaram",
        "Periyakulam",
        "Chinnamanur",
        "Cumbum",
        "Bodinayakanur",
        "Gudalur (Theni)",
        "Devakottai",
        "Sivagangai",
        "Ramanathapuram",
        "Paramakudi",
        "Keelakarai",
        "Rameswaram",
        "Kodaikanal",
        "Palani",
        "Oddanchatram",
        "Manamadurai"
      ]
    },
    {
      "name": "Tiruppur",
      "municipalityCount": 24,
      "municipalities": [
        "Bhavani",
        "Gobichettipalayam",
        "Sathyamangalam",
        "Punjai Puliampatti",
        "Pollachi",
        "Mettupalayam",
        "Valparai",
        "Udumalaipettai",
        "Dharapuram",
        "Palladam",
        "Vellakoil",
        "Kangeyam",
        "Udhagamandalam",
        "Coonoor",
        "Gudalur (Nilgiris)",
        "Nelliyalam",
        "Karumathampatti",
        "Karamadai",
        "Gudalur (Coimbatore)",
        "Madukkarai",
        "Thirumuruganpoondi",
        "Avinashi",
        "Perundurai",
        "Kotagiri"
      ]
    },
    {
      "name": "Tirunelveli",
      "municipalityCount": 22,
      "municipalities": [
        "Kadayanallur",
        "Sankarankoil",
        "Tenkasi",
        "Puliyangudi",
        "Sengottai",
        "Ambasamudram",
        "Vikramasingapuram",
        "Kovilpatti",
        "Kayalpattinam",
        "Colachel",
        "Kuzhithurai",
        "Padmanabhapuram",
        "Rajapalayam",
        "Aruppukottai",
        "Srivilliputhur",
        "Virudhunagar",
        "Sattur",
        "Surandai",
        "Kalakkadu",
        "Thiruchendur",
        "Kollencode",
        "Kaniyakumari"
      ]
    }
  ],
  "totalCorporations": 24,
  "corporations": [
    { "sNo": 1, "name": "Madurai", "contact": "Praba", "mobile": "6383564836" },
    { "sNo": 2, "name": "Coimbatore", "contact": "Ganesan", "mobile": "9445528977" },
    { "sNo": 3, "name": "Tiruchirapalli", "contact": "Shamsundar", "mobile": "9600835145" },
    { "sNo": 4, "name": "Tirunelveli", "contact": None, "mobile": "9488676576" },
    { "sNo": 5, "name": "Salem", "contact": "Ramesh", "mobile": "807296967" },
    { "sNo": 6, "name": "Tiruppur", "contact": "Mani", "mobile": "8610696115" },
    { "sNo": 7, "name": "Erode", "contact": "Harikumar", "mobile": "9894157583" },
    { "sNo": 8, "name": "Thoothukudi", "contact": "Maharaja", "mobile": "9894552057" },
    { "sNo": 9, "name": "Vellore", "contact": "Vinothkumar", "mobile": "7010961319" },
    { "sNo": 10, "name": "Thanjavur", "contact": "Sivanandham", "mobile": "9843456326" },
    { "sNo": 11, "name": "Dindigul", "contact": "Daisy", "mobile": "9843285884" },
    { "sNo": 12, "name": "Avadi", "contact": "Mohideen", "mobile": "9884087452" },
    { "sNo": 13, "name": "Hosur", "contact": "Ramya", "mobile": "8220541464" },
    { "sNo": 14, "name": "Nagercoil", "contact": "Devi", "mobile": "8248112285" },
    { "sNo": 15, "name": "Kancheepuram", "contact": "Kishore", "mobile": "7358978409" },
    { "sNo": 16, "name": "Tambaram", "contact": "Shyamala", "mobile": "9688198531" },
    { "sNo": 17, "name": "Cuddalore", "contact": "Sundaramoorthy", "mobile": "9042951629" },
    { "sNo": 18, "name": "Karur", "contact": "Chikkannan", "mobile": "9629111498" },
    { "sNo": 19, "name": "Kumbakonam", "contact": "Edwin", "mobile": "9751630859" },
    { "sNo": 20, "name": "Sivakasi", "contact": "Suriyakumar", "mobile": "7092469088" },
    { "sNo": 21, "name": "Tiruvannamalai", "contact": None, "mobile": "8056886679" },
    { "sNo": 22, "name": "Namakkal", "contact": "Thirumoorthi", "mobile": "9443433140" },
    { "sNo": 23, "name": "Pudukottai", "contact": "Baskar", "mobile": "9943468755" },
    { "sNo": 24, "name": "Karaikudi", "contact": "Kalaiselvi", "mobile": "6385293087" }
  ]
}

total_muni = sum(r['municipalityCount'] for r in data['regions'])
total_corp = len(data['corporations'])
total_ulb = total_muni + total_corp

print(f"Total Regions: {len(data['regions'])}")
print(f"Total Municipalities: {total_muni}")
print(f"Total Corporations: {total_corp}")
print(f"TOTAL URBAN LOCAL BODIES: {total_ulb}")

with open(r'C:\Users\Admin\.gemini\antigravity\scratch\mobile-compliance-system\backend\src\database\seeds\ulb-structured.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Successfully updated ulb-structured.json!")
