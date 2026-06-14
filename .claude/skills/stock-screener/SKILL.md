---
name: stock-screener
description: >
  Scan a universe of stocks and rank investment LEADS by a multi-factor score
  (momentum, growth, quality, value) plus insider buying on the finalists.
  Use when Tiago asks for investment ideas, leads, "what should I look at",
  opportunities, screening, "find me stocks", new positions, or where to deploy
  capital. NOT for analysing a single named ticker (use ticker-snapshot + ATLAS).
---

# stock-screener — Investment Lead Generator

Generates ranked investment leads for Tiago from a curated universe of US-listed
tickers (incl. ADRs for EU/India/LatAm exposure). Calibrated to his profile:
aggressive growth/thematic investor, already heavy in AI/semis/crypto/China, so
the universe is split into:

- **complement** (full weight) — sectors/geographies he does NOT hold: defense,
  biotech/GLP-1, grid/energy, financials, India, LatAm, materials, industrials
- **reinforce** (handicapped 0.85×) — his favourite themes, but players he
  doesn't already own: AI/semis (AMD, AVGO, TSM…), nuclear, space, crypto-infra

Names he already holds are excluded from the universe.

## When to use

Trigger phrases: "leads", "ideias para investir", "o que devo olhar",
"oportunidades", "onde meter dinheiro", "screening", "encontra-me ações",
"novas posições", "what should I buy", "investment ideas".

## How to run

```bash
# Full scan (default universe + profile) — ~2-3 min, ends with insider check
python ".claude/skills/stock-screener/scripts/screener.py"

# Faster: skip the slow EDGAR insider step
python ".claude/skills/stock-screener/scripts/screener.py" --no-insider

# Only diversifying names / only his themes
python ".claude/skills/stock-screener/scripts/screener.py" --bucket complement
python ".claude/skills/stock-screener/scripts/screener.py" --bucket reinforce

# Show more finalists
python ".claude/skills/stock-screener/scripts/screener.py" --top 12
```

## After running

The screener returns RANKED LEADS, not buy calls. Then:

1. Run a **full ATLAS analysis** on the top 2-3 names that fit the current
   thesis (`ticker-snapshot` + `sec-filings` + macro context + bull/bear).
2. Flag concentration: if a lead doubles down on a trade Tiago is already
   heavy in (AI/semis), say so.
3. Present leads with the *reason* they ranked — never just a ticker list.

## Configuration

- `data/screener_universe.yaml` — the tickers, in complement/reinforce buckets.
  Edit to add/remove names (keep them US-listed or ADRs — native EU tickers
  like RHM.DE return no data on Finnhub free).
- `data/screener_profile.yaml` — factor weights (momentum/growth/quality/value),
  bucket multipliers, finalist count. Tune to shift the risk/diversification mix.

## How scoring works

Each factor is ranked cross-sectionally (percentile within the scanned cohort,
0-100), so it's always relative to the day's universe. Missing factors score a
neutral 50 rather than disqualifying a name. Momentum is capped (default +120%
26-week) to avoid chasing blow-off tops. Insider net-buying is computed only for
finalists because the EDGAR parse is slow.

## Limitations

- Finnhub free covers US-listed tickers + ADRs only. A handful of ADRs (e.g. ABB)
  return no metrics and are skipped.
- Insider data (Form 4) exists for US-domiciled companies; most ADRs show none.
- This is a *first-pass filter*. It surfaces candidates worth a deep look — it
  does not replace the full ATLAS thesis.
