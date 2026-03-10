#!/usr/bin/env python3
"""
Printables Model Scraper — with SQLite persistence and category filtering.

Fetches popular 3D models with commercial-safe CC licenses via Printables GraphQL API.
Saves to a local SQLite database (catalog.db) — skips models already stored.

Commercial-safe license IDs:
  7  = Creative Commons — Public Domain (CC0)
  1  = Creative Commons — Attribution (CC BY)
  2  = Creative Commons — Attribution — Share Alike (CC BY-SA)
  15 = Commercial Use

Key categories:
  30 = Toys & Games       3 = Household        13 = Art & Design
  21 = Gadgets           44 = Home Decor       65 = Seasonal
  101 = Tabletop Mini    58 = World & Scans     9 = Sports & Outdoor

Usage:
  python printables_scraper.py                        # fetch 20 popular models (all categories)
  python printables_scraper.py --limit 50             # fetch 50 models
  python printables_scraper.py --category 30          # Toys & Games only
  python printables_scraper.py --category 30 --limit 100
  python printables_scraper.py --categories           # list all categories
  python printables_scraper.py --stats                # show catalog stats
  python printables_scraper.py --export models.json   # export catalog to JSON
  python printables_scraper.py --export models.csv    # export catalog to CSV
"""

import json
import time
import argparse
import csv
import sys
import sqlite3
from pathlib import Path
from datetime import datetime
import requests

GRAPHQL_URL = "https://api.printables.com/graphql/"
MEDIA_BASE_URL = "https://media.printables.com/"
MODEL_BASE_URL = "https://www.printables.com/model/"
DB_PATH = Path(__file__).parent / "catalog.db"

COMMERCIAL_LICENSE_IDS = [7, 1, 2, 15]

# ── Content Safety Filters ─────────────────────────────────────────────────────

# Known IP / trademark owners — names that strongly indicate a copyrighted design.
# Match against model name + summary (case-insensitive, whole-word where possible).
COPYRIGHT_KEYWORDS = [
    # Disney / Pixar franchises
    "disney", "pixar", "mickey", "minnie", "donald duck", "goofy", "winnie the pooh",
    "frozen", "elsa", "anna", "moana", "rapunzel", "cinderella", "ariel",
    "toy story", "buzz lightyear", "woody", "nemo", "dory", "simba", "lion king",
    "encanto", "mirabel", "stitch", "lilo", "bambi", "dumbo",
    # Marvel / DC
    "marvel", "avengers", "iron man", "spider-man", "spiderman", "captain america",
    "batman", "superman", "wonder woman", "joker", "dc comics", "thor", "hulk",
    "black widow", "groot", "thanos", "deadpool", "wolverine",
    # Star Wars / Lucasfilm
    "star wars", "darth vader", "yoda", "baby yoda", "grogu", "mandalorian",
    "r2-d2", "r2d2", "c-3po", "stormtrooper", "boba fett", "lightsaber",
    "death star", "millennium falcon", "jedi", "sith",
    # Nintendo / gaming
    "nintendo", "mario", "luigi", "pikachu", "pokemon", "pokémon", "zelda", "link",
    "samus", "kirby", "donkey kong", "yoshi", "bowser", "peach", "toad",
    "sonic", "sega", "master chief", "halo", "minecraft creeper",
    # Warner Bros
    "harry potter", "hogwarts", "hermione", "dumbledore", "voldemort",
    "looney tunes", "bugs bunny", "tweety", "tom and jerry",
    "lord of the rings", "gandalf", "gollum", "hobbit",
    # Anime / Manga (big IPs)
    "naruto", "sasuke", "luffy", "demon slayer", "tanjiro",
    "attack on titan", "dragonball", "dragon ball", "goku", "gundam",
    "evangelion", "totoro", "ghibli", "my hero academia", "deku",
    # Brands / Logos
    "nike", "adidas", "apple logo", "ferrari", "lamborghini", "bugatti",
    "bmw logo", "mercedes logo", "porsche logo", "coca-cola", "pepsi",
    # Misc pop culture
    "minion", "minions", "despicable me", "paw patrol", "bluey",
    "peppa pig", "dora", "blues clues", "among us", "fortnite",
    "the office", "stranger things", "mandalorian",
]

# Models involving direct food/drink contact — not food-safe in PLA/PETG without coating.
FOOD_CONTACT_KEYWORDS = [
    "cup", "mug", "tumbler", "glass ", "drinking",
    "bowl", "plate", "dish ", "platter", "tray for food",
    "fork", "spoon", "knife", "cutlery", "utensil", "chopstick",
    "cookie cutter", "cookie stamp", "biscuit cutter",
    "food container", "food storage", "lunch box", "food box",
    "water bottle", "bottle cap", "straw",
    "shot glass", "wine glass", "beer stein",
    "ice tray", "ice cube",
    "salad", "fruit bowl",
]


def is_safe(model: dict) -> tuple[bool, str]:
    """Return (True, '') if model passes all safety filters, else (False, reason)."""
    import re
    text = f"{model['name']} {model.get('summary', '')}".lower()

    # Words that need whole-word matching to avoid false positives
    WORD_BOUNDARY_KEYWORDS = {
        "thor", "link", "mario", "samus", "kirby", "goofy",
        "elsa", "anna", "moana", "dory", "simba", "luffy",
    }

    for kw in COPYRIGHT_KEYWORDS:
        if kw in WORD_BOUNDARY_KEYWORDS:
            if re.search(rf'\b{re.escape(kw)}\b', text):
                return False, f"copyright keyword: '{kw}'"
        else:
            if kw in text:
                return False, f"copyright keyword: '{kw}'"

    for kw in FOOD_CONTACT_KEYWORDS:
        if kw in text:
            return False, f"food-contact keyword: '{kw}'"

    return True, ""


HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

CATEGORIES = {
    1: "3D Printers",
    13: "Art & Design",
    76: "Costumes & Accessories",
    17: "Fashion",
    21: "Gadgets",
    87: "Healthcare",
    48: "Hobby & Makers",
    3: "Household",
    44: "Home Decor",
    4: "Kitchen",
    90: "Learning",
    65: "Seasonal Designs",
    9: "Sports & Outdoor",
    101: "Tabletop Miniatures",
    30: "Toys & Games",
    36: "Action Figures & Statues",
    31: "Board Games",
    37: "Building Toys",
    33: "Puzzles & Brain-teasers",
    58: "World & Scans",
    61: "Animals",
}

SEARCH_QUERY = """
query SearchPrints($limit: Int, $offset: Int, $licenses: [ID], $categoryId: ID) {
  searchPrints2(
    query: ""
    licenses: $licenses
    ordering: popular
    limit: $limit
    offset: $offset
    categoryId: $categoryId
  ) {
    items {
      id
      name
      slug
      summary
      license {
        id
        name
      }
      image {
        filePath
      }
      user {
        publicUsername
        handle
      }
      likesCount
      makesCount
      category {
        id
        name
      }
    }
  }
}
"""


# ── Database ──────────────────────────────────────────────────────────────────

def init_db(db_path: Path = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS models (
            id              TEXT PRIMARY KEY,
            name            TEXT NOT NULL,
            summary         TEXT,
            url             TEXT NOT NULL,
            thumbnail       TEXT,
            license_id      TEXT,
            license_name    TEXT,
            creator_username TEXT,
            creator_handle  TEXT,
            creator_url     TEXT,
            likes           INTEGER DEFAULT 0,
            makes           INTEGER DEFAULT 0,
            category_id     TEXT,
            category_name   TEXT,
            fetched_at      TEXT NOT NULL
        )
    """)
    conn.commit()
    return conn


def get_existing_ids(conn: sqlite3.Connection) -> set[str]:
    rows = conn.execute("SELECT id FROM models").fetchall()
    return {row["id"] for row in rows}


def insert_models(conn: sqlite3.Connection, models: list[dict]) -> int:
    inserted = 0
    for m in models:
        try:
            conn.execute("""
                INSERT OR IGNORE INTO models VALUES (
                    :id, :name, :summary, :url, :thumbnail,
                    :license_id, :license_name,
                    :creator_username, :creator_handle, :creator_url,
                    :likes, :makes, :category_id, :category_name, :fetched_at
                )
            """, m)
            if conn.execute("SELECT changes()").fetchone()[0]:
                inserted += 1
        except sqlite3.Error as e:
            print(f"DB error for model {m['id']}: {e}", file=sys.stderr)
    conn.commit()
    return inserted


# ── API ───────────────────────────────────────────────────────────────────────

def fetch_batch(limit: int, offset: int, category_id: int | None) -> list[dict]:
    payload = {
        "query": SEARCH_QUERY,
        "variables": {
            "limit": limit,
            "offset": offset,
            "licenses": COMMERCIAL_LICENSE_IDS,
            "categoryId": str(category_id) if category_id else None,
        },
    }
    resp = requests.post(GRAPHQL_URL, headers=HEADERS, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    if "errors" in data:
        raise RuntimeError(f"GraphQL errors: {data['errors']}")

    return data["data"]["searchPrints2"]["items"]


def format_model(item: dict) -> dict:
    model_id = item["id"]
    slug = item["slug"]
    file_path = item.get("image", {}).get("filePath", "")
    cat = item.get("category") or {}

    return {
        "id": model_id,
        "name": item["name"],
        "summary": item.get("summary") or "",
        "url": f"{MODEL_BASE_URL}{model_id}-{slug}",
        "thumbnail": f"{MEDIA_BASE_URL}{file_path}" if file_path else "",
        "license_id": item["license"]["id"],
        "license_name": item["license"]["name"],
        "creator_username": item["user"]["publicUsername"],
        "creator_handle": item["user"]["handle"],
        "creator_url": f"https://www.printables.com/@{item['user']['handle']}",
        "likes": item.get("likesCount", 0),
        "makes": item.get("makesCount", 0),
        "category_id": str(cat.get("id", "")),
        "category_name": cat.get("name", ""),
        "fetched_at": datetime.utcnow().isoformat(),
    }


def fetch_and_store(
    conn: sqlite3.Connection,
    limit: int = 20,
    category_id: int | None = None,
    batch_size: int = 40,
) -> tuple[int, int, int]:
    """Fetch models from Printables, apply safety filters, store new ones.
    Returns (fetched_from_api, filtered_out, new_inserted)."""
    existing_ids = get_existing_ids(conn)
    accepted: list[dict] = []
    total_fetched = 0
    total_filtered = 0
    new_count = 0
    offset = 0

    cat_label = CATEGORIES.get(category_id, f"category {category_id}") if category_id else "all categories"
    print(f"Fetching up to {limit} safe models [{cat_label}]...", file=sys.stderr)

    while len(accepted) < limit:
        batch = min(batch_size, (limit - len(accepted)) * 3)  # over-fetch to account for filters
        print(f"  Requesting {batch} models at offset {offset}...", file=sys.stderr)

        try:
            items = fetch_batch(batch, offset, category_id)
        except Exception as e:
            print(f"  Error: {e}", file=sys.stderr)
            break

        if not items:
            break

        total_fetched += len(items)
        models = [format_model(item) for item in items]

        for m in models:
            safe, reason = is_safe(m)
            if not safe:
                print(f"    SKIP [{reason}] {m['name']}", file=sys.stderr)
                total_filtered += 1
                continue
            if len(accepted) >= limit:
                break
            accepted.append(m)

        new_models = [m for m in accepted if m["id"] not in existing_ids]
        inserted = insert_models(conn, new_models)
        new_count += inserted
        existing_ids.update(m["id"] for m in new_models)

        print(f"  accepted {len(accepted)}/{limit}, filtered {total_filtered}, +{new_count} new in db", file=sys.stderr)

        offset += batch
        if len(items) < batch:
            break

        time.sleep(1)

    return total_fetched, total_filtered, new_count


# ── Export ────────────────────────────────────────────────────────────────────

def export_json(conn: sqlite3.Connection, path: str, category_id: int | None = None) -> None:
    query = "SELECT * FROM models"
    params = []
    if category_id:
        query += " WHERE category_id = ?"
        params.append(str(category_id))
    query += " ORDER BY likes DESC"

    rows = conn.execute(query, params).fetchall()
    models = [dict(r) for r in rows]

    with open(path, "w", encoding="utf-8") as f:
        json.dump(models, f, indent=2, ensure_ascii=False)
    print(f"Exported {len(models)} models to {path}")


def export_csv(conn: sqlite3.Connection, path: str, category_id: int | None = None) -> None:
    query = "SELECT * FROM models"
    params = []
    if category_id:
        query += " WHERE category_id = ?"
        params.append(str(category_id))
    query += " ORDER BY likes DESC"

    rows = conn.execute(query, params).fetchall()
    if not rows:
        print("No models to export.", file=sys.stderr)
        return

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(dict(r) for r in rows)
    print(f"Exported {len(rows)} models to {path}")


def print_stats(conn: sqlite3.Connection) -> None:
    total = conn.execute("SELECT COUNT(*) FROM models").fetchone()[0]
    print(f"\nCatalog: {DB_PATH}")
    print(f"Total models: {total}\n")

    print("By category:")
    rows = conn.execute("""
        SELECT category_name, COUNT(*) as count
        FROM models GROUP BY category_name ORDER BY count DESC
    """).fetchall()
    for row in rows:
        name = row["category_name"] or "(uncategorized)"
        print(f"  {row['count']:>5}  {name}")

    print("\nBy license:")
    rows = conn.execute("""
        SELECT license_name, COUNT(*) as count
        FROM models GROUP BY license_name ORDER BY count DESC
    """).fetchall()
    for row in rows:
        print(f"  {row['count']:>5}  {row['license_name']}")


def print_categories() -> None:
    print("\nAvailable categories (use --category ID):\n")
    for cat_id, name in sorted(CATEGORIES.items(), key=lambda x: x[1]):
        print(f"  {cat_id:>4}  {name}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Printables catalog scraper — persists to SQLite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--limit", type=int, default=20, help="Max safe models per category (default: 20)")
    parser.add_argument("--category", type=int, metavar="ID", help="Filter by category ID")
    parser.add_argument("--all-categories", action="store_true", help="Fetch --limit models for every curated category")
    parser.add_argument("--categories", action="store_true", help="List available categories and exit")
    parser.add_argument("--stats", action="store_true", help="Show catalog stats and exit")
    parser.add_argument("--export", metavar="FILE", help="Export catalog to .json or .csv file")
    parser.add_argument("--clear", action="store_true", help="Clear the catalog before fetching")
    parser.add_argument("--db", default=str(DB_PATH), help=f"SQLite database path (default: {DB_PATH})")
    args = parser.parse_args()

    if args.categories:
        print_categories()
        return

    conn = init_db(Path(args.db))

    if args.clear:
        conn.execute("DELETE FROM models")
        conn.commit()
        print("Catalog cleared.", file=sys.stderr)

    if args.stats:
        print_stats(conn)
        return

    if args.export:
        if args.export.endswith(".csv"):
            export_csv(conn, args.export, args.category)
        else:
            export_json(conn, args.export, args.category)
        return

    # Fetch for all curated categories
    if args.all_categories:
        # Skip Kitchen (food contact) and Healthcare (regulatory concerns)
        SKIP_CATEGORIES = {4, 87}
        target_cats = {k: v for k, v in CATEGORIES.items() if k not in SKIP_CATEGORIES}
        total_new = 0
        for cat_id, cat_name in target_cats.items():
            print(f"\n{'─'*50}", file=sys.stderr)
            fetched, filtered, new = fetch_and_store(conn, limit=args.limit, category_id=cat_id)
            total_new += new
            time.sleep(2)
        print(f"\nAll categories done. Total new models added: {total_new}")
        total = conn.execute("SELECT COUNT(*) FROM models").fetchone()[0]
        print(f"Total in catalog: {total}")
        return

    # Default: fetch models (single category or all)
    fetched, filtered, new = fetch_and_store(conn, limit=args.limit, category_id=args.category)

    print(f"\nDone. API returned {fetched} models, filtered out {filtered}, {new} new added to catalog.")
    print(f"Database: {args.db}")

    total = conn.execute("SELECT COUNT(*) FROM models").fetchone()[0]
    print(f"Total in catalog: {total}")


if __name__ == "__main__":
    main()