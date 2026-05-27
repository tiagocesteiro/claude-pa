#!/usr/bin/env python3
"""
atlas_briefing — daily morning briefing for Tiago.

Pipeline:
  1. Load watchlist (data/watchlist.yaml) and run ticker-snapshot on each ticker
  2. Run macro-briefing (alert + us + fx)
  3. Build context blob (raw structured data)
  4. Invoke `claude -p` (Claude Code headless) with ATLAS prompt + WebSearch
     → uses your Claude.AI subscription, not the API (no per-token cost)
  5. Post briefing to Discord webhook (split into <2000 char chunks)

Env vars needed:
  FINNHUB_API_KEY            — for ticker snapshots
  FRED_API_KEY               — for macro
  SEC_IDENTITY               — for sec-filings (optional in briefing)
  DISCORD_WEBHOOK_URL        — where to post
  CLAUDE_CODE_OAUTH_TOKEN    — required in CI only (generate with `claude setup-token`)
                               Locally, `claude` is already authed via interactive login.

Usage:
  python scripts/atlas_briefing.py              # full run (data + Claude + post)
  python scripts/atlas_briefing.py --dry-run    # build briefing, print, don't post
  python scripts/atlas_briefing.py --no-claude  # raw data only, no AI synthesis
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
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[1]
SKILLS = REPO_ROOT / ".claude" / "skills"
sys.path.insert(0, str(SKILLS / "ticker-snapshot" / "scripts"))
sys.path.insert(0, str(SKILLS / "macro-briefing" / "scripts"))

try:
    import yaml
except ImportError:
    sys.exit("ERROR: pyyaml not installed. Run: pip install pyyaml")

# Import skill modules
import snapshot as snapshot_mod  # noqa: E402
import macro as macro_mod        # noqa: E402


# ---------------------------------------------------------------------------
# Data collection
# ---------------------------------------------------------------------------

def load_watchlist(path: Path) -> dict:
    if not path.exists():
        sys.exit(f"ERROR: watchlist not found at {path}")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def collect_watchlist_data(watchlist: dict) -> dict:
    """Return {category_label: [{ticker, price, change_pct, name, news_count}, ...]}."""
    out: dict[str, list[dict]] = {}
    categories = watchlist.get("categories", {})

    all_tickers = []
    for cat in categories.values():
        all_tickers.extend(cat.get("tickers", []))

    print(f"[1/4] Fetching snapshots for {len(all_tickers)} tickers...", file=sys.stderr)

    quote_cache: dict[str, dict] = {}
    profile_cache: dict[str, dict] = {}
    for i, t in enumerate(all_tickers):
        if i > 0:
            time.sleep(1.1)  # Finnhub free: 60 req/min
        q = snapshot_mod.quote(t)
        p = snapshot_mod.profile(t)
        quote_cache[t] = q
        profile_cache[t] = p

    for cat_key, cat in categories.items():
        label = cat.get("label", cat_key)
        rows = []
        for t in cat.get("tickers", []):
            q = quote_cache.get(t, {})
            p = profile_cache.get(t, {})
            price = q.get("c")
            prev = q.get("pc")
            chg_pct = ((price - prev) / prev * 100) if (price and prev) else None
            rows.append({
                "ticker": t,
                "name": p.get("name", t),
                "price": price,
                "change_pct": chg_pct,
                "industry": p.get("finnhubIndustry"),
            })
        out[label] = rows
    return out


def collect_macro_data() -> dict:
    print("[2/4] Fetching macro data...", file=sys.stderr)
    return {
        "us": macro_mod.us_macro(),
        "fx": macro_mod.fx(),
        "alert": macro_mod.alert(),
    }


# ---------------------------------------------------------------------------
# Context formatting (for Claude)
# ---------------------------------------------------------------------------

def format_watchlist_for_claude(data: dict) -> str:
    lines = ["## Watchlist Snapshot (most recent close / live)"]
    for label, rows in data.items():
        lines.append(f"\n### {label}")
        for r in rows:
            price = f"${r['price']:.2f}" if r["price"] else "N/A"
            chg = f"{r['change_pct']:+.2f}%" if r["change_pct"] is not None else "N/A"
            lines.append(f"- **{r['ticker']}** ({r['name']}): {price} ({chg})")
    return "\n".join(lines)


def format_macro_for_claude(macro: dict) -> str:
    return f"""## Macro Context

{macro['alert']}

{macro['us']}

{macro['fx']}"""


# ---------------------------------------------------------------------------
# Claude API synthesis
# ---------------------------------------------------------------------------

BRIEFING_SYSTEM_PROMPT = """Tu és o ATLAS — analista de investimentos crítico, perspetiva hedge fund global, especialista em macro/geopolítica/tech.

MODO: Daily briefing matinal para o Tiago em Lisboa, 8h da manhã.

OBJETIVO: Produzir um briefing curto, scannable, com:
1. **🌍 Notícias da noite (geopolítica + macro)** — 3-4 bullets curtos
2. **📊 Pulse dos mercados** — destaques dos dados que recebeste (índices, top mover, divergências)
3. **🎯 Ideias do dia** — 2-3 setups táticos (long ou short) com 1-line bull + 1-line bear + horizonte (intraday / dias / semanas)
4. **💡 Tip do dia** — 1 conceito educacional curto sobre investimentos ou dinheiro (alterna entre: valuation, psicologia, macro, history, math of compounding, position sizing, taxes, behavioural finance, etc.). Não repetir tip anterior se possível.

REGRAS:
- Português de Portugal, casual mas profissional
- Markdown limpo, otimizado para Discord (sem H1/H2, usa **bold** e bullets)
- Máximo 1700 caracteres no total (Discord limita a 2000, deixa margem)
- Usa web_search para apanhar notícias overnight de Asia/EU + 2-3 stories geopolíticas relevantes
- Sê crítico — challenge consensus, flag risks, não vendas hype
- Termina com: "_Não é aconselhamento financeiro._"

INPUT que recebes: dados macro estruturados (FRED) + watchlist com preços e variação % do dia anterior.

OUTPUT: APENAS o briefing markdown final, nada mais. Sem preamble."""


def _find_claude_cli() -> str:
    """Locate the `claude` executable.

    Search order:
      1. `claude` on PATH (npm-global, system install, etc.)
      2. VSCode extension's bundled native binary, picking the highest version.
      3. ~/.claude/local/claude.* (some installer layouts)
    """
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

    for cand in (home / ".claude" / "local" / "claude.exe", home / ".claude" / "local" / "claude"):
        if cand.is_file():
            return str(cand)

    sys.exit(
        "ERROR: `claude` CLI not found.\n"
        "Install: https://docs.claude.com/en/docs/claude-code\n"
        "Or `npm install -g @anthropic-ai/claude-code`"
    )


def call_claude(macro_str: str, watchlist_str: str) -> str:
    """Invoke `claude -p` headless. Uses Claude.AI subscription auth (no API cost)."""
    claude_bin = _find_claude_cli()
    print(f"[3/4] Calling Claude Code headless: {claude_bin}", file=sys.stderr)

    user_msg = f"""Hoje é {datetime.now(timezone.utc).strftime('%A, %d de %B de %Y')}.

{macro_str}

---

{watchlist_str}

---

Gera o briefing matinal seguindo a estrutura definida. Usa WebSearch para notícias overnight (Asia/EU close) e geopolítica (3 stories top)."""

    # Headless invocation. --allowedTools whitelists only WebSearch/WebFetch (no file writes).
    # --dangerously-skip-permissions auto-approves those tools (required in non-interactive).
    cmd = [
        claude_bin,
        "-p", user_msg,
        "--append-system-prompt", BRIEFING_SYSTEM_PROMPT,
        "--output-format", "text",
        "--allowedTools", "WebSearch,WebFetch",
        "--dangerously-skip-permissions",
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=240,
            encoding="utf-8",
            errors="replace",
        )
    except FileNotFoundError:
        sys.exit("ERROR: `claude` CLI not found. Install Claude Code: https://docs.claude.com/en/docs/claude-code")
    except subprocess.TimeoutExpired:
        sys.exit("ERROR: claude -p timed out after 4 minutes")

    if result.returncode != 0:
        stderr_tail = (result.stderr or "")[-800:]
        sys.exit(f"ERROR: claude -p exited {result.returncode}\nstderr:\n{stderr_tail}")

    return (result.stdout or "").strip()


# ---------------------------------------------------------------------------
# Discord posting
# ---------------------------------------------------------------------------

DISCORD_LIMIT = 2000


def chunk_for_discord(text: str, limit: int = DISCORD_LIMIT) -> list[str]:
    """Split on paragraph boundaries, keep each chunk under limit."""
    if len(text) <= limit:
        return [text]
    chunks = []
    current = ""
    for para in text.split("\n\n"):
        candidate = (current + "\n\n" + para) if current else para
        if len(candidate) > limit:
            if current:
                chunks.append(current)
            if len(para) > limit:
                # Hard-split a single oversized paragraph
                while len(para) > limit:
                    chunks.append(para[:limit])
                    para = para[limit:]
                current = para
            else:
                current = para
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def post_to_discord(webhook: str, content: str) -> None:
    chunks = chunk_for_discord(content)
    print(f"[4/4] Posting {len(chunks)} message(s) to Discord...", file=sys.stderr)
    for i, chunk in enumerate(chunks):
        payload = json.dumps({"content": chunk}).encode("utf-8")
        req = Request(
            webhook,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "atlas-briefing/1.0 (https://github.com/, Python urllib)",
            },
        )
        try:
            with urlopen(req, timeout=30) as resp:
                if resp.status not in (200, 204):
                    print(f"WARN: Discord returned {resp.status}", file=sys.stderr)
        except HTTPError as e:
            sys.exit(f"ERROR: Discord webhook HTTP {e.code}: {e.read().decode('utf-8', errors='replace')[:200]}")
        except URLError as e:
            sys.exit(f"ERROR: Discord webhook network: {e.reason}")
        if i < len(chunks) - 1:
            time.sleep(1.0)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="ATLAS daily morning briefing")
    parser.add_argument("--dry-run", action="store_true", help="Build briefing, print to stdout, don't post to Discord")
    parser.add_argument("--no-claude", action="store_true", help="Skip Claude synthesis, post raw data only")
    parser.add_argument("--watchlist", type=str, default=str(REPO_ROOT / "data" / "watchlist.yaml"))
    args = parser.parse_args()

    watchlist = load_watchlist(Path(args.watchlist))
    wl_data = collect_watchlist_data(watchlist)
    macro = collect_macro_data()

    wl_str = format_watchlist_for_claude(wl_data)
    macro_str = format_macro_for_claude(macro)

    if args.no_claude:
        briefing = f"# ATLAS raw briefing — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n\n{macro_str}\n\n{wl_str}"
    else:
        briefing = call_claude(macro_str, wl_str)

    header = f"**🌅 ATLAS Daily Briefing** · {datetime.now(timezone.utc).strftime('%A, %d %b %Y')}\n\n"
    full = header + briefing

    if args.dry_run:
        print("\n========== BRIEFING ==========\n")
        print(full)
        print("\n========== END ==========\n")
        return

    webhook = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook:
        sys.exit("ERROR: DISCORD_WEBHOOK_URL not set (use --dry-run to skip posting)")

    post_to_discord(webhook, full)
    print("Done.", file=sys.stderr)


if __name__ == "__main__":
    main()
