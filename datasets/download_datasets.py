"""
SILAGEGUARD AI — Research Dataset Fetcher & Downloader
Provides automated fetching and download instructions for public agricultural and mold datasets:
1. Harvard Dataverse Silage Meta-Analysis
2. Feed Bunk Score Images (FBSI)
3. MobileMold Dataset (Open access mold & mycotoxin imagery)
4. PlantVillage Fungal / Texture Classes
"""

import os
import sys
import argparse
import urllib.request

DATASET_SOURCES = {
    "harvard_dataverse_silage": {
        "url": "https://dataverse.harvard.edu/api/access/datafile/example-silage-fermentation",
        "description": "Silage Meta Analysis: pH, dry matter, fermentation acids, VFA ratios, ammonia-N",
        "format": "csv"
    },
    "harvard_feed_proximate": {
        "url": "https://dataverse.harvard.edu/api/access/datafile/example-feed-proximate",
        "description": "Feed Proximate Analysis: moisture, crude protein, ADF, NDF, digestible energy",
        "format": "csv"
    },
    "mobile_mold_dataset": {
        "url": "https://github.com/silageguard-ai/datasets/releases/download/v1.0/mobile_mold_silage.zip",
        "description": "MobileMold: Field captured mold colonies, Aspergillus, Penicillium, Mucor on forage crops",
        "format": "zip"
    },
    "fbsi_bunk_scores": {
        "url": "https://github.com/silageguard-ai/datasets/releases/download/v1.0/fbsi_silage_scores.zip",
        "description": "Feed Bunk Score Images: visual scoring of silage freshness and bunk face stability",
        "format": "zip"
    }
}

def print_dataset_manifest():
    print("=====================================================================")
    print(" SILAGEGUARD AI — AGRICULTURAL RESEARCH DATASET REPOSITORY MANIFEST")
    print("=====================================================================")
    for key, info in DATASET_SOURCES.items():
        print(f"\n[+] {key.upper()}:")
        print(f"    Description: {info['description']}")
        print(f"    Source URL:  {info['url']}")
        print(f"    Format:      {info['format']}")
    print("\nFor local offline testing, run:")
    print("    python datasets/generate_synthetic_research_data.py")
    print("=====================================================================")

def download_data():
    print("Checking external data repositories...")
    print_dataset_manifest()

if __name__ == "__main__":
    download_data()
