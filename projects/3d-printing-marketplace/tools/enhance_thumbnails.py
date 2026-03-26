"""
Batch AI photo enhancer for PrintPal catalog.

For each model, takes the Printables thumbnail and uses FAL.ai FLUX.1 Kontext
to transform it into a professional studio product photo. Results are uploaded
to Supabase Storage and the enhanced_thumbnail column is updated.

Usage:
  python enhance_thumbnails.py             # process all pending models
  python enhance_thumbnails.py --limit 5   # test with 5 models
  python enhance_thumbnails.py --id 3161   # process single model by ID
  python enhance_thumbnails.py --dry-run   # show what would be processed
"""

import argparse
import io
import os
import sqlite3
import sys
import time
import requests
import fal_client
from PIL import Image
from supabase import create_client

# ── Config ────────────────────────────────────────────────────────────────────

FAL_KEY = os.environ["FAL_KEY"]
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://nxlgdzmtatqbdcumnalo.supabase.co")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
DB_PATH = "catalog.db"
BUCKET = "model-images"

PROMPT = (
    "Professional studio product photography of this 3D printed object. "
    "Render the object in a uniform light grey (#CCCCCC), preserving every detail of its exact shape and geometry. "
    "Pure white background, soft diffuse studio lighting from above, sharp focus, high resolution. "
    "Remove background clutter, hands, and tables. "
    "Do not change the shape or structure of the object in any way."
)

os.environ["FAL_KEY"] = FAL_KEY

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_models(db: sqlite3.Connection, limit: int | None, model_id: str | None):
    cur = db.cursor()
    if model_id:
        cur.execute("SELECT id, name, thumbnail FROM models WHERE id = ?", (model_id,))
    else:
        cur.execute(
            "SELECT id, name, thumbnail FROM models WHERE thumbnail IS NOT NULL ORDER BY likes DESC"
            + (f" LIMIT {limit}" if limit else "")
        )
    return cur.fetchall()


def already_enhanced(supabase, model_id: str) -> bool:
    res = supabase.table("models").select("enhanced_thumbnail").eq("id", model_id).single().execute()
    return bool(res.data and res.data.get("enhanced_thumbnail"))


def upload_to_supabase(supabase, model_id: str, image_bytes: bytes) -> str:
    """Upload JPEG bytes to Supabase Storage. Returns public URL."""
    filename = f"{model_id}.png"
    supabase.storage.from_(BUCKET).upload(
        path=filename,
        file=image_bytes,
        file_options={"content-type": "image/png", "upsert": "true"},
    )
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{filename}"


def enhance_image(thumbnail_url: str) -> str:
    """Call FAL.ai FLUX.1 Kontext and return the result image URL."""
    result = fal_client.run(
        "fal-ai/flux-pro/kontext",
        arguments={
            "image_url": thumbnail_url,
            "prompt": PROMPT,
            "guidance_scale": 3.5,
            "num_inference_steps": 28,
            "output_format": "jpeg",
        },
    )
    return result["images"][0]["url"]


def remove_background(image_url: str) -> str:
    """Call FAL.ai rembg to strip the background. Returns URL of transparent PNG."""
    result = fal_client.run(
        "fal-ai/imageutils/rembg",
        arguments={"image_url": image_url},
    )
    return result["image"]["url"]


def make_radial_gradient(size: tuple[int, int]) -> Image.Image:
    """Create a radial gradient: light grey (#E8E8E8) center → darker grey (#B0B0B0) edges."""
    import math
    w, h = size
    bg = Image.new("RGB", size)
    cx, cy = w / 2, h * 0.42   # center slightly above middle, like a studio sweep
    max_dist = math.sqrt((w / 2) ** 2 + (h * 0.58) ** 2)
    light, dark = 232, 176      # #E8E8E8 → #B0B0B0
    pixels = []
    for y in range(h):
        for x in range(w):
            dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            t = min(dist / max_dist, 1.0)
            v = int(light + (dark - light) * (t ** 1.4))
            pixels.extend([v, v, v])
    bg.frombytes(bytes(pixels))
    return bg


def add_shadow_to_transparent(transparent_url: str) -> bytes:
    """Download transparent PNG, add soft grey drop shadow, return as PNG (transparent bg)."""
    from PIL import ImageFilter
    resp = requests.get(transparent_url, timeout=30)
    resp.raise_for_status()
    img = Image.open(io.BytesIO(resp.content)).convert("RGBA")

    # Drop shadow — neutral grey, won't be affected by CSS color filters on the img
    shadow_offset = (0, int(img.height * 0.05))
    shadow_blur = int(img.height * 0.04)
    alpha = img.split()[3]
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shadow.paste((30, 30, 30, 90), mask=alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(shadow_blur))

    canvas = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shifted_shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shifted_shadow.paste(shadow, shadow_offset)
    canvas = Image.alpha_composite(canvas, shifted_shadow)
    canvas = Image.alpha_composite(canvas, img)

    out = io.BytesIO()
    canvas.save(out, format="PNG")
    return out.getvalue()


def update_db_local(db: sqlite3.Connection, model_id: str, url: str):
    db.execute("UPDATE models SET thumbnail = ? WHERE id = ?", (url, model_id))
    db.commit()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Enhance model thumbnails with AI")
    parser.add_argument("--limit", type=int, help="Max number of models to process")
    parser.add_argument("--id", dest="model_id", help="Process a single model by ID")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be processed without calling API")
    parser.add_argument("--force", action="store_true", help="Re-process models that already have enhanced_thumbnail")
    args = parser.parse_args()

    db = sqlite3.connect(DB_PATH)
    supabase = get_supabase()

    models = get_models(db, args.limit, args.model_id)
    print(f"Found {len(models)} model(s) to process\n")

    if args.dry_run:
        for mid, name, thumb in models:
            print(f"  [{mid}] {name[:60]}")
            print(f"        {thumb}\n")
        return

    success = 0
    failed = 0

    for i, (model_id, name, thumbnail) in enumerate(models, 1):
        print(f"[{i}/{len(models)}] {name[:60]} (id={model_id})")

        # Skip if already done
        if not args.force and already_enhanced(supabase, model_id):
            print("  ->already enhanced, skipping\n")
            continue

        try:
            print(f"  ->removing background...")
            transparent_url = remove_background(thumbnail)

            print(f"  ->adding shadow...")
            image_bytes = add_shadow_to_transparent(transparent_url)

            print(f"  ->uploading to Supabase Storage...")
            public_url = upload_to_supabase(supabase, model_id, image_bytes)

            print(f"  ->updating DB...")
            supabase.table("models").update({"enhanced_thumbnail": public_url}).eq("id", model_id).execute()
            update_db_local(db, model_id, public_url)

            print(f"  OK done: {public_url}\n")
            success += 1

        except Exception as e:
            print(f"  FAILED: {e}\n")
            failed += 1

        # Small pause to avoid rate limits
        if i < len(models):
            time.sleep(1)

    db.close()
    print(f"\nDone. {success} enhanced, {failed} failed.")
    estimated_cost = success * 0.01
    print(f"Estimated FAL.ai cost: ~${estimated_cost:.2f} (rembg only)")


if __name__ == "__main__":
    main()
