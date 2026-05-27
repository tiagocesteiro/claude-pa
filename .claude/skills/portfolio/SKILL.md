---
name: portfolio
description: >
  Reads Tiago's portfolio from data/portfolio.yaml and produces a live P&L report — current
  prices via Finnhub, position-level P&L, total return, and sector/country allocation.
  Use whenever the user says "my portfolio", "o meu portfólio", "as minhas posições",
  "P&L", "rebalance", "allocation", "portfolio review", or asks about specific positions
  he holds. Reads from data/portfolio.yaml (YAML, editable in any editor or Obsidian).
---

# portfolio

Live portfolio P&L from `data/portfolio.yaml`.

## Usage

```bash
python ".claude/skills/portfolio/scripts/portfolio.py"             # full live report
python ".claude/skills/portfolio/scripts/portfolio.py" --no-prices # offline listing
python ".claude/skills/portfolio/scripts/portfolio.py" --file ./custom.yaml
```

## Portfolio file format

Location: `data/portfolio.yaml`

```yaml
positions:
  - ticker: VOO
    qty: 10
    avg_cost: 380.50
    currency: USD
    notes: "Core US holding"

  - ticker: CSPX.L
    qty: 5
    avg_cost: 450.00
    currency: USD
    sector: "ETF"          # optional override
    country: "Ireland"     # optional override

  - ticker: NVDA
    qty: 8
    avg_cost: 420.00
    currency: USD
```

**Required fields:** `ticker`, `qty`, `avg_cost`
**Optional:** `currency` (default USD), `sector`, `country`, `notes`

## Output

- Position-by-position table: qty, avg cost, current price, value, cost basis, P&L, P&L %
- Total value, cost basis, P&L (raw sum, no FX normalization)
- Sector allocation breakdown
- Country allocation breakdown

## Setup

Requires `FINNHUB_API_KEY` env var (see `ticker-snapshot` SKILL.md).
Requires `pyyaml`: `pip install pyyaml`

## Caveats

- **No FX normalization.** Totals sum raw values across currencies. For accurate multi-currency totals, keep everything in USD or extend the script.
- Sector/country pulled from Finnhub profile when not overridden in YAML. Override for ETFs (Finnhub returns industry for ETFs as "?" sometimes).
- Rate-limited at 1.1s between tickers — a portfolio of 50 positions takes ~1 min.

## When ATLAS should use this

- User asks about "my portfolio" or current positions
- Before any rebalancing or risk-concentration analysis
- After major macro events (Fed decision, geopolitical shock) to assess exposure
- Pair with `ticker-snapshot` for per-position deep dive on flagged holdings
