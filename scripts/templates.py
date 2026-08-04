#!/usr/bin/env python3
"""
templates — HTML dashboard generator for House Hunter.

Renders `house_state.json` into a single, self-contained `results.html`:
embedded CSS + vanilla JavaScript, no build step, no external files. The
page lets Tiago browse scraped listings, filter them (price, location,
status), and approve/reject the agent's verdict via AJAX calls to the
FastAPI server (`server.py`, Task 6) without a page reload.

State shape consumed (see house_hunter.py `process_search()`):
    {
      "<search_name>": {
        "<listing_id>": {
          "verdict": "manter" | "rejeitar",
          "motivo": "string",
          "user_feedback": "pending" | "approved" | "rejected",
          "published_date": "YYYY-MM-DD" | None,
          "updated_date": "YYYY-MM-DD" | None,
          "first_seen": ISO8601 timestamp,
          "last_feedback": ISO8601 timestamp | None,
          "title": "string",
          "url": "string",
          # optional / not always persisted yet by the scraper:
          "price_eur": int | None,
          "location": "string",
          "typology": "string",
          "area_m2": int | None,
          "image": "string" | None,
        }
      }
    }

Every field is read defensively with `.get()` + a sane fallback, so this
renders correctly whether or not the scraper has started persisting the
richer listing fields (price/location/typology/image) alongside the
verdict fields it currently keeps.

Usage:
    from templates import generate_html
    generate_html(state, output_path=Path("results.html"))
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

__all__ = ["generate_html"]


# ---------------------------------------------------------------------------
# State -> flat card list
# ---------------------------------------------------------------------------

def _flatten_listings(state: dict) -> list[dict]:
    """Flatten {search_name: {listing_id: data}} into a list of card dicts."""
    cards: list[dict] = []
    for search_name, listings in (state or {}).items():
        if not isinstance(listings, dict):
            continue
        for listing_id, data in listings.items():
            if not isinstance(data, dict):
                continue
            cards.append({
                "id": listing_id,
                "search_name": search_name,
                "title": data.get("title") or "(sem título)",
                "url": data.get("url") or "",
                "price_eur": data.get("price_eur"),
                "location": data.get("location") or "",
                "typology": data.get("typology") or "",
                "area_m2": data.get("area_m2"),
                "image": data.get("image") or None,
                "published_date": data.get("published_date"),
                "updated_date": data.get("updated_date"),
                "verdict": data.get("verdict") or "manter",
                "motivo": data.get("motivo") or "",
                "user_feedback": data.get("user_feedback") or "pending",
                "first_seen": data.get("first_seen"),
                "last_feedback": data.get("last_feedback"),
            })
    # Most recently seen first; listings without a first_seen timestamp sink
    # to the bottom (empty string sorts lowest, so it lands last in reverse).
    cards.sort(key=lambda c: c.get("first_seen") or "", reverse=True)
    return cards


def _json_for_script(data) -> str:
    """JSON-encode data for embedding inside a <script> tag.

    Escapes '</' so a listing title/description containing '</script>' can
    never prematurely close the tag and inject markup.
    """
    return json.dumps(data, ensure_ascii=False).replace("</", "<\\/")


# ---------------------------------------------------------------------------
# Static template (CSS + JS are plain strings — no str.format applied to
# them, since both are full of literal '{' '}' braces).
# ---------------------------------------------------------------------------

_HTML_TEMPLATE = r"""<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>House Hunter — Dashboard</title>
<style>
:root {
  --bg: #f5f5f7;
  --surface: #ffffff;
  --text: #1a1a1a;
  --text-muted: #6b6b6b;
  --border: #e0e0e0;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --keep: #16a34a;
  --reject-color: #dc2626;
  --pending: #d97706;
  --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-hover: 0 8px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #121212;
    --surface: #1e1e1e;
    --text: #f0f0f0;
    --text-muted: #a3a3a3;
    --border: #333333;
    --accent: #3b82f6;
    --accent-hover: #60a5fa;
    --keep: #22c55e;
    --reject-color: #f87171;
    --pending: #fbbf24;
    --shadow: 0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4);
    --shadow-hover: 0 8px 20px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.5);
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.4;
}
header {
  padding: 20px 24px 8px;
}
header h1 {
  margin: 0 0 4px;
  font-size: 1.5rem;
}
header .subtitle {
  color: var(--text-muted);
  font-size: 0.85rem;
}
.stats-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 24px;
}
.stat-tile {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 16px;
  min-width: 100px;
  box-shadow: var(--shadow);
}
.stat-tile .stat-value {
  font-size: 1.4rem;
  font-weight: 700;
}
.stat-tile .stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.stat-tile.total .stat-value { color: var(--text); }
.stat-tile.pending .stat-value { color: var(--pending); }
.stat-tile.approved .stat-value { color: var(--keep); }
.stat-tile.rejected .stat-value { color: var(--reject-color); }

.filters-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 14px;
  padding: 8px 24px 16px;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.filter-group label {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.filter-group .price-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
}
input, select {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 0.9rem;
}
input[type="number"] { width: 100px; }
input:focus, select:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
#btn-reset {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 12px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.85rem;
  align-self: flex-end;
}
#btn-reset:hover { color: var(--text); border-color: var(--text-muted); }

.results-header {
  padding: 0 24px 8px;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 18px;
  padding: 8px 24px 40px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  flex-direction: column;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
}
.card-photo {
  width: 100%;
  height: 170px;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.card-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-photo-placeholder {
  font-size: 2.4rem;
  color: var(--text-muted);
  opacity: 0.5;
}
.card-body {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.card-title {
  margin: 0;
  font-size: 1rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-title a {
  color: var(--text);
  text-decoration: none;
}
.card-title a:hover { color: var(--accent); text-decoration: underline; }
.card-meta {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-muted);
}
.card-dates {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}
.card-verdict {
  margin: 2px 0 0;
  font-size: 0.85rem;
  font-weight: 600;
}
.verdict-keep { color: var(--keep); }
.verdict-reject { color: var(--reject-color); }
.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.card-actions button {
  flex: 1;
  border: none;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease, background 0.15s ease;
}
.btn-approve { background: var(--keep); color: #fff; }
.btn-approve:hover:not(:disabled) { opacity: 0.88; }
.btn-reject { background: var(--reject-color); color: #fff; }
.btn-reject:hover:not(:disabled) { opacity: 0.88; }
.card-actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.badge {
  align-self: flex-start;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.badge-approved { background: rgba(22,163,74,0.15); color: var(--keep); }
.badge-rejected { background: rgba(220,38,38,0.15); color: var(--reject-color); }
.card.feedback-approved { border-color: var(--keep); }
.card.feedback-rejected { border-color: var(--reject-color); opacity: 0.7; }

.empty-state {
  padding: 60px 24px;
  text-align: center;
  color: var(--text-muted);
}
.empty-state .empty-emoji { font-size: 2.4rem; display: block; margin-bottom: 8px; }

footer {
  padding: 16px 24px 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.75rem;
}

@media (max-width: 640px) {
  header, .stats-bar, .filters-bar, .results-header, .grid, footer { padding-left: 14px; padding-right: 14px; }
  .filters-bar { flex-direction: column; align-items: stretch; }
  .filter-group .price-inputs input { width: 100%; }
  .grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>

<header>
  <h1>🏠 House Hunter Dashboard</h1>
  <div class="subtitle">Gerado em __GENERATED_AT__</div>
</header>

<section class="stats-bar" id="stats-bar">
  <div class="stat-tile total">
    <div class="stat-value" id="stat-total">0</div>
    <div class="stat-label">Total</div>
  </div>
  <div class="stat-tile pending">
    <div class="stat-value" id="stat-pending">0</div>
    <div class="stat-label">Pendentes</div>
  </div>
  <div class="stat-tile approved">
    <div class="stat-value" id="stat-approved">0</div>
    <div class="stat-label">Aprovados</div>
  </div>
  <div class="stat-tile rejected">
    <div class="stat-value" id="stat-rejected">0</div>
    <div class="stat-label">Rejeitados</div>
  </div>
</section>

<section class="filters-bar">
  <div class="filter-group">
    <label for="filter-price-min">Preço min (€)</label>
    <div class="price-inputs">
      <input type="number" id="filter-price-min" min="0" step="1000" placeholder="0">
      <span>—</span>
      <input type="number" id="filter-price-max" min="0" step="1000" placeholder="∞">
    </div>
  </div>
  <div class="filter-group">
    <label for="filter-location">Localização</label>
    <select id="filter-location">
      <option value="">Todas</option>
    </select>
  </div>
  <div class="filter-group">
    <label for="filter-status">Estado</label>
    <select id="filter-status">
      <option value="">Todos</option>
      <option value="pending">Pendente</option>
      <option value="approved">Aprovado</option>
      <option value="rejected">Rejeitado</option>
    </select>
  </div>
  <button id="btn-reset" type="button">Limpar filtros</button>
</section>

<div class="results-header" id="results-header"></div>

<main class="grid" id="grid"></main>

<footer>House Hunter · Aliança/PA toolkit</footer>

<script id="listings-data" type="application/json">__LISTINGS_JSON__</script>
<script>
(function () {
  "use strict";

  var LISTINGS = JSON.parse(document.getElementById("listings-data").textContent || "[]");

  var grid = document.getElementById("grid");
  var resultsHeader = document.getElementById("results-header");
  var priceMinEl = document.getElementById("filter-price-min");
  var priceMaxEl = document.getElementById("filter-price-max");
  var locationEl = document.getElementById("filter-location");
  var statusEl = document.getElementById("filter-status");
  var resetBtn = document.getElementById("btn-reset");

  // --- helpers ---------------------------------------------------------

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str === null || str === undefined ? "" : String(str);
    return div.innerHTML;
  }

  function priceStr(v) {
    if (typeof v !== "number" || isNaN(v) || v <= 0) return "preço n/d";
    return v.toLocaleString("pt-PT") + " €";
  }

  function relativeDate(dateStr) {
    if (!dateStr) return "data desconhecida";
    var d = new Date(dateStr + "T00:00:00Z");
    if (isNaN(d.getTime())) return dateStr;
    var days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return "hoje";
    if (days === 1) return "ontem";
    return days + " dias atrás";
  }

  function populateLocationOptions() {
    var seen = {};
    var locations = [];
    LISTINGS.forEach(function (c) {
      var loc = (c.location || "").trim();
      if (loc && !seen[loc]) {
        seen[loc] = true;
        locations.push(loc);
      }
    });
    locations.sort(function (a, b) { return a.localeCompare(b); });
    locations.forEach(function (loc) {
      var opt = document.createElement("option");
      opt.value = loc;
      opt.textContent = loc;
      locationEl.appendChild(opt);
    });
  }

  function updateStats() {
    var total = LISTINGS.length;
    var pending = 0, approved = 0, rejected = 0;
    LISTINGS.forEach(function (c) {
      if (c.user_feedback === "approved") approved++;
      else if (c.user_feedback === "rejected") rejected++;
      else pending++;
    });
    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-pending").textContent = pending;
    document.getElementById("stat-approved").textContent = approved;
    document.getElementById("stat-rejected").textContent = rejected;
  }

  function applyFilters(listings) {
    var priceMin = parseFloat(priceMinEl.value);
    var priceMax = parseFloat(priceMaxEl.value);
    var location = locationEl.value;
    var status = statusEl.value;

    return listings.filter(function (c) {
      if (!isNaN(priceMin) && typeof c.price_eur === "number" && c.price_eur < priceMin) return false;
      if (!isNaN(priceMax) && typeof c.price_eur === "number" && c.price_eur > priceMax) return false;
      if (location && c.location !== location) return false;
      if (status && c.user_feedback !== status) return false;
      return true;
    });
  }

  function cardHtml(c) {
    var verdictOk = c.verdict !== "rejeitar";
    var verdictLabel = verdictOk ? "✅ Manter" : "🚫 Rejeitar";
    var verdictClass = verdictOk ? "verdict-keep" : "verdict-reject";
    var feedback = c.user_feedback || "pending";
    var img = c.image
      ? '<img src="' + escapeHtml(c.image) + '" alt="" loading="lazy">'
      : '<div class="card-photo-placeholder">🏠</div>';
    var badge = feedback !== "pending"
      ? '<span class="badge badge-' + feedback + '">' + (feedback === "approved" ? "Aprovado" : "Rejeitado") + '</span>'
      : "";
    var motivo = c.motivo ? " — " + escapeHtml(c.motivo) : "";
    var metaBits = [priceStr(c.price_eur)];
    if (c.typology) metaBits.push(escapeHtml(c.typology));
    metaBits.push(escapeHtml(c.location || "localização n/d"));
    if (c.area_m2) metaBits.push(c.area_m2 + " m²");

    return (
      '<article class="card feedback-' + feedback + '" data-id="' + escapeHtml(c.id) + '" data-search="' + escapeHtml(c.search_name) + '">' +
        '<div class="card-photo">' + img + '</div>' +
        '<div class="card-body">' +
          '<h3 class="card-title"><a href="' + escapeHtml(c.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(c.title) + '</a></h3>' +
          '<p class="card-meta">' + metaBits.join(" · ") + '</p>' +
          '<p class="card-dates">Pub: ' + relativeDate(c.published_date) + ' · Upd: ' + relativeDate(c.updated_date) + '</p>' +
          '<p class="card-verdict ' + verdictClass + '">' + verdictLabel + motivo + '</p>' +
          '<div class="card-actions">' +
            '<button type="button" class="btn-approve" data-action="approve"' + (feedback === "approved" ? " disabled" : "") + '>👍 Approve</button>' +
            '<button type="button" class="btn-reject" data-action="reject"' + (feedback === "rejected" ? " disabled" : "") + '>👎 Reject</button>' +
          '</div>' +
          badge +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    var filtered = applyFilters(LISTINGS);
    resultsHeader.textContent = "A mostrar " + filtered.length + " de " + LISTINGS.length + " anúncios";

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty-state"><span class="empty-emoji">🕳️</span>Nenhum anúncio encontrado com estes filtros.</div>';
    } else {
      grid.innerHTML = filtered.map(cardHtml).join("");
    }
    updateStats();
  }

  // --- feedback (AJAX approve/reject) -----------------------------------

  function findListing(id, searchName) {
    for (var i = 0; i < LISTINGS.length; i++) {
      if (LISTINGS[i].id === id && LISTINGS[i].search_name === searchName) return LISTINGS[i];
    }
    return null;
  }

  function sendFeedback(id, searchName, action) {
    return fetch("/listing/" + encodeURIComponent(id) + "/" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search_name: searchName })
    }).then(function (res) {
      if (!res.ok) throw new Error("request failed: " + res.status);
      return res.json();
    });
  }

  grid.addEventListener("click", function (evt) {
    var btn = evt.target.closest("button[data-action]");
    if (!btn) return;
    var card = btn.closest(".card");
    if (!card) return;

    var id = card.getAttribute("data-id");
    var searchName = card.getAttribute("data-search");
    var action = btn.getAttribute("data-action"); // "approve" | "reject"

    var actionButtons = card.querySelectorAll(".card-actions button");
    actionButtons.forEach(function (b) { b.disabled = true; });

    sendFeedback(id, searchName, action)
      .then(function () {
        var listing = findListing(id, searchName);
        if (listing) {
          listing.user_feedback = action === "approve" ? "approved" : "rejected";
          listing.last_feedback = new Date().toISOString();
        }
        render();
      })
      .catch(function (err) {
        console.error("House Hunter: feedback failed", err);
        actionButtons.forEach(function (b) { b.disabled = false; });
        alert("Não foi possível guardar o feedback. Tenta novamente.");
      });
  });

  // --- filters -----------------------------------------------------------

  [priceMinEl, priceMaxEl, locationEl, statusEl].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  resetBtn.addEventListener("click", function () {
    priceMinEl.value = "";
    priceMaxEl.value = "";
    locationEl.value = "";
    statusEl.value = "";
    render();
  });

  // --- init ---------------------------------------------------------------

  populateLocationOptions();
  render();
})();
</script>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_html(state: dict, output_path: Path) -> None:
    """Generate results.html from house_state.json.

    Args:
        state: the full house_state.json dict — {search_name: {listing_id: data}}.
        output_path: where to write the generated HTML file.
    """
    cards = _flatten_listings(state)
    generated_at = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")

    html_doc = _HTML_TEMPLATE.replace("__LISTINGS_JSON__", _json_for_script(cards))
    html_doc = html_doc.replace("__GENERATED_AT__", generated_at)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(html_doc, encoding="utf-8")


if __name__ == "__main__":
    # Quick manual smoke test: generate a dashboard from the real state file
    # (or an empty one) into results.html at the repo root.
    import sys

    repo_root = Path(__file__).resolve().parents[1]
    state_path = repo_root / "data" / "house_state.json"
    try:
        demo_state = json.loads(state_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        demo_state = {}
    out = repo_root / "results.html"
    generate_html(demo_state, out)
    print(f"Wrote {out}", file=sys.stderr)
