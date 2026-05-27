---
name: macro-briefing
description: >
  Pulls macroeconomic data from FRED (US Fed/Treasury), IMF (global forecasts), and FRED FX
  pairs. Returns Fed funds rate, yield curve (with auto recession-signal flag), CPI,
  unemployment, NFP, DXY, EUR/USD, USD/JPY, USD/CNY, IMF GDP growth and inflation forecasts
  for major economies. Use whenever the user asks about macro, "the Fed", "interest rates",
  "yield curve", "recession", "inflation", "GDP growth", "currency", "FX", "EUR/USD",
  "dollar strength", or wants context on the global economic backdrop.
---

# macro-briefing

Macro data from FRED + IMF + World Bank.

## Usage

```bash
python ".claude/skills/macro-briefing/scripts/macro.py" us       # US: Fed, yields, CPI, unemployment
python ".claude/skills/macro-briefing/scripts/macro.py" fx       # DXY + major FX pairs
python ".claude/skills/macro-briefing/scripts/macro.py" global   # IMF GDP + CPI + unemployment for G20
python ".claude/skills/macro-briefing/scripts/macro.py" alert    # Auto-detect red flags
python ".claude/skills/macro-briefing/scripts/macro.py" all      # Everything
```

## What you get

- **us** — Fed funds rate, 10Y/2Y yields with auto-inversion flag, CPI, core CPI, unemployment, NFP, GDP growth, initial claims, M2
- **fx** — DXY, EUR/USD, USD/JPY, USD/CNY, GBP/USD, USD/CHF, USD/CAD
- **global** — IMF World Economic Outlook: real GDP growth, CPI, unemployment for USA, China, Germany, Japan, India, UK, France, Italy, Brazil, Russia, Korea, Portugal
- **alert** — automatic red flags: yield curve inversion, elevated jobless claims, Sahm-rule unemployment territory, very strong USD

## Setup (one-time)

1. Get a free FRED API key at https://fredaccount.stlouisfed.org/apikeys
2. Set environment variable:
   - **Windows (PowerShell, persistent):** `[Environment]::SetEnvironmentVariable("FRED_API_KEY", "your_key", "User")`
3. IMF and World Bank APIs are public — no key needed
4. Restart terminal

## When ATLAS should use this

- BEFORE any sector/stock analysis that depends on the rate cycle (REITs, banks, growth stocks, EM)
- When user asks about macro outlook, recession risk, or Fed policy
- Run `alert` periodically to surface yield curve inversions or other systemic warnings
- Pair with Perplexity for narrative interpretation of the numbers
