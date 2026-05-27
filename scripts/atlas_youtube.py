#!/usr/bin/env python3
"""
atlas_youtube — poll YouTube channel RSS feeds; on new video → transcript → ATLAS analysis → Discord.

Pipeline:
  1. Load data/youtube_channels.yaml (list of channels to monitor)
  2. Load data/youtube_state.json (last-seen video IDs per channel)
  3. For each channel: fetch RSS, compare latest video to state
  4. For each NEW video:
     - Pull transcript (youtube-transcript-api, falls back to yt-dlp)
     - Invoke `claude -p` headless with ATLAS summary + investment-recommendation prompt
     - Post to Discord webhook
     - Mark video as seen
  5. Persist updated state back to data/youtube_state.json (workflow commits it back to repo)

Env vars:
  DISCORD_WEBHOOK_URL        — where to post
  CLAUDE_CODE_OAUTH_TOKEN    — required in CI only (locally, `claude` is already authed)

Usage:
  python scripts/atlas_youtube.py              # full run
  python scripts/atlas_youtube.py --dry-run    # build summary, print, don't post or update state
  python scripts/atlas_youtube.py --force VIDEO_ID  # force-process a video (debug)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    import yaml
except ImportError:
    sys.exit("ERROR: pyyaml not installed. Run: pip install pyyaml")

REPO_ROOT = Path(__file__).resolve().parents[1]
CHANNELS_YAML = REPO_ROOT / "data" / "youtube_channels.yaml"
STATE_JSON = REPO_ROOT / "data" / "youtube_state.json"

RSS_BASE = "https://www.youtube.com/feeds/videos.xml"
ATOM_NS = "{http://www.w3.org/2005/Atom}"
YT_NS = "{http://www.youtube.com/xml/schemas/2015}"
MEDIA_NS = "{http://search.yahoo.com/mrss/}"


# ---------------------------------------------------------------------------
# State + config
# ---------------------------------------------------------------------------

def load_channels() -> list[dict]:
    if not CHANNELS_YAML.exists():
        sys.exit(f"ERROR: {CHANNELS_YAML} not found")
    with open(CHANNELS_YAML, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data.get("channels", [])


def load_state() -> dict:
    if not STATE_JSON.exists():
        return {"seen_video_ids": {}}
    with open(STATE_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(state: dict) -> None:
    with open(STATE_JSON, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# RSS polling
# ---------------------------------------------------------------------------

def fetch_channel_feed(channel_id: str) -> list[dict]:
    """Return list of recent video dicts: {id, title, published, link}."""
    url = f"{RSS_BASE}?channel_id={channel_id}"
    req = Request(url, headers={"User-Agent": "atlas-youtube/1.0"})
    try:
        with urlopen(req, timeout=30) as resp:
            xml_bytes = resp.read()
    except (HTTPError, URLError) as e:
        print(f"WARN: RSS fetch failed for {channel_id}: {e}", file=sys.stderr)
        return []

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as e:
        print(f"WARN: RSS parse failed for {channel_id}: {e}", file=sys.stderr)
        return []

    videos = []
    for entry in root.findall(f"{ATOM_NS}entry"):
        vid_el = entry.find(f"{YT_NS}videoId")
        title_el = entry.find(f"{ATOM_NS}title")
        pub_el = entry.find(f"{ATOM_NS}published")
        link_el = entry.find(f"{ATOM_NS}link")
        if vid_el is None or title_el is None:
            continue
        videos.append({
            "id": vid_el.text,
            "title": title_el.text,
            "published": pub_el.text if pub_el is not None else "",
            "link": link_el.attrib.get("href") if link_el is not None else f"https://www.youtube.com/watch?v={vid_el.text}",
        })
    return videos


# ---------------------------------------------------------------------------
# Transcript fetching
# ---------------------------------------------------------------------------

def _try_transcript_api(video_id: str) -> str | None:
    """Try youtube-transcript-api first (no auth, fast)."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        print("  [transcript] youtube-transcript-api not installed")
        return None

    candidates = [("en", "en-US", "en-GB"), ("pt", "pt-BR", "pt-PT")]
    last_err = None
    for lang_group in candidates:
        try:
            try:
                api = YouTubeTranscriptApi()
                t = api.fetch(video_id, languages=list(lang_group))
                snippets = t.snippets if hasattr(t, "snippets") else list(t)
                return " ".join(s.text for s in snippets)
            except AttributeError:
                t = YouTubeTranscriptApi.get_transcript(video_id, languages=list(lang_group))
                return " ".join(item["text"] for item in t)
        except Exception as e:
            last_err = e
            continue
    print(f"  [transcript] transcript-api failed: {last_err}")
    return None


def _try_ytdlp(video_id: str) -> str | None:
    """Fallback: use yt-dlp to grab auto-generated subs and parse vtt."""
    if not shutil.which("yt-dlp"):
        return None

    tmp = REPO_ROOT / ".cache_yt"
    tmp.mkdir(exist_ok=True)
    out_template = str(tmp / f"{video_id}.%(ext)s")

    cmd = [
        "yt-dlp",
        "--skip-download",
        "--write-auto-subs",
        "--write-subs",
        "--sub-langs", "en.*,en,pt.*,pt",
        "--sub-format", "vtt",
        "-o", out_template,
        f"https://www.youtube.com/watch?v={video_id}",
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, timeout=120, check=False)
        if r.returncode != 0:
            print(f"  [transcript] yt-dlp exit {r.returncode}: {(r.stderr or b'')[:200]}")
    except subprocess.TimeoutExpired:
        print("  [transcript] yt-dlp timed out")
        return None

    for vtt in tmp.glob(f"{video_id}.*.vtt"):
        return _vtt_to_text(vtt.read_text(encoding="utf-8", errors="replace"))
    print("  [transcript] yt-dlp: no .vtt file produced")
    return None


def _vtt_to_text(vtt: str) -> str:
    lines = []
    for line in vtt.splitlines():
        line = line.strip()
        if not line or line.startswith("WEBVTT") or "-->" in line or line.startswith("NOTE") or line.isdigit():
            continue
        line = re.sub(r"<[^>]+>", "", line)
        if line and (not lines or lines[-1] != line):
            lines.append(line)
    return " ".join(lines)


def fetch_transcript(video_id: str) -> str | None:
    return _try_transcript_api(video_id) or _try_ytdlp(video_id)


# ---------------------------------------------------------------------------
# Claude analysis
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """És o ATLAS — analista crítico de investimentos. Português de Portugal. Hedge-fund lens.

Tarefa: analisar criticamente um vídeo de YouTube de creator financeiro. Expor viés. Tom directo.

REGRAS RÍGIDAS (não negociáveis):
1. HARD LIMIT: 1800 caracteres totais no output. Conta-os. Se passar, corta sem dó.
2. ZERO preamble — começa LITERALMENTE com "**📺 ".
3. ZERO pergunta/oferta no fim. Última linha é o disclaimer.
4. ZERO "Sources:", "Fontes:", citations, links externos no output.
5. ZERO H1/H2 (#, ##). Só **bold**, *itálico* e bullets.
6. WebSearch: máximo 2 chamadas para fact-check de claims numéricos duvidosos. Não usar para research geral.

ESTRUTURA OBRIGATÓRIA (segue exatamente — sem secções extra):

**📺 [Creator] · [título]**
[link]

**🎯 Tese do creator**
- bullet 1 (1 linha)
- bullet 2 (1 linha)
- bullet 3 (opcional, 1 linha)

**🔥 ATLAS critique**
- ✅ [o que está certo, 1 linha]
- ❌ [o que está errado/exagerado com número específico, 1 linha]
- 🚩 [viés/conflito de interesse detectado, 1 linha]

**💼 Trade ATLAS**
- [LONG/SHORT TICKER] · [horizonte] — Bull: [1 linha] / Bear: [1 linha]
- (opcional 2º trade, mesmo formato)

_Não é aconselhamento financeiro._

Output: APENAS o markdown final. Nada antes, nada depois."""


def _find_claude_cli() -> str:
    on_path = shutil.which("claude")
    if on_path:
        return on_path
    home = Path(os.environ.get("USERPROFILE") or os.path.expanduser("~"))
    ext_root = home / ".vscode" / "extensions"
    if ext_root.is_dir():
        candidates = []
        for d in ext_root.iterdir():
            m = re.match(r"anthropic\.claude-code-(\d+)\.(\d+)\.(\d+)-.+", d.name)
            if not m:
                continue
            version = tuple(int(x) for x in m.groups())
            binary = d / "resources" / "native-binary" / "claude.exe"
            if binary.is_file():
                candidates.append((version, binary))
        if candidates:
            candidates.sort(key=lambda c: c[0], reverse=True)
            return str(candidates[0][1])
    sys.exit("ERROR: `claude` CLI not found.")


def call_claude(channel: dict, video: dict, transcript: str | None) -> str:
    claude_bin = _find_claude_cli()
    name = channel.get("name", "Unknown")
    bias = channel.get("bias_watch") or "n/a"

    if transcript:
        # Truncate very long transcripts (~12k tokens max).
        if len(transcript) > 60000:
            transcript = transcript[:60000] + "\n\n[...truncated...]"
        transcript_block = f"TRANSCRIPT:\n\n{transcript}\n\n---\n\n"
        # With transcript, 1 WebSearch call is enough for spot fact-checking.
        allowed_tools = "WebSearch"
        timeout_s = 240
        search_note = "Gera a análise ATLAS seguindo a estrutura definida. Cita números/teses específicas do vídeo."
    else:
        # No transcript — let Claude search for the video's key claims.
        transcript_block = (
            f"Nota: Transcript indisponível. Usa WebSearch para encontrar os claims "
            f"principais do vídeo '{video['title']}' de {name} (publicado {video.get('published','')}).\n\n---\n\n"
        )
        allowed_tools = "WebSearch,WebFetch"
        timeout_s = 300
        search_note = (
            "Transcript indisponível. Usa WebSearch (2-3 chamadas) para encontrar os claims do vídeo "
            "e gera a análise ATLAS com base no que encontrares."
        )

    user_msg = f"""Creator: {name}
Bias to watch: {bias}
Video title: {video['title']}
Link: {video['link']}
Published: {video.get('published', 'unknown')}

---

{transcript_block}{search_note}"""

    print(f"  → Claude headless (transcript={'yes' if transcript else 'no'}, tools={allowed_tools}, timeout={timeout_s}s)")
    cmd = [
        claude_bin,
        "-p",
        "--system-prompt", SYSTEM_PROMPT,
        "--output-format", "text",
        "--allowedTools", allowed_tools,
        "--dangerously-skip-permissions",
    ]
    try:
        result = subprocess.run(
            cmd,
            input=user_msg,
            capture_output=True,
            text=True,
            timeout=timeout_s,
            encoding="utf-8",
            errors="replace",
        )
    except subprocess.TimeoutExpired:
        return f"ERROR: Claude timed out after {timeout_s}s."

    if result.returncode != 0:
        stderr_tail = (result.stderr or "")[-600:]
        print(f"  [claude] exit {result.returncode}, stderr: {stderr_tail}")
        return f"ERROR: Claude exited {result.returncode}"

    return _clean_output((result.stdout or "").strip())


_PREAMBLE_HINTS = ("**📺", "📺", "**🎯", "🎯")


def _clean_output(text: str) -> str:
    """Strip preamble before the title block, trailing follow-up questions, and stray sources blocks."""
    # 1. Find earliest structural marker; drop anything before it.
    earliest = len(text)
    for hint in _PREAMBLE_HINTS:
        idx = text.find(hint)
        if idx != -1 and idx < earliest:
            earliest = idx
    if earliest > 0 and earliest < len(text):
        text = text[earliest:]

    # 2. Drop trailing patterns: "Queres que..."/"Quer que..."/"Sources:" / "Fontes:" sections.
    drop_patterns = [
        r"\n+\s*(?:Sources?|Fontes?)\s*:.*$",
        r"\n+\s*Quer(?:es)? que .*?[?.\s]*$",
        r"\n+\s*Want me to .*?[?.\s]*$",
        r"\n+\s*Posso .*?[?.\s]*$",
    ]
    for pat in drop_patterns:
        text = re.sub(pat, "", text, flags=re.DOTALL | re.IGNORECASE)

    # 3. Drop H1/H2 lines (model often adds "# ATLAS — ..." headers that duplicate the 📺 block).
    text = re.sub(r"^#{1,3}\s+.*$", "", text, flags=re.MULTILINE)

    # 4. Collapse 3+ blank lines.
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# ---------------------------------------------------------------------------
# Discord posting
# ---------------------------------------------------------------------------

DISCORD_LIMIT = 2000


def chunk_for_discord(text: str, limit: int = DISCORD_LIMIT) -> list[str]:
    if len(text) <= limit:
        return [text]
    chunks, current = [], ""
    for para in text.split("\n\n"):
        cand = (current + "\n\n" + para) if current else para
        if len(cand) > limit:
            if current:
                chunks.append(current)
            if len(para) > limit:
                while len(para) > limit:
                    chunks.append(para[:limit])
                    para = para[limit:]
                current = para
            else:
                current = para
        else:
            current = cand
    if current:
        chunks.append(current)
    return chunks


def post_to_discord(webhook: str, content: str) -> None:
    chunks = chunk_for_discord(content)
    print(f"  → Posting {len(chunks)} Discord message(s)...")
    for i, chunk in enumerate(chunks):
        payload = json.dumps({"content": chunk}).encode("utf-8")
        req = Request(
            webhook,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "atlas-youtube/1.0 (https://github.com/, Python urllib)",
            },
        )
        try:
            with urlopen(req, timeout=30):
                pass
        except HTTPError as e:
            sys.exit(f"ERROR: Discord HTTP {e.code}: {e.read().decode('utf-8', errors='replace')[:200]}")
        if i < len(chunks) - 1:
            time.sleep(1.0)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def process_video(channel: dict, video: dict, args) -> bool:
    """Return True if Discord post succeeded (or in dry-run); False on failure."""
    print(f"\n[NEW] {channel['name']} → {video['title']}")
    print(f"       {video['link']}")

    transcript = fetch_transcript(video["id"])
    if transcript:
        print(f"  ✓ Transcript: {len(transcript)} chars")
    else:
        print("  ! Transcript unavailable — proceeding with WebSearch-only analysis")

    analysis = call_claude(channel, video, transcript)
    if analysis.startswith("ERROR"):
        print(f"  ✗ {analysis}")
        return False

    if args.dry_run:
        print("\n========== ANALYSIS ==========\n")
        print(analysis)
        print("\n========== END ==========\n")
        return True

    webhook = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook:
        sys.exit("ERROR: DISCORD_WEBHOOK_URL not set")

    post_to_discord(webhook, analysis)
    return True


def main():
    parser = argparse.ArgumentParser(description="ATLAS YouTube channel monitor")
    parser.add_argument("--dry-run", action="store_true", help="Print analysis instead of posting; do not update state")
    parser.add_argument("--force", type=str, help="Force-process this video ID (debug)")
    args = parser.parse_args()

    channels = load_channels()
    state = load_state()
    seen = state.setdefault("seen_video_ids", {})

    if args.force:
        # Find which channel this video belongs to
        for ch in channels:
            videos = fetch_channel_feed(ch["id"])
            for v in videos:
                if v["id"] == args.force:
                    process_video(ch, v, args)
                    return
        sys.exit(f"ERROR: video {args.force} not found in any monitored channel's recent feed")

    new_count = 0
    for ch in channels:
        ch_id = ch["id"]
        ch_name = ch.get("name", ch_id)
        print(f"[poll] {ch_name} ({ch_id})")

        videos = fetch_channel_feed(ch_id)
        if not videos:
            continue

        seen_ids = set(seen.get(ch_id, []))
        # Process newest-first, but only the 3 most recent in case multiple drop at once.
        for v in videos[:3]:
            if v["id"] in seen_ids:
                continue
            ok = process_video(ch, v, args)
            if ok:
                new_count += 1
                if not args.dry_run:
                    seen.setdefault(ch_id, []).insert(0, v["id"])
                    # Keep last 50 IDs per channel
                    seen[ch_id] = seen[ch_id][:50]

    if new_count > 0 and not args.dry_run:
        save_state(state)
        print(f"\n[done] {new_count} new video(s) processed; state updated.")
    else:
        print(f"\n[done] no new videos.")


if __name__ == "__main__":
    main()
