"""
Fetch REAL agricultural crop disease & silage leaf images from PlantVillage GitHub repository.
Categorizes images strictly into safe, caution, and unsafe silage quality classes:
- SAFE: Healthy crop leaves (Corn healthy, Potato healthy, Tomato healthy, Apple healthy)
- CAUTION: Early blight, leaf spot, rust (Corn rust, Potato early blight, Tomato early blight, Pepper bacterial spot)
- UNSAFE: Severe mold rot, late blight, black rot (Tomato Leaf Mold, Potato late blight, Tomato late blight, Apple black rot, Corn leaf blight)
"""
import os, sys, json, urllib.request, concurrent.futures
from pathlib import Path
from PIL import Image

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

PROCESSED_VISION = "data/processed/vision"

# Real PlantVillage category mappings
MAPPINGS = {
    "safe": [
        "Corn_(maize)___healthy",
        "Potato___healthy",
        "Tomato___healthy",
        "Apple___healthy",
        "Peach___healthy",
        "Pepper,_bell___healthy"
    ],
    "caution": [
        "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
        "Corn_(maize)___Common_rust_",
        "Potato___Early_blight",
        "Tomato___Early_blight",
        "Pepper,_bell___Bacterial_spot",
        "Tomato___Septoria_leaf_spot"
    ],
    "unsafe": [
        "Corn_(maize)___Northern_Leaf_Blight",
        "Potato___Late_blight",
        "Tomato___Late_blight",
        "Tomato___Leaf_Mold",
        "Apple___Black_rot",
        "Grape___Black_rot"
    ]
}

def get_directory_files(dir_name):
    """Fetches list of file metadata for a PlantVillage directory via GitHub API."""
    encoded_dir = urllib.parse.quote(dir_name)
    api_url = f"https://api.github.com/repos/spMohanty/PlantVillage-Dataset/contents/raw/color/{encoded_dir}"
    req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            return [item['download_url'] for item in data if item['name'].lower().endswith(('.jpg', '.jpeg', '.png'))]
    except Exception as e:
        print(f"Notice ({dir_name}): {e}", flush=True)
        return []

def download_image(url, save_path):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read()
            with open(save_path, "wb") as f:
                f.write(content)
        return True
    except Exception:
        return False

def main():
    print("Purging existing vision datasets to assemble 100% REAL agricultural crop dataset...", flush=True)
    for cat in ["safe", "caution", "unsafe"]:
        cat_dir = os.path.join(PROCESSED_VISION, cat)
        if os.path.exists(cat_dir):
            import shutil
            shutil.rmtree(cat_dir)
        os.makedirs(cat_dir, exist_ok=True)

    total_downloaded = 0

    for category, dir_list in MAPPINGS.items():
        print(f"\nProcessing category '{category.upper()}' from PlantVillage...", flush=True)
        cat_dir = os.path.join(PROCESSED_VISION, category)
        urls_to_download = []
        
        for dir_name in dir_list:
            urls = get_directory_files(dir_name)
            # Take up to 80 real images per folder to ensure balanced dataset
            urls_to_download.extend(urls[:80])
            
        print(f"Downloading {len(urls_to_download)} REAL images for '{category.upper()}'...", flush=True)
        
        # Fast multi-threaded parallel download (16 threads)
        download_tasks = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
            for idx, url in enumerate(urls_to_download):
                save_path = os.path.join(cat_dir, f"pv_{category}_{idx:04d}.jpg")
                download_tasks.append(executor.submit(download_image, url, save_path))
                
            results = [t.result() for t in concurrent.futures.as_completed(download_tasks)]
            success_count = sum(results)
            total_downloaded += success_count
            print(f"[OK] Downloaded {success_count} REAL images into {category}/", flush=True)

    print("\n=== FINAL REAL CROP & SILAGE VISION DATASET BREAKDOWN ===", flush=True)
    counts = {}
    for cat in ["safe", "caution", "unsafe"]:
        cat_dir = os.path.join(PROCESSED_VISION, cat)
        c = len(os.listdir(cat_dir))
        counts[cat] = c
        print(f"  {cat.upper()}: {c} REAL images", flush=True)
    print(f"  TOTAL REAL IMAGES: {sum(counts.values())}", flush=True)
    print("[OK] Real dataset preparation complete!", flush=True)

if __name__ == "__main__":
    main()
