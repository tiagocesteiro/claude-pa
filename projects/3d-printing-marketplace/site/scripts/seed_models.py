#!/usr/bin/env python3
"""
Seed PrintPal's Supabase `models` table from the local catalog.db.

Usage:
  python scripts/seed_models.py                          # dry run (shows what would be inserted)
  python scripts/seed_models.py --execute                # actually insert
  python scripts/seed_models.py --execute --clear        # truncate first, then insert

Requirements:
  pip install supabase python-dotenv

Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
(service role key needed to bypass RLS on the models table during seeding).
"""

import json
import os
import sqlite3
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    print("Missing dependency: pip install python-dotenv", file=sys.stderr)
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("Missing dependency: pip install supabase", file=sys.stderr)
    sys.exit(1)

# ── Paths ──────────────────────────────────────────────────────────────────────
SITE_DIR = Path(__file__).parent.parent
TOOLS_DIR = SITE_DIR.parent / "tools"
DB_PATH = TOOLS_DIR / "catalog.db"
ENV_PATH = SITE_DIR / ".env.local"

# ── Load env ───────────────────────────────────────────────────────────────────
load_dotenv(ENV_PATH)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
# Use service role key (bypasses RLS) — never expose this client-side
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def load_models_from_db() -> list[dict]:
    if not DB_PATH.exists():
        print(f"catalog.db not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM models ORDER BY likes DESC").fetchall()
    conn.close()

    return [dict(r) for r in rows]


def to_supabase_row(m: dict) -> dict:
    """Map catalog.db columns → Supabase models table columns."""
    return {
        "id": m["id"],
        "name": m["name"],
        "summary": m.get("summary") or None,
        "url": m["url"],
        "thumbnail": m.get("thumbnail") or None,
        "license_id": m.get("license_id"),
        "license_name": m.get("license_name"),
        "creator_username": m.get("creator_username"),
        "creator_url": m.get("creator_url"),
        "likes": m.get("likes", 0),
        "makes": m.get("makes", 0),
        "category_id": m.get("category_id"),
        "category_name": m.get("category_name"),
        "is_active": True,
    }


def seed(execute: bool = False, clear: bool = False):
    models = load_models_from_db()
    print(f"Loaded {len(models)} models from catalog.db")

    if not execute:
        print("\nDRY RUN — first 3 rows that would be inserted:")
        for m in models[:3]:
            print(json.dumps(to_supabase_row(m), indent=2))
        print(f"\nRun with --execute to insert all {len(models)} models.")
        return

    if not SUPABASE_URL or not SUPABASE_KEY:
        print(
            "Missing env vars. Add to .env.local:\n"
            "  NEXT_PUBLIC_SUPABASE_URL=...\n"
            "  SUPABASE_SERVICE_ROLE_KEY=...",
            file=sys.stderr,
        )
        sys.exit(1)

    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    if clear:
        print("Clearing models table...")
        client.table("models").delete().neq("id", "").execute()
        print("Cleared.")

    rows = [to_supabase_row(m) for m in models]

    # Upsert in batches of 100
    BATCH = 100
    inserted = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i : i + BATCH]
        result = client.table("models").upsert(batch, on_conflict="id").execute()
        inserted += len(batch)
        print(f"  Upserted {inserted}/{len(rows)}...")

    print(f"\nDone. {len(rows)} models seeded into Supabase.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed Supabase models table from catalog.db")
    parser.add_argument("--execute", action="store_true", help="Actually insert (default: dry run)")
    parser.add_argument("--clear", action="store_true", help="Truncate table before seeding")
    args = parser.parse_args()

    seed(execute=args.execute, clear=args.clear)
