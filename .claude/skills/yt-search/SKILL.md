---
name: yt-search
description: >
  Search YouTube videos and return structured metadata with engagement metrics.
  Use this skill whenever the user wants to research YouTube content, find video resources,
  gather references, scout competitors, or explore a topic on YouTube. Triggers on phrases
  like "search YouTube for", "find YouTube videos about", "look up YouTube tutorials on",
  "what are the top YouTube videos about", "youtube search:", "find me videos on", or
  any request to gather/research video content from YouTube. Always use this skill
  instead of general web search when the user specifically wants YouTube results.
compatibility:
  required:
    - yt-dlp (pip install yt-dlp)
    - Python 3.x
---

# yt-search

Search YouTube for videos by query and return rich metadata — title, channel, subscriber count, view count, duration, upload date, URL — plus a views-to-subscribers engagement ratio. Results are filtered by recency and formatted for easy scanning.

## Prerequisites

yt-dlp must be installed:
```bash
pip install yt-dlp
```

To check: `python -m yt_dlp --version`

## Usage

The bundled script lives at `scripts/yt_search.py` relative to this SKILL.md.

```bash
python scripts/yt_search.py "your search query" [--limit N] [--months N]
```

**Defaults:** 20 results, last 6 months.

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--limit N` | 20 | Max number of results to return |
| `--days N` | — | Filter to videos uploaded within the last N days (overrides --months) |
| `--months N` | 6 | Filter to videos uploaded within the last N months |

`--days` takes precedence over `--months` when both are provided.

### Examples

```bash
# Basic search
python scripts/yt_search.py "n8n workflow automation"

# Last 10 days, top 10 results
python scripts/yt_search.py "Claude Code" --days 10 --limit 10

# Last 3 months, top 5 only
python scripts/yt_search.py "3d printing marketplace" --limit 5 --months 3

# Last year, more results
python scripts/yt_search.py "Next.js 15 new features" --limit 10 --months 12
```

## Output Format

Each result shows:
```
────────────────────────────────────────────────────────────
#1 · Title of the Video Here
  Channel : Channel Name  │  Subs: 342K
  Views   : 1.23M  │  Duration: 12:34  │  Uploaded: Mar 10, 2025
  Engage  : 3.51×  (views/subscriber ratio)
  URL     : https://www.youtube.com/watch?v=...
```

**Engagement ratio** = views ÷ subscribers. A ratio > 1 means the video got more views than the channel has subscribers, indicating it reached beyond the core audience. High ratios (10×+) often signal viral or algorithmically-promoted content. "N/A" appears when subscriber count isn't available.

Note: Very small channels (<500 subs) can produce extreme ratios (100×, 500×) even with modest view counts. Treat these as less meaningful — the ratio is most useful for channels with established audiences.

## How to invoke

When the user asks to search YouTube, run the script using the Bash tool:

```bash
python "d:/Claude - PA/.claude/skills/yt-search/scripts/yt_search.py" "QUERY" --limit LIMIT --months MONTHS
```

Adjust flags from user intent:
- "last 10 days" / "this week" / "recent" → use `--days N` (e.g. `--days 10`, `--days 7`)
- "last 3 months" / "last year" → use `--months N`
- "top 5" / "find 10" → use `--limit N`
- When not specified, use defaults (20 results, 6 months).

## Speed note

Full metadata extraction (subscriber count, exact view count, etc.) requires yt-dlp to visit each video's page. Expect 30–90 seconds for 20 results. For faster results, use `--limit 5`.

## Going deeper — video-lens

yt-search finds videos. To extract what's *inside* a video (transcript, summary, key points, timestamped outline), use the **video-lens** skill on any URL from the results:

```
/video-lens https://www.youtube.com/watch?v=VIDEO_ID
```

This generates an interactive HTML report with:
- Executive summary + key takeaway
- Bulleted key points with supporting detail
- Clickable timestamped outline (opens video at that moment)
- Embedded YouTube player

Typical workflow: run yt-search to find the most relevant/engaging videos → pick the best 2-3 → run video-lens on each to extract their content for a research report.

## Troubleshooting

- **No results / few results**: The date filter is strict — try increasing `--months`
- **yt-dlp not found**: Run `pip install yt-dlp`
- **Timeout**: Reduce `--limit` or use a more specific query
- **"N/A" subscriber count**: YouTube doesn't always expose this; engagement ratio will show N/A
