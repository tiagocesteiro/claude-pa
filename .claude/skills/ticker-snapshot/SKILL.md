---
name: ticker-snapshot
description: >
  One-shot snapshot of a stock or ETF — current price, P/E, market cap, dividend yield,
  52-week range, next earnings date, and recent news headlines. Use this skill whenever
  the user asks about a ticker, mentions a specific stock or ETF, or needs current
  market data. Triggers on "what's the price of", "NVDA", "AAPL", "snapshot", "current
  price", "P/E of", or any ticker symbol. Returns clean markdown ready for analysis.
  Powered by Finnhub free API (60 req/min, no credit card).
---

# ticker-snapshot

One-shot Finnhub snapshot of a stock or ETF.

## Usage

```bash
python ".claude/skills/ticker-snapshot/scripts/snapshot.py" NVDA
python ".claude/skills/ticker-snapshot/scripts/snapshot.py" AAPL MSFT GOOGL
```

Returns markdown with: price, day/52W range, market cap, P/E, P/B, P/S, EV/EBITDA, dividend yield, ROE, net margin, D/E, next earnings date, news count, sentiment, top 3 headlines.

## Supported tickers

- US equities (all NYSE/NASDAQ)
- US ETFs
- Some international with exchange suffix: `CSPX.L` (LSE), `SAP.DE` (XETRA), `7203.T` (Tokyo)

## Setup (one-time)

1. Register for a free API key at https://finnhub.io/register (no credit card)
2. Set environment variable:
   - **Windows (PowerShell, persistent):** `[Environment]::SetEnvironmentVariable("FINNHUB_API_KEY", "your_key", "User")`
   - **Or** add to `CLAUDE.local.md` and source via your shell init
3. Restart terminal so env is picked up

## Rate limits

Free tier = 60 req/min. The script sleeps 1.1s between tickers when multiple are passed, so safe to chain 50+ tickers in one call.

## When ATLAS should use this

- ALWAYS as the first call when user asks about a specific ticker
- Before any qualitative analysis — get the numbers first, then interpret
- For portfolio review, batch all tickers in one invocation
