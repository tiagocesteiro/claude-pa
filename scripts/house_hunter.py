#!/usr/bin/env python3
"""
house_hunter — hourly Portuguese real-estate alert bot for Tiago.

Watches PT property portals for NEW listings matching filters defined in
data/house_radar.yaml, runs each new listing through an AI validation agent
that reads the full description (to catch things the site filters can't — e.g.
"arrendada a inquilinos", "sem licença de utilização"), and posts the ones that
pass to a Discord webhook.

Pipeline (per run, hourly):
  1. Load data/house_radar.yaml (active searches).
  2. For each search × portal: build the portal's search URL from the filters,
     scrape it via the firecrawl CLI (structured JSON extraction → listing cards).
  3. Dedup against data/house_state.json → keep only genuinely new listing IDs.
  4. Validation agent: fetch each new listing's page, read the description, pass it
     + the search's reject_if rules to `claude -p` headless → keep | reject + reason.
     (Uses Tiago's Claude Max subscription — no API cost. Fail-open on model error.)
  5. Post approved listings to Discord (embed: photo, price, location, link).
  6. Persist verdicts to house_state.json (rejected are cached, never re-checked).

Env vars:
  FIRECRAWL_API_KEY          — firecrawl scraping (or `firecrawl login` stored auth)
  HOUSE_DISCORD_WEBHOOK_URL  — where approved listings are posted
  CLAUDE_CODE_OAUTH_TOKEN    — required in CI only (generate with `claude setup-token`);
                               locally `claude` is already authed via interactive login.

Usage:
  python scripts/house_hunter.py                 # full run (scrape + validate + post)
  python scripts/house_hunter.py --dry-run       # scrape + validate, print, don't post
  python scripts/house_hunter.py --search "T2/T3 Lisboa compra até 300k"   # one search
  python scripts/house_hunter.py --no-validate   # skip the AI validation agent
  python scripts/house_hunter.py --print-urls    # just print the built search URLs and exit
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
from datetime import datetime, timezone, timedelta
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
RADAR_PATH = REPO_ROOT / "data" / "house_radar.yaml"
STATE_PATH = REPO_ROOT / "data" / "house_state.json"

SUPPORTED_PORTALS = {"custojusto", "casasapo", "imovirtual", "idealista"}


# ---------------------------------------------------------------------------
# Date extraction from listing descriptions
# ---------------------------------------------------------------------------

def extract_dates(description: str) -> dict:
    """Extract publication and update dates from listing description.

    Handles Portuguese date formats:
    - "Publicado há 2 dias" → 2 days ago
    - "Atualizado em 4 de agosto" → Aug 4 (current year)
    - "Publicado: 2026-08-04" → exact ISO
    - "há X dias", "há X horas", "ontem", "hoje"

    Returns: {"published_date": "YYYY-MM-DD" or None, "updated_date": "YYYY-MM-DD" or None}
    """
    description = (description or "").lower()
    result = {"published_date": None, "updated_date": None}

    # Helper to determine if a position in text is preceded by "publicado" or "atualizado"
    def get_date_type(text: str, pos: int, lookback: int = 100) -> str | None:
        """Determine if a date at position pos is for published or updated."""
        start = max(0, pos - lookback)
        context = text[start:pos]
        if "atualizado" in context:
            return "updated_date"
        if "publicado" in context:
            return "published_date"
        return None

    # ISO dates: 2026-08-04
    iso_pattern = r"(\d{4})-(\d{2})-(\d{2})"
    for match in re.finditer(iso_pattern, description):
        date_str = f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
        date_type = get_date_type(description, match.start())
        # Try to assign to the appropriate slot
        if date_type == "updated_date":
            if not result["updated_date"]:
                result["updated_date"] = date_str
        elif date_type == "published_date":
            if not result["published_date"]:
                result["published_date"] = date_str
        else:
            # No context, use first/second rule
            if not result["published_date"]:
                result["published_date"] = date_str
            elif not result["updated_date"]:
                result["updated_date"] = date_str

    # Relative dates: "há X dias", "há X horas"
    relative_pattern = r"há\s+(\d+)\s+(dias?|horas?)"
    for match in re.finditer(relative_pattern, description):
        num = int(match.group(1))
        unit = match.group(2)
        if "dia" in unit:
            date = (datetime.now(timezone.utc) - timedelta(days=num)).strftime("%Y-%m-%d")
        elif "hora" in unit:
            date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        else:
            continue
        date_type = get_date_type(description, match.start())
        # Try to assign to the appropriate slot
        if date_type == "updated_date":
            if not result["updated_date"]:
                result["updated_date"] = date
        elif date_type == "published_date":
            if not result["published_date"]:
                result["published_date"] = date
        else:
            # No context, use first/second rule
            if not result["published_date"]:
                result["published_date"] = date
            elif not result["updated_date"]:
                result["updated_date"] = date

    # Special cases: "ontem", "hoje"
    if "hoje" in description and not result["published_date"]:
        result["published_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if "ontem" in description and not result["updated_date"]:
        result["updated_date"] = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

    # Portuguese month names: "4 de agosto de 2026" → 2026-08-04
    months_pt = {
        "janeiro": "01", "fevereiro": "02", "março": "03", "abril": "04",
        "maio": "05", "junho": "06", "julho": "07", "agosto": "08",
        "setembro": "09", "outubro": "10", "novembro": "11", "dezembro": "12",
    }
    month_pattern = r"(\d{1,2})\s+de\s+(" + "|".join(months_pt.keys()) + r")\s+(?:de\s+)?(\d{4})?"
    for match in re.finditer(month_pattern, description):
        day = match.group(1).zfill(2)
        month = months_pt[match.group(2)]
        year = match.group(3) if match.group(3) else str(datetime.now(timezone.utc).year)
        date_str = f"{year}-{month}-{day}"
        date_type = get_date_type(description, match.start())
        # Try to assign to the appropriate slot
        if date_type == "updated_date":
            if not result["updated_date"]:
                result["updated_date"] = date_str
        elif date_type == "published_date":
            if not result["published_date"]:
                result["published_date"] = date_str
        else:
            # No context, use first/second rule
            if not result["published_date"]:
                result["published_date"] = date_str
            elif not result["updated_date"]:
                result["updated_date"] = date_str

    return result


def is_recent_listing(listing: dict, days: int = 3) -> bool:
    """Check if a listing was published or updated within the last N days.

    Args:
        listing: dict with "published_date" and "updated_date" fields (YYYY-MM-DD or None)
        days: number of days to consider "recent" (default 3)

    Returns:
        True if listing is recent or has no date info, False otherwise
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_date = cutoff.date()

    pub_date_str = listing.get("published_date")
    upd_date_str = listing.get("updated_date")

    # If either date exists and is recent, consider it recent
    if pub_date_str:
        try:
            pub_date = datetime.strptime(pub_date_str, "%Y-%m-%d").date()
            if pub_date >= cutoff_date:
                return True
        except ValueError:
            pass  # Invalid date format, ignore

    if upd_date_str:
        try:
            upd_date = datetime.strptime(upd_date_str, "%Y-%m-%d").date()
            if upd_date >= cutoff_date:
                return True
        except ValueError:
            pass  # Invalid date format, ignore

    # If no dates or both dates are old, include anyway (benign default)
    if not pub_date_str and not upd_date_str:
        return True

    return False


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

def load_radar(path: Path = RADAR_PATH) -> dict:
    if not path.exists():
        sys.exit(f"ERROR: house radar config not found at {path}")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def active_searches(radar: dict, only: str | None = None) -> list[dict]:
    searches = [s for s in radar.get("searches", []) if s.get("active", True)]
    if only:
        searches = [s for s in searches if s.get("name") == only]
        if not searches:
            sys.exit(f"ERROR: no active search named {only!r}")
    return searches


# ---------------------------------------------------------------------------
# URL builders (filters → portal search URL)
# ---------------------------------------------------------------------------
# Each portal uses its own zone slugs and query params. We keep a small location
# map and grow it as needed. A search may set an explicit `url` to override the
# builder for a portal we haven't mapped yet.

LOCATION_SLUGS = {
    "custojusto": {
        "lisboa": "lisboa",
        "porto": "porto",
        "cascais": "lisboa/cascais",
        "sintra": "lisboa/sintra",
        "oeiras": "lisboa/oeiras",
        "almada": "setubal/almada",
    },
    "casasapo": {
        "lisboa": "lisboa",
        "porto": "porto",
        "cascais": "lisboa/cascais",
        "sintra": "lisboa/sintra",
        "oeiras": "lisboa/oeiras",
        "almada": "setubal/almada",
    },
}

# Typology (T0..T5) → number of bedrooms, for portals that filter by rooms.
_TYPOLOGY_RE = re.compile(r"T(\d+)", re.I)


def _bedroom_numbers(typology: list[str] | None) -> list[int]:
    nums = []
    for t in typology or []:
        m = _TYPOLOGY_RE.search(str(t))
        if m:
            nums.append(int(m.group(1)))
    return sorted(set(nums))


def _location_slug(portal: str, location: str) -> str:
    slug = LOCATION_SLUGS.get(portal, {}).get((location or "").strip().lower())
    if slug:
        return slug
    # Fallback: naive slugify (lowercase, spaces→dashes). Verify per portal.
    return re.sub(r"\s+", "-", (location or "").strip().lower())


def build_url_custojusto(search: dict) -> str:
    """Custojusto (OLX PT) real-estate search URL.

    Path pattern: /<location>/<category>?<filters>
    NOTE: verify against a live page once FIRECRAWL_API_KEY is set — portal URL
    schemes drift. A search can set `url:` to override this builder.
    """
    op = search.get("operation", "comprar")
    ptype = search.get("property_type", "apartamento")
    category = {
        ("comprar", "apartamento"): "comprar-apartamentos",
        ("comprar", "moradia"): "comprar-moradias",
        ("comprar", "terreno"): "comprar-terrenos",
        ("arrendar", "apartamento"): "arrendar-apartamentos",
        ("arrendar", "moradia"): "arrendar-moradias",
        ("arrendar", "terreno"): "arrendar-terrenos",
    }.get((op, ptype), "comprar-apartamentos")

    loc = _location_slug("custojusto", search.get("location", ""))
    params: dict[str, str] = {}
    if search.get("price_min"):
        params["ps"] = str(search["price_min"])
    if search.get("price_max"):
        params["pe"] = str(search["price_max"])
    rooms = _bedroom_numbers(search.get("typology"))
    if rooms:
        params["rooms_min"] = str(min(rooms))
        params["rooms_max"] = str(max(rooms))
    if search.get("area_min"):
        params["size_min"] = str(search["area_min"])

    base = f"https://www.custojusto.pt/{loc}/{category}"
    return f"{base}?{urlencode(params)}" if params else base


def build_url_casasapo(search: dict) -> str:
    """Casa Sapo search URL (agency listings). Verify live; overridable via `url:`."""
    op = "arrendamento" if search.get("operation") == "arrendar" else "venda"
    ptype = {"apartamento": "apartamentos", "moradia": "moradias",
             "terreno": "terrenos"}.get(search.get("property_type", "apartamento"), "apartamentos")
    loc = _location_slug("casasapo", search.get("location", ""))
    params: dict[str, str] = {}
    if search.get("price_max"):
        params["pn"] = str(search["price_max"])
    if search.get("price_min"):
        params["pi"] = str(search["price_min"])
    if search.get("area_min"):
        params["ai"] = str(search["area_min"])
    base = f"https://casa.sapo.pt/{op}/{ptype}/{loc}/"
    return f"{base}?{urlencode(params)}" if params else base


PORTAL_BUILDERS = {
    "custojusto": build_url_custojusto,
    "casasapo": build_url_casasapo,
}


def build_search_url(portal: str, search: dict) -> str | None:
    """Return the search URL for a portal, honoring an explicit per-search override."""
    override = search.get("url")
    if override and isinstance(override, str) and portal in override:
        return override
    builder = PORTAL_BUILDERS.get(portal)
    if not builder:
        print(f"  ! portal {portal!r} not implemented yet — skipping", file=sys.stderr)
        return None
    return builder(search)


# ---------------------------------------------------------------------------
# Firecrawl scraping (HTTP API — cross-platform, no CLI/shell dependency)
# ---------------------------------------------------------------------------

FIRECRAWL_API = "https://api.firecrawl.dev/v1/scrape"

LISTINGS_PROMPT = (
    "Extract EVERY property listing card shown on this real-estate search results page. "
    "Return only real listings — no ads, banners, or navigation."
)

# JSON schema Firecrawl fills for the listings extraction.
LISTINGS_SCHEMA = {
    "type": "object",
    "properties": {
        "listings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "absolute URL of the listing page"},
                    "title": {"type": "string"},
                    "price_eur": {"type": ["integer", "null"], "description": "price in euros"},
                    "location": {"type": "string"},
                    "typology": {"type": "string", "description": "e.g. T2, T3"},
                    "area_m2": {"type": ["integer", "null"]},
                    "image": {"type": ["string", "null"], "description": "absolute image URL"},
                },
                "required": ["url"],
            },
        }
    },
    "required": ["listings"],
}


def _firecrawl_scrape(url: str, formats: list, timeout: int = 120,
                      only_main: bool = False, wait_ms: int = 2500) -> dict:
    """POST to the Firecrawl scrape API; return the `data` object. Raises RuntimeError."""
    key = os.environ.get("FIRECRAWL_API_KEY")
    if not key:
        raise RuntimeError("FIRECRAWL_API_KEY not set")
    body: dict = {
        "url": url,
        "formats": formats,
        "location": {"country": "PT"},
        "waitFor": wait_ms,
    }
    if only_main:
        body["onlyMainContent"] = True
    payload = json.dumps(body).encode("utf-8")
    req = Request(
        FIRECRAWL_API, data=payload,
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {key}",
                 "User-Agent": "house-hunter/1.0"},
    )
    try:
        with urlopen(req, timeout=timeout) as resp:
            doc = json.loads(resp.read().decode("utf-8", "replace"))
    except HTTPError as e:
        raise RuntimeError(f"firecrawl HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:200]}")
    except URLError as e:
        raise RuntimeError(f"firecrawl network: {e.reason}")
    if not doc.get("success", True):
        raise RuntimeError(f"firecrawl error: {str(doc.get('error'))[:200]}")
    return doc.get("data", {}) or {}


def scrape_listings(url: str) -> list[dict]:
    """Scrape a search results page → normalized listing dicts with dates."""
    formats = [{"type": "json", "prompt": LISTINGS_PROMPT, "schema": LISTINGS_SCHEMA}]
    data = _firecrawl_scrape(url, formats)
    extracted = data.get("json") or {}
    items = extracted.get("listings") if isinstance(extracted, dict) else None
    if not isinstance(items, list):
        return []
    out = []
    for it in items:
        if not isinstance(it, dict):
            continue
        listing_url = (it.get("url") or "").strip()
        if not listing_url:
            continue

        # Extract dates from card text (title + location) — Firecrawl can catch
        # some dates in card text; refined again against the full description
        # during validation (see process_search()).
        combined_text = (it.get("title", "") + " " + it.get("location", "")).lower()
        dates = extract_dates(combined_text)

        out.append({
            "id": listing_url.split("?")[0].rstrip("/"),
            "url": listing_url,
            "title": (it.get("title") or "").strip(),
            "price_eur": it.get("price_eur"),
            "location": (it.get("location") or "").strip(),
            "typology": (it.get("typology") or "").strip(),
            "area_m2": it.get("area_m2"),
            "image": (it.get("image") or "").strip() or None,
            "published_date": dates.get("published_date"),
            "updated_date": dates.get("updated_date"),
        })
    return out


def scrape_description(url: str) -> str:
    """Fetch a single listing page as markdown for the validation agent."""
    data = _firecrawl_scrape(url, ["markdown"], timeout=90, only_main=True, wait_ms=2000)
    return (data.get("markdown") or "")[:6000]  # keep the validation prompt lean


# ---------------------------------------------------------------------------
# State (dedup + verdict cache)
# ---------------------------------------------------------------------------
# Shape: { "<search name>": { "<listing id>": {verdict, motivo, first_seen} } }

def load_state() -> dict:
    if not STATE_PATH.exists():
        return {}
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# Validation agent (claude -p headless — subscription auth, no API cost)
# ---------------------------------------------------------------------------

HOUSE_VALIDATOR_PROMPT = """Tu és o validador de anúncios de imóveis do Tiago.

Recebes (1) a DESCRIÇÃO de um anúncio de imóvel e (2) uma lista de REGRAS DE EXCLUSÃO.
A tua tarefa: decidir se o anúncio deve ser REJEITADO por bater em pelo menos uma regra.

REGRAS DE DECISÃO:
- Se a descrição indica, explícita ou claramente implícita, que o imóvel corresponde a QUALQUER
  uma das regras de exclusão → verdict "rejeitar".
- Se nada na descrição sugere nenhuma das regras → verdict "manter".
- Na dúvida genuína (descrição vaga, sem sinais), preferir "manter" (o Tiago prefere ver a mais
  do que perder uma boa casa). Só rejeitar com base em evidência no texto.

RESPONDE APENAS com um objeto JSON numa linha, exatamente com estas chaves e estes valores
(sem parafrasear): a chave "verdict" com valor "manter" OU "rejeitar", e a chave "motivo".
Exemplo exato do formato: {"verdict": "rejeitar", "motivo": "arrendada a inquilinos"}
Se manter, deixa "motivo" vazio ou uma nota breve. Não uses outras chaves nem outras palavras."""


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
    sys.exit("ERROR: `claude` CLI not found. Install: npm install -g @anthropic-ai/claude-code")


_REJECT_WORDS = ("rejeitar", "rejeita", "excluir", "exclui", "reject", "exclude",
                 "descartar", "descarta")
_KEEP_WORDS = ("manter", "mantem", "keep", "aceitar", "aceita", "incluir", "inclui")
_VERDICT_KEYS = ("verdict", "veredicto", "veredito", "decisao", "decisão", "decision",
                 "resultado")
_MOTIVO_KEYS = ("motivo", "motive", "razao", "razão", "reason", "justificacao", "justificação")


def _normalize_verdict(value: str) -> str | None:
    v = str(value).strip().lower()
    if any(w in v for w in _REJECT_WORDS):
        return "rejeitar"
    if any(w in v for w in _KEEP_WORDS):
        return "manter"
    return None


def _parse_verdict(text: str) -> dict:
    """Extract {verdict, motivo} from the model output — tolerant to key/value drift.

    Models paraphrase (e.g. {"decisao":"excluir"} instead of {"verdict":"rejeitar"}),
    so we match on synonym sets rather than exact keys/values."""
    text = (text or "").strip()
    m = re.search(r"\{.*\}", text, re.S)
    if m:
        try:
            obj = {str(k).lower(): v for k, v in json.loads(m.group(0)).items()}
            verdict = None
            for k in _VERDICT_KEYS:
                if k in obj:
                    verdict = _normalize_verdict(obj[k])
                    if verdict:
                        break
            motivo = ""
            for k in _MOTIVO_KEYS:
                if obj.get(k):
                    motivo = str(obj[k]).strip()
                    break
            if verdict:
                return {"verdict": verdict, "motivo": motivo}
        except (json.JSONDecodeError, AttributeError):
            pass
    # Fallback: scan the free text for a reject signal.
    if _normalize_verdict(text) == "rejeitar":
        return {"verdict": "rejeitar", "motivo": text[:160]}
    return {"verdict": "manter", "motivo": "validação inconclusiva (parsing)"}


def validate_listing(description: str, reject_if: list[str]) -> dict:
    """Run the validation agent. Fail-open: on any error → keep, flagged inconclusive."""
    if not reject_if:
        return {"verdict": "manter", "motivo": ""}
    rules = "\n".join(f"- {r}" for r in reject_if)
    user_msg = (
        f"REGRAS DE EXCLUSÃO:\n{rules}\n\n"
        f"DESCRIÇÃO DO ANÚNCIO:\n{description}\n\n"
        "Decide e responde só com o JSON."
    )
    cmd = [
        _find_claude_cli(), "-p",
        "--append-system-prompt", HOUSE_VALIDATOR_PROMPT,
        "--output-format", "text",
        "--strict-mcp-config",
        "--mcp-config", '{"mcpServers": {}}',
        "--dangerously-skip-permissions",
    ]
    try:
        res = subprocess.run(
            cmd, input=user_msg, capture_output=True, text=True,
            timeout=120, encoding="utf-8", errors="replace",
        )
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        return {"verdict": "manter", "motivo": f"validação inconclusiva ({type(e).__name__})"}
    if res.returncode != 0:
        return {"verdict": "manter", "motivo": "validação inconclusiva (claude erro)"}
    return _parse_verdict(res.stdout)


# ---------------------------------------------------------------------------
# Discord
# ---------------------------------------------------------------------------

def _price_str(price) -> str:
    if isinstance(price, (int, float)) and price > 0:
        return f"{int(price):,}".replace(",", ".") + " €"
    return "preço n/d"


def build_embed(listing: dict, search_name: str, note: str = "") -> dict:
    bits = [listing.get("typology"), listing.get("location")]
    if listing.get("area_m2"):
        bits.append(f"{listing['area_m2']} m²")
    subtitle = " · ".join(b for b in bits if b)
    desc = f"**{_price_str(listing.get('price_eur'))}**"
    if subtitle:
        desc += f"\n{subtitle}"
    if note:
        desc += f"\n\n_⚠️ {note}_"
    embed = {
        "title": (listing.get("title") or "Anúncio")[:250],
        "url": listing.get("url"),
        "description": desc[:400],
        "footer": {"text": f"🏠 {search_name}"},
    }
    if listing.get("image"):
        embed["image"] = {"url": listing["image"]}
    return embed


def post_to_discord(webhook: str, embeds: list[dict]) -> None:
    """Post embeds to Discord (max 10 per message)."""
    for i in range(0, len(embeds), 10):
        batch = embeds[i:i + 10]
        payload = json.dumps({"embeds": batch}).encode("utf-8")
        req = Request(
            webhook, data=payload,
            headers={"Content-Type": "application/json",
                     "User-Agent": "house-hunter/1.0 (Python urllib)"},
        )
        try:
            with urlopen(req, timeout=30) as resp:
                if resp.status not in (200, 204):
                    print(f"WARN: Discord returned {resp.status}", file=sys.stderr)
        except HTTPError as e:
            sys.exit(f"ERROR: Discord webhook HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:200]}")
        except URLError as e:
            sys.exit(f"ERROR: Discord webhook network: {e.reason}")
        if i + 10 < len(embeds):
            time.sleep(1.0)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def process_search(search: dict, state: dict, args, settings: dict) -> list[dict]:
    """Scrape + dedup + validate one search. Returns embeds for approved new listings."""
    name = search.get("name", "sem-nome")
    seen = state.setdefault(name, {})
    max_new = int(settings.get("max_new_per_run", 15))
    do_validate = settings.get("validate", True) and not args.no_validate
    approved_embeds: list[dict] = []

    for portal in search.get("portals", []):
        if portal not in SUPPORTED_PORTALS:
            print(f"  ! unknown portal {portal!r} in {name!r} — skipping", file=sys.stderr)
            continue
        url = build_search_url(portal, search)
        if not url:
            continue
        print(f"  [{portal}] {url}", file=sys.stderr)
        if args.print_urls:
            continue
        try:
            listings = scrape_listings(url)
        except RuntimeError as e:
            print(f"  ! scrape failed ({portal}): {e}", file=sys.stderr)
            continue

        new = [l for l in listings if l["id"] not in seen]
        print(f"    {len(listings)} listings, {len(new)} new", file=sys.stderr)

        # Filter: keep only recent listings (≤3 days old)
        new = [l for l in new if is_recent_listing(l, days=3)]
        print(f"    {len(new)} recent listings", file=sys.stderr)

        if len(new) > max_new:
            print(f"    capping to {max_new} (anti-spam)", file=sys.stderr)
            new = new[:max_new]

        for listing in new:
            verdict = {"verdict": "manter", "motivo": ""}
            if do_validate and search.get("reject_if"):
                try:
                    desc = scrape_description(listing["url"])
                    # Extract more precise dates from full description
                    dates = extract_dates(desc)
                    listing["published_date"] = listing.get("published_date") or dates.get("published_date")
                    listing["updated_date"] = listing.get("updated_date") or dates.get("updated_date")

                    verdict = validate_listing(desc, search["reject_if"])
                except RuntimeError as e:
                    verdict = {"verdict": "manter", "motivo": f"descrição inacessível ({e})"[:120]}
            seen[listing["id"]] = {
                "verdict": verdict["verdict"],
                "motivo": verdict.get("motivo", ""),
                "user_feedback": "pending",  # for feedback loop
                "published_date": listing.get("published_date"),
                "updated_date": listing.get("updated_date"),
                "first_seen": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "last_feedback": None,  # when user last approved/rejected
                "title": listing.get("title", ""),
                "url": listing["url"],
            }
            tag = "✅" if verdict["verdict"] == "manter" else "🚫"
            date_bits = []
            if listing.get("published_date"):
                date_bits.append(f"pub:{listing['published_date']}")
            if listing.get("updated_date"):
                date_bits.append(f"upd:{listing['updated_date']}")
            trailer_bits = date_bits + ([verdict["motivo"]] if verdict.get("motivo") else [])
            line = f"    {tag} {listing.get('title','')[:60]}"
            if trailer_bits:
                line += " — " + " ".join(trailer_bits)
            print(line, file=sys.stderr)
            if verdict["verdict"] == "manter":
                note = verdict.get("motivo", "") if "inconclusiva" in verdict.get("motivo", "") else ""
                approved_embeds.append(build_embed(listing, name, note))

    return approved_embeds


def main() -> None:
    parser = argparse.ArgumentParser(description="Hourly PT real-estate alert bot")
    parser.add_argument("--dry-run", action="store_true",
                        help="Scrape + validate, print results, don't post to Discord")
    parser.add_argument("--search", metavar="NAME", help="Run only the search with this name")
    parser.add_argument("--no-validate", action="store_true", help="Skip the AI validation agent")
    parser.add_argument("--print-urls", action="store_true",
                        help="Print the built search URLs and exit (no scraping)")
    args = parser.parse_args()

    radar = load_radar()
    settings = radar.get("settings", {}) or {}
    searches = active_searches(radar, args.search)
    if not searches:
        print("No active searches.", file=sys.stderr)
        return

    state = load_state()
    all_embeds: list[dict] = []
    for search in searches:
        print(f"» {search.get('name')}", file=sys.stderr)
        all_embeds += process_search(search, state, args, settings)

    if args.print_urls:
        return

    save_state(state)

    if not all_embeds:
        print("No new approved listings this run.", file=sys.stderr)
        return

    print(f"\n{len(all_embeds)} approved listing(s).", file=sys.stderr)
    if args.dry_run:
        for e in all_embeds:
            print(f"  • {e['title']} — {e['url']}")
        return

    webhook = os.environ.get("HOUSE_DISCORD_WEBHOOK_URL")
    if not webhook:
        sys.exit("ERROR: HOUSE_DISCORD_WEBHOOK_URL not set (use --dry-run to test without posting).")
    post_to_discord(webhook, all_embeds)
    print("Posted to Discord.", file=sys.stderr)


if __name__ == "__main__":
    main()
