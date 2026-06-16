#!/usr/bin/env python3
"""
scout_briefing — daily business-opportunity briefing for Tiago.

Mirrors scripts/atlas_briefing.py: collect structured signal first, then let Claude
*synthesize* (no live agentic web research — that's slow and unreliable in a cron).

Pipeline:
  1. Load data/scout_radar.yaml (profile + themes + sources)
  2. Pick 2 themes for today (rotation by day-of-year)
  3. Collect real demand signals via Perplexity (reddit pain points + traction), with citations
  4. Invoke `claude -p` (Claude Code headless) to SYNTHESIZE the signals into ranked leads
     → uses Tiago's Claude.AI subscription, not the API (no per-token cost). No tools = fast.
  5. Post the briefing to a Discord webhook (split into <2000 char chunks)

Env vars:
  PERPLEXITY_API_KEY         — for signal collection (same key reddit-intel uses)
  SCOUT_DISCORD_WEBHOOK_URL  — where to post (separate channel from ATLAS)
  CLAUDE_CODE_OAUTH_TOKEN    — required in CI only (generate with `claude setup-token`)
                               Locally, `claude` is already authed via interactive login.

Usage:
  python scripts/scout_briefing.py              # full run (signals + Claude + post)
  python scripts/scout_briefing.py --dry-run    # signals + synthesis, print, don't post
  python scripts/scout_briefing.py --no-claude  # collect + print raw signals only, no AI
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
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[1]
PPLX_SCRIPT = REPO_ROOT / ".claude" / "skills" / "reddit-intel" / "scripts" / "perplexity_search.py"
HISTORY_PATH = REPO_ROOT / "data" / "scout_history.json"
HISTORY_INJECT = 150   # how many recent past ideas to feed the model as "do not repeat"
HISTORY_CAP = 400      # max entries kept on disk

try:
    import yaml
except ImportError:
    sys.exit("ERROR: pyyaml not installed. Run: pip install pyyaml")


# ---------------------------------------------------------------------------
# Config + theme rotation
# ---------------------------------------------------------------------------

def load_radar(path: Path) -> dict:
    if not path.exists():
        sys.exit(f"ERROR: scout radar config not found at {path}")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def pick_themes(radar: dict, n: int = 3) -> list[str]:
    """Rotate through the theme list using the day-of-year so each day differs."""
    themes = [t.get("label", "") for t in radar.get("themes", []) if t.get("label")]
    if not themes:
        return []
    if len(themes) <= n:
        return themes
    day = datetime.now(timezone.utc).timetuple().tm_yday  # 1..366
    start = (day * n) % len(themes)
    return [themes[(start + i) % len(themes)] for i in range(n)]


def format_profile(radar: dict) -> str:
    p = radar.get("profile", {})
    return (
        f"- Base: {p.get('location', 'Lisboa / EU')}\n"
        f"- Capital de arranque máx: ~€{p.get('max_startup_cost_eur', 2000)}\n"
        f"- Tempo: ~{p.get('hours_per_week', 10)}h/semana (side job, não larga o trabalho atual)\n"
        f"- Edge: {p.get('edge', 'automação n8n / AI, dev')}"
    )


# ---------------------------------------------------------------------------
# Idea history (anti-repetition across days)
# ---------------------------------------------------------------------------

def load_history() -> list[dict]:
    """Past ideas already proposed: [{date, name}, ...]. Empty list if none/unreadable."""
    if not HISTORY_PATH.exists():
        return []
    try:
        data = json.loads(HISTORY_PATH.read_text(encoding="utf-8"))
        return data.get("ideas", []) if isinstance(data, dict) else []
    except (json.JSONDecodeError, OSError):
        return []


def format_exclusions(history: list[dict]) -> str:
    """Recent past idea names as a bullet list to feed the model as a do-not-repeat set."""
    names = [h.get("name", "").strip() for h in history if h.get("name")]
    names = names[-HISTORY_INJECT:]
    if not names:
        return "(nenhuma ainda — primeira edição)"
    return "\n".join(f"- {n}" for n in names)


def extract_lead_names(briefing: str) -> list[str]:
    """Pull lead names from the synthesized markdown. Robust to formatting drift:
    matches 'LEAD 1 — Nome', '## Lead 1 — **Nome** — tagline', etc. (case-insensitive)."""
    names = []
    for m in re.finditer(r"(?im)lead\s*\d+\s*[—\-–:]\s*(.+)$", briefing):
        seg = m.group(1).strip()
        bold = re.search(r"\*\*(.+?)\*\*", seg)
        name = bold.group(1) if bold else re.split(r"\*\*|\s[—\-–]\s", seg)[0]
        name = re.sub(r"[*_`#⭐🥇🥈🥉]", "", name)
        name = re.split(r"score\s*[:=]", name, flags=re.I)[0]
        name = name.strip(" :-—–")
        if name:
            names.append(name)
    return names


def save_history(history: list[dict], new_names: list[str]) -> None:
    today = datetime.now(timezone.utc).date().isoformat()
    for n in new_names:
        history.append({"date": today, "name": n})
    history = history[-HISTORY_CAP:]
    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    HISTORY_PATH.write_text(
        json.dumps({"ideas": history}, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# Signal collection (Perplexity) — the "fetch real data first" step
# ---------------------------------------------------------------------------

def run_perplexity(query: str) -> dict:
    """Call the reddit-intel Perplexity script; return {text, citations} or {error}."""
    if not PPLX_SCRIPT.exists():
        return {"error": f"perplexity script not found at {PPLX_SCRIPT}"}
    try:
        result = subprocess.run(
            [sys.executable, str(PPLX_SCRIPT), query],
            capture_output=True, text=True, timeout=60, encoding="utf-8", errors="replace",
        )
    except subprocess.TimeoutExpired:
        return {"error": "perplexity timed out"}
    out = (result.stdout or "").strip()
    if not out:
        return {"error": (result.stderr or "no output")[:200]}
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return {"error": out[:200]}


def collect_signals(themes: list[str]) -> str:
    """For each theme, gather demand signals (pain points + traction) with citations."""
    if not os.environ.get("PERPLEXITY_API_KEY"):
        sys.exit("ERROR: PERPLEXITY_API_KEY not set (needed to collect signals). Use --dry-run after setting it.")

    blocks = []
    total = len(themes) * 2
    i = 0
    for theme in themes:
        queries = [
            f"reddit {theme}: biggest pain points and frustrations people complain about and "
            f"would pay to solve, 2025 2026, Portugal and Europe — be specific with examples",
            f"{theme}: emerging low-capital side business and micro-SaaS opportunities with real, "
            f"proven demand and paying customers in 2026 — cite indie hackers / product hunt / "
            f"starter story examples and typical pricing",
        ]
        block = [f"## Sinais — {theme}"]
        for q in queries:
            i += 1
            print(f"[1/3] Collecting signal {i}/{total}: {theme[:30]}...", file=sys.stderr)
            res = run_perplexity(q)
            if res.get("error"):
                block.append(f"\n⚠️ (sinal falhou: {res['error']})")
                continue
            block.append(f"\n{res.get('text', '').strip()}")
            cites = res.get("citations") or []
            if cites:
                block.append("Fontes: " + " · ".join(cites[:6]))
        blocks.append("\n".join(block))
    return "\n\n".join(blocks)


# ---------------------------------------------------------------------------
# Claude synthesis (no tools — pure synthesis of the collected signals)
# ---------------------------------------------------------------------------

SCOUT_SYSTEM_PROMPT = """Tu és o SCOUT — caçador de oportunidades de negócio do Tiago, freelancer em Lisboa.

MODO: Briefing DIÁRIO de oportunidades (de manhã) entregue no Discord. O objetivo é dar ao Tiago EXATAMENTE 3 ideias de negócio que possa começar como SIDE JOB, baseadas em DOR REAL e procura verificável — nunca ideias inventadas.

INPUT: recebes SINAIS já recolhidos (via Perplexity) — resumos de dor real, tração e exemplos, COM fontes/URLs. NÃO uses ferramentas. NÃO inventes. Sintetiza APENAS a partir destes sinais e cita as fontes dadas. Se um sinal vier marcado como falhado, ignora-o.

COMO PENSAS: indie hacker (caça nichos onde já há dinheiro a circular) + analista cético (valida antes de entusiasmar) + operador pragmático (pergunta sempre "qual é o primeiro euro e quando entra?").

SCORING: pontua cada lead 1-5 em: Demand evidence · Startup cost (invertido, barato pontua mais) · Time-to-first-€ · Competition gap · Tiago-fit (alavanca n8n/AI/dev? cabe em poucas horas/semana? Lisboa/EU?). Dá nota final (média). Sê honesto — lead atraente com fit baixo deve dizê-lo. Marca ⚠️ qualquer eixo sem evidência nos sinais.

FORMATO (markdown para Discord — SEM H1/H2 #/##, usa **bold** e bullets):

**🔭 SCOUT Daily** — leads de hoje

Para cada lead (EXATAMENTE 3, ranqueados por score):
**LEAD N — [nome curto]** ⭐ X.X/5
• O quê: [oferta em 1 frase]
• A dor: "[citação/observação real dos sinais]" — [fonte]
• Quem paga: [cliente] · ~[€]
• Arranque: [€ e o quê] · Primeiro euro: [quão depressa]
• Gap: [o que os incumbentes fazem mal]
• Scores: Demand X · Cost X · Time X · Gap X · Fit X
• Próximo passo: [1 ação barata para validar hoje/esta semana]

REGRAS:
- Português de Portugal, casual e direto. Sem paredes de texto — o Tiago anda depressa.
- EXATAMENTE 3 leads. Nem mais, nem menos.
- NUNCA repitas ideias já propostas (recebes uma lista "IDEIAS JÁ PROPOSTAS"). Se um sinal só sugere algo já dado, ataca um segmento/ângulo claramente diferente ou descarta. As 3 ideias têm de ser novas e distintas entre si.
- Output até ~4000 caracteres (pode ocupar 2 mensagens no Discord).
- Dor antes de ideia. Concorrência valida o mercado; o gap é a oportunidade.
- Quando dois leads empatam, favorece o que alavanca o edge (n8n/AI/dev).
- Última linha sempre: "_Leads para validar, não conselhos — confirma antes de investir tempo/dinheiro._"

OUTPUT: APENAS o briefing markdown final, nada mais. Zero preamble."""


def _find_claude_cli() -> str:
    """Locate the `claude` executable (PATH → VSCode bundled binary → ~/.claude/local)."""
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


def call_claude(signals_str: str, profile_str: str, themes: list[str], exclusions_str: str) -> str:
    """Invoke `claude -p` headless for synthesis only (no tools). Subscription auth, no API cost."""
    claude_bin = _find_claude_cli()
    print(f"[2/3] Synthesizing with Claude Code headless: {claude_bin}", file=sys.stderr)

    themes_block = "\n".join(f"- {t}" for t in themes)
    user_msg = f"""Hoje é {datetime.now(timezone.utc).strftime('%A, %d de %B de %Y')}.

PERFIL DO TIAGO (para filtrar viabilidade e fit):
{profile_str}

TEMAS DE HOJE:
{themes_block}

IDEIAS JÁ PROPOSTAS ANTES (NÃO repitas nenhuma destas — traz 3 ideias novas e distintas):
{exclusions_str}

SINAIS RECOLHIDOS (dor real + tração, com fontes — sintetiza só a partir destes):
{signals_str}

Gera o briefing SCOUT seguindo a estrutura definida. EXATAMENTE 3 leads NOVOS (nenhum repetido da lista acima), ranqueados por score, citando as fontes dos sinais."""

    # Synthesis only. Disable all MCP servers so CLI startup is fast (loading local MCP
    # servers can add minutes; CI has none but this keeps both paths quick). No --allowedTools
    # flag: the prompt instructs synthesis-only, and an empty allowedTools value yields empty output.
    cmd = [
        claude_bin,
        "-p",
        "--append-system-prompt", SCOUT_SYSTEM_PROMPT,
        "--output-format", "text",
        "--strict-mcp-config",
        "--mcp-config", '{"mcpServers": {}}',
        "--dangerously-skip-permissions",
    ]

    try:
        result = subprocess.run(
            cmd,
            input=user_msg,
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
    print(f"[3/3] Posting {len(chunks)} message(s) to Discord...", file=sys.stderr)
    for i, chunk in enumerate(chunks):
        payload = json.dumps({"content": chunk}).encode("utf-8")
        req = Request(
            webhook,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "scout-briefing/1.0 (https://github.com/, Python urllib)",
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
    parser = argparse.ArgumentParser(description="SCOUT daily opportunity briefing")
    parser.add_argument("--dry-run", action="store_true", help="Collect + synthesize, print to stdout, don't post to Discord")
    parser.add_argument("--no-claude", action="store_true", help="Collect signals and print them raw, skip Claude synthesis")
    parser.add_argument("--radar", type=str, default=str(REPO_ROOT / "data" / "scout_radar.yaml"))
    args = parser.parse_args()

    radar = load_radar(Path(args.radar))
    themes = pick_themes(radar)
    profile_str = format_profile(radar)
    history = load_history()
    print(f"Themes today: {', '.join(themes)} | {len(history)} past ideas to avoid", file=sys.stderr)

    signals_str = collect_signals(themes)

    if args.no_claude:
        briefing = (
            f"# SCOUT raw signals — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n\n"
            f"## Perfil\n{profile_str}\n\n{signals_str}"
        )
    else:
        briefing = call_claude(signals_str, profile_str, themes, format_exclusions(history))

    header = f"**🔭 SCOUT Daily** · {datetime.now(timezone.utc).strftime('%A, %d %b %Y')}\n\n"
    full = header + briefing

    if args.dry_run:
        print("\n========== SCOUT BRIEFING ==========\n")
        print(full)
        print("\n========== END ==========\n")
        return

    webhook = os.environ.get("SCOUT_DISCORD_WEBHOOK_URL")
    if not webhook:
        sys.exit("ERROR: SCOUT_DISCORD_WEBHOOK_URL not set (use --dry-run to skip posting)")

    post_to_discord(webhook, full)

    # Log the ideas we just delivered so future days don't repeat them.
    new_names = extract_lead_names(briefing)
    save_history(history, new_names)
    print(f"Done. Logged {len(new_names)} new idea(s) to history.", file=sys.stderr)


if __name__ == "__main__":
    main()
