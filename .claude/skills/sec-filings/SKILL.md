---
name: sec-filings
description: >
  Pulls SEC EDGAR filings for any US-listed company — 10-K/10-Q financials, 8-K material
  events, and Form 4 insider trades (buys/sells by executives). Use whenever the user
  asks about fundamentals, insider activity, recent filings, "what are insiders doing",
  "10-K", "10-Q", "form 4", "insider trading", or wants verified financial statements
  for a US stock. Free, no API key required. Limited to US-listed companies.
---

# sec-filings

EDGAR access via edgartools (Python, MIT-licensed, no API key).

## Usage

```bash
# Latest N filings of any type
python ".claude/skills/sec-filings/scripts/sec.py" latest NVDA --n 10

# Insider trades (Form 4) in last 90 days
python ".claude/skills/sec-filings/scripts/sec.py" insider AAPL --days 90

# Income statement + balance sheet + cash flow from latest 10-Q/10-K
python ".claude/skills/sec-filings/scripts/sec.py" metrics MSFT
```

## Setup (one-time)

```bash
pip install "edgartools[ai]"
```

SEC requires identifying yourself in User-Agent. Set:

```
SEC_IDENTITY="Your Name your@email.com"
```

(Skill uses a default fallback if not set, but SEC may rate-limit anonymous traffic.)

## Limitations

- **US-listed only.** EDGAR is SEC, so no European or Asian stocks.
- **Form 4 parsing is shallow** — script returns filing counts and dates, not parsed transaction direction/dollar amounts. For deep analysis, ATLAS should open the SEC EDGAR URL.
- **Financials parsing** depends on edgartools version. If it fails, ATLAS should fall back to `ticker-snapshot` for headline numbers.

## When ATLAS should use this

- **After** `ticker-snapshot` when user wants deeper fundamentals (revenue history, FCF, debt)
- When user asks about insider activity (`insider` subcommand)
- When user asks "what did they file recently" (`latest` subcommand)
- Skip for ETFs, non-US stocks, or crypto
