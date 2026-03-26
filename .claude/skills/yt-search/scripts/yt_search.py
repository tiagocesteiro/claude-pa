#!/usr/bin/env python3
"""
YouTube video search with metadata and engagement metrics.
Uses yt-dlp to search YouTube and return structured, human-readable results.

Usage:
    python yt_search.py "query" [--limit N] [--months N]
"""

import argparse
import io
import json
import subprocess
import sys
from datetime import datetime, timedelta

# Ensure UTF-8 output on Windows terminals
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


def format_number(n):
    """Format a number as human-readable (e.g. 1234567 -> '1.23M')."""
    if n is None:
        return "N/A"
    n = int(n)
    if n >= 1_000_000_000:
        return f"{n / 1_000_000_000:.2f}B"
    if n >= 1_000_000:
        return f"{n / 1_000_000:.2f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return str(n)


def format_duration(seconds):
    """Format duration seconds as HH:MM:SS or MM:SS."""
    if seconds is None:
        return "N/A"
    seconds = int(seconds)
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def format_date(upload_date_str):
    """Format YYYYMMDD string as 'Mon DD, YYYY'."""
    if not upload_date_str:
        return "N/A"
    try:
        dt = datetime.strptime(upload_date_str, "%Y%m%d")
        return dt.strftime("%b %d, %Y")
    except ValueError:
        return upload_date_str


def days_ago(n):
    """Return a datetime N days ago from today."""
    return datetime.today() - timedelta(days=n)


def months_ago(n):
    """Return a datetime N months ago from today."""
    return datetime.today() - timedelta(days=30 * n)


def search_youtube(query, limit, days=None, months=None):
    """Run yt-dlp search and return parsed video metadata."""
    if days is not None:
        cutoff = days_ago(days)
    else:
        cutoff = months_ago(months)
    cutoff_str = cutoff.strftime("%Y%m%d")

    # Fetch more than needed to account for date filtering
    fetch_count = limit * 3

    cmd = [
        sys.executable, "-m", "yt_dlp",
        f"ytsearch{fetch_count}:{query}",
        "--dump-json",
        "--no-download",
        "--quiet",
        "--no-warnings",
        "--dateafter", cutoff_str,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
        )
    except subprocess.TimeoutExpired:
        print("Error: yt-dlp timed out. Try a more specific query or reduce --limit.", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("Error: yt-dlp not found. Run: pip install yt-dlp", file=sys.stderr)
        sys.exit(1)

    videos = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue

        # Date filter (belt-and-suspenders)
        upload_date = data.get("upload_date")
        if upload_date:
            try:
                video_dt = datetime.strptime(upload_date, "%Y%m%d")
                if video_dt < cutoff:
                    continue
            except ValueError:
                pass

        videos.append(data)
        if len(videos) >= limit:
            break

    return videos


def compute_engagement(view_count, subscriber_count):
    """Compute views-to-subscribers ratio."""
    if not view_count or not subscriber_count or int(subscriber_count) == 0:
        return None
    return round(int(view_count) / int(subscriber_count), 2)


def print_results(videos, query, limit, days=None, months=None):
    divider = "─" * 60
    period = f"last {days} day(s)" if days is not None else f"last {months} month(s)"

    print(f"\n{divider}")
    print(f"  YouTube Search: \"{query}\"")
    print(f"  Showing {len(videos)} result(s) from the {period}")
    print(divider)

    if not videos:
        print("\n  No results found. Try adjusting --months or --limit.\n")
        return

    for i, v in enumerate(videos, 1):
        title = v.get("title") or "Untitled"
        channel = v.get("uploader") or v.get("channel") or "Unknown Channel"
        subs = v.get("channel_follower_count")
        views = v.get("view_count")
        duration = v.get("duration")
        upload_date = v.get("upload_date")
        url = v.get("webpage_url") or v.get("url") or ""
        engagement = compute_engagement(views, subs)

        engagement_str = f"{engagement}×" if engagement is not None else "N/A"

        print(f"\n#{i} · {title}")
        print(f"  Channel : {channel}  │  Subs: {format_number(subs)}")
        print(f"  Views   : {format_number(views)}  │  Duration: {format_duration(duration)}  │  Uploaded: {format_date(upload_date)}")
        print(f"  Engage  : {engagement_str}  (views/subscriber ratio)")
        print(f"  URL     : {url}")

        if i < len(videos):
            print(f"\n{divider}")

    print(f"\n{divider}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Search YouTube videos with metadata and engagement metrics."
    )
    parser.add_argument("query", help="Search query")
    parser.add_argument("--limit", type=int, default=20, help="Number of results (default: 20)")
    parser.add_argument("--days", type=int, default=None, help="Filter to last N days (overrides --months)")
    parser.add_argument("--months", type=int, default=6, help="Filter to last N months (default: 6)")
    args = parser.parse_args()

    if args.limit < 1:
        print("Error: --limit must be at least 1", file=sys.stderr)
        sys.exit(1)
    if args.days is not None and args.days < 1:
        print("Error: --days must be at least 1", file=sys.stderr)
        sys.exit(1)
    if args.days is None and args.months < 1:
        print("Error: --months must be at least 1", file=sys.stderr)
        sys.exit(1)

    period = f"last {args.days} day(s)" if args.days is not None else f"last {args.months} month(s)"
    print(f"Searching YouTube for \"{args.query}\" ({period}, up to {args.limit} results)...")
    print("This may take 30–90 seconds for full metadata extraction.")

    videos = search_youtube(args.query, args.limit, days=args.days, months=args.months)
    print_results(videos, args.query, args.limit, days=args.days, months=args.months)


if __name__ == "__main__":
    main()
