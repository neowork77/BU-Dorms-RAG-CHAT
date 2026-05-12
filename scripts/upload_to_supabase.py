import pandas as pd
import numpy as np
import faiss
import pickle
from supabase import create_client, Client
import math
import os
import re
import urllib.parse
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# 1. โหลด .env.local (ปรับ path ตามโครงสร้างโปรเจกต์ของคุณ)
# ---------------------------------------------------------------------------
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local')
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------------------------------------------------------
# 2. กำหนด path ไฟล์ทั้ง 3 (วางไว้ในโฟลเดอร์เดียวกับ script นี้)
# ---------------------------------------------------------------------------
SCRIPT_DIR       = os.path.dirname(os.path.abspath(__file__))
CSV_PATH         = os.path.join(SCRIPT_DIR, "dorms_final_delivery.csv")
FAISS_PATH       = os.path.join(SCRIPT_DIR, "dorms_index.faiss")
METADATA_PATH    = os.path.join(SCRIPT_DIR, "dorms_metadata.pkl")

# ---------------------------------------------------------------------------
# 3. ค่าคงที่และฟังก์ชันช่วย
# ---------------------------------------------------------------------------
BU_LAT = 14.039417
BU_LNG = 100.611633


def haversine_distance(lat1, lon1, lat2, lon2):
    try:
        s_lat = str(lat2).strip().lower()
        s_lon = str(lon2).strip().lower()
        if s_lat in ['', 'nan', 'none', '-'] or s_lon in ['', 'nan', 'none', '-']:
            return None
        R = 6371.0
        dlat = math.radians(float(s_lat) - float(lat1))
        dlon = math.radians(float(s_lon) - float(lon1))
        a = (math.sin(dlat / 2) ** 2
             + math.cos(math.radians(float(lat1)))
             * math.cos(math.radians(float(s_lat)))
             * math.sin(dlon / 2) ** 2)
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    except Exception:
        return None


def fix_url(url: str) -> str:
    if not isinstance(url, str):
        return url
    url = re.sub(r'[\u200b\u200c\u200d\ufeff]', '', url)
    url = re.sub(r'[\U0001D400-\U0001D7FF]', '', url)
    parsed = urllib.parse.urlparse(url)
    fixed_path = urllib.parse.quote(parsed.path, safe='/-_.~%')
    return urllib.parse.urlunparse(parsed._replace(path=fixed_path))


def extract_price(content):
    if pd.isna(content):
        return None
    m = re.search(r'([\d,]+)', str(content))
    return int(m.group(1).replace(",", "")) if m else None


# ---------------------------------------------------------------------------
# 4. ฟังก์ชันหลัก
# ---------------------------------------------------------------------------
def process_and_upload():
    # --- โหลดข้อมูล ---
    print("📦 กำลังโหลดไฟล์ข้อมูล...")

    # ลองโหลด metadata จาก pkl ก่อน ถ้าไม่มีให้ fallback ไป CSV
    if os.path.exists(METADATA_PATH):
        print(f"  ✔ อ่าน metadata จาก {METADATA_PATH}")
        df = pd.read_pickle(METADATA_PATH)
    elif os.path.exists(CSV_PATH):
        print(f"  ✔ ไม่พบ .pkl — อ่าน metadata จาก {CSV_PATH}")
        df = pd.read_csv(CSV_PATH)
    else:
        raise FileNotFoundError(f"ไม่พบทั้ง {METADATA_PATH} และ {CSV_PATH}")

    if not os.path.exists(FAISS_PATH):
        raise FileNotFoundError(f"ไม่พบ FAISS index: {FAISS_PATH}")

    print(f"  ✔ อ่าน FAISS index จาก {FAISS_PATH}")
    index = faiss.read_index(FAISS_PATH)

    # ตรวจสอบความสอดคล้องกัน
    if len(df) != index.ntotal:
        raise ValueError(
            f"จำนวน row ใน metadata ({len(df)}) ≠ จำนวน vector ใน FAISS ({index.ntotal})"
        )

    print(f"✅ โหลดข้อมูลสำเร็จ: {len(df)} รายการ | FAISS dim={index.d}")

    # --- ดึง vectors ทั้งหมด ---
    print("🔢 กำลังดึง vectors จาก FAISS...")
    vectors = [index.reconstruct(i).tolist() for i in range(index.ntotal)]

    # --- เตรียมข้อมูลและอัปโหลด ---
    print(f"🚀 กำลังอัปโหลดไปยัง Supabase (batch=50)...")
    batch_size = 50
    data_to_upload = []

    for idx_row, row in df.iterrows():
        # ราคา
        price_val = extract_price(row.get("price"))

        # ชื่อ + ตึก/ชั้น (ถ้ามี)
        extracted_name = str(row.get("name", "")).strip()

        # รายละเอียด
        detail_str = str(row.get("details", "")).strip()

        # ระยะทาง
        lat = row.get("lat", row.get("latitude", ""))
        lng = row.get("lng", row.get("longitude", ""))
        dist_km = haversine_distance(BU_LAT, BU_LNG, lat, lng)

        # รูปภาพ
        imgs = {}
        for col in ["img1", "img2", "img3", "img4"]:
            val = str(row.get(col, "")).strip()
            imgs[col] = val if val and val.lower() not in ["nan", "none", "-", ""] else ""

        # URL
        url = fix_url(str(row.get("url", "-")).strip())

        data_to_upload.append({
            "name":        extracted_name,
            "price":       price_val,
            "details":     detail_str,
            "url":         url,
            "img1":        imgs["img1"],
            "img2":        imgs["img2"],
            "img3":        imgs["img3"],
            "img4":        imgs["img4"],
            "distance_km": dist_km,
            "embedding":   vectors[idx_row],   # ← ใช้ integer index ของ FAISS ให้ตรงกับ row
        })

        if len(data_to_upload) == batch_size:
            supabase.table("dorms").insert(data_to_upload).execute()
            print(f"  อัปโหลดแล้ว {idx_row + 1}/{len(df)} รายการ...")
            data_to_upload = []

    # ส่งเศษที่เหลือ
    if data_to_upload:
        supabase.table("dorms").insert(data_to_upload).execute()
        print(f"  อัปโหลดรายการสุดท้ายเสร็จสิ้น")

    print(f"\n✅ อัปโหลดครบ {len(df)} รายการเรียบร้อย!")


if __name__ == "__main__":
    process_and_upload()