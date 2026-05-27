---
title: "ATLAS Investment Tools & MCPs Research"
date: 2026-05-23
tags: [research, investment, finance, mcp, atlas-subagent, api-integration]
project: general
status: final
---

# ATLAS Investment Tools & MCPs Research

## Summary

ATLAS currently has limited capabilities (Perplexity + WebSearch + Read/Write/Bash) but the financial data ecosystem is rich. Key findings:

- **MCP servers already exist** for Yahoo Finance, Alpha Vantage, SEC EDGAR, Bloomberg, and crypto data
- **Free APIs are abundant** but have rate limits (Finnhub: 60 req/min; CoinGecko: 10K/month; yfinance: free but unofficial)
- **No free real-time options data** but SEC insider trading (Form 4) is free
- **Earnings transcripts** available via ROIC.ai API and Seeking Alpha (not API, requires scraping)
- **Top 3 integrations for immediate ROI**: EdgarTools MCP (SEC filings), Finnhub API (real-time + fundamentals), FRED API (macro context)

---

## PART 1: Existing Tools & MCPs

### A) MCP Servers for Finance

| MCP Server | What It Does | Install | Auth | Free? | Notes |
|---|---|---|---|---|---|
| **EdgarTools MCP** | SEC EDGAR filings, 10-K/10-Q/8-K, insider trades (Form 3/4/5), financial statements | `pip install "edgartools[ai]"` → `edgartools-mcp` | None (no API key) | ✓ Full | Best for fundamentals + insider trading. MIT licensed. |
| **Yahoo Finance MCP** | Stock quotes, historical prices, options data, company info, financials, news | `npm install` or Docker | None (scrapes yfinance) | ✓ Full | Covers options, weak on real-time. [GitHub](https://github.com/Alex2Yang97/yahoo-finance-mcp) |
| **Alpha Vantage MCP** | Stock quotes, company info, crypto rates, technical indicators | Custom setup via MCP registry | API key (free tier: 25 req/day) | ~ Limited | Official Alpha Vantage MCP. Real-time focus. [Site](https://mcp.alphavantage.co/) |
| **Financial Datasets MCP** | Income statements, balance sheets, cash flow, stock prices | MCP registry installation | API key | ~ Limited | Structured financial statement data. [GitHub](https://github.com/financial-datasets/mcp-server) |
| **Stock Market Tracker MCP** | Portfolio alerts, market summaries, advanced financial analysis | MCP registry | Varies | ~ Limited | Multiple implementations available on [mcpservers.org](https://mcpservers.org/) |
| **Bloomberg MCP** | Securities reference data (PE ratio, dividends, prices), historical time series | Custom | Bloomberg terminal access | ✗ Paid only | Enterprise-focused. Limited public availability. |
| **mcp-trader** | Stock trader focused tools | [GitHub](https://github.com/wshobson/mcp-trader) | Varies | ~ Limited | Community implementation. |

**Sources:**
- [Alpha Vantage MCP](https://mcp.alphavantage.co/)
- [Yahoo Finance MCP GitHub](https://github.com/Alex2Yang97/yahoo-finance-mcp)
- [EdgarTools Docs](https://www.edgartools.io/edgartools-mcp-for-sec-filings/)
- [MCP Servers Registry](https://mcpservers.org/)
- [TensorBlock awesome-mcp-servers](https://github.com/TensorBlock/awesome-mcp-servers/blob/main/docs/finance--crypto.md)

---

### B) Free & Freemium Financial APIs

| API | Data Type | Free Tier | Rate Limits | Key Limitation | Best For |
|---|---|---|---|---|---|
| **yfinance (Python)** | Stocks, ETFs, forex | ✓ Full | Scrapes Yahoo (no official limit) | 15–20 min delayed, breaks when Yahoo changes site | Backtesting, historical data, bulk downloads |
| **Finnhub** | Real-time quotes, fundamentals, news, SEC filings, earnings calendar | ✓ Full | 60 req/min (free), no daily cap | No credit card required but limited international data | **Best free tier for real-time + fundamentals** |
| **Alpha Vantage** | Stock prices, technicals, forex, crypto | ~ Limited | 25 req/day (free), 5 req/min | Free tier is essentially useless for portfolios >5 stocks | Premium ($49–$249/mo) is competitive |
| **FRED API** | 844K+ economic time series (GDP, inflation, unemployment, interest rates) | ✓ Full | Unlimited | Needs free API key registration | Macro context, recession detection, Fed monitoring |
| **CoinGecko** | Crypto prices, on-chain data, 18K+ coins, 37M+ tokens | ✓ Full | 10K calls/month (free), 50 calls/min | Limited real-time; 1-year historical on free tier | On-chain analysis, crypto fundamental comparison |
| **Polygon.io** | Stocks, options (Greeks, IV), crypto, forex | ~ Limited | 5 req/min, 15-min delayed | Free tier is crippled; paid starts $29/mo | Options Greeks data on paid |
| **Twelve Data** | Stocks, forex, crypto, technicals | ~ Limited | 800 calls/day, 4-hour delayed | Most useful data on paid plans | Bulk historical backfill |
| **Financial Modeling Prep (FMP)** | Financial statements, ratios, earnings transcripts, insider trades, valuation | ~ Limited | 250 req/day (free) | Limited depth on free; paid $19–$99/mo | **Best for structured fundamentals + insider trades** |
| **Tiingo** | End-of-day stock data, 65K+ symbols, 50+ years history | ~ Limited | Free tier exists (see docs) | Designed for serious investors; requires signup | Historical accuracy, corporate actions adjusted |
| **World Bank API** | 1,400+ economic indicators, 200+ countries | ✓ Full | Unlimited | Annual frequency for most indicators | Long-term macro trends, country comparisons |
| **IMF API** | World Economic Outlook, GDP growth, inflation, unemployment, trade | ✓ Full | Unlimited | Published 2x/year (April, October); projections to +5 years | IMF forecasts, cross-country macro |

**Sources:**
- [yfinance PyPI](https://pypi.org/project/yfinance/)
- [Finnhub API Docs](https://finnhub.io/docs/api)
- [Alpha Vantage Pricing](https://www.alphavantage.co/premium/)
- [FRED API Docs](https://fred.stlouisfed.org/docs/api/fred/)
- [CoinGecko API](https://www.coingecko.com/en/api)
- [Polygon.io Pricing](https://polygon.io/)
- [Twelve Data Docs](https://twelvedata.com/docs)
- [FMP API Docs](https://site.financialmodelingprep.com/developer/docs)
- [Tiingo](https://www.tiingo.com/)
- [World Bank API](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation)
- [IMF Data](https://data.imf.org/en/)

---

### C) Specialized Data Sources

#### SEC Filings & Insider Trading

| Source | Data | Method | Free? | Notes |
|---|---|---|---|---|
| **EdgarTools (Python lib)** | 10-K/10-Q, Form 3/4/5 (insider trades), 13F (fund holdings), proxy statements | Python API, no API key | ✓ | MIT-licensed; also has [MCP server](https://www.edgartools.io/) |
| **SEC Direct** | Raw EDGAR filings in XML/JSON | REST API (direct SEC) | ✓ | Slow, complex; use edgartools wrapper instead |
| **OpenInsider** | SEC Form 4 (insider buys/sells), transactions by exec, net flows | Web scraping or bulk CSV | ✓ (CSV batch only) | Real-time screener free; no API (use Apify for scraping) |
| **SEC-API.io** | Form 3/4/5 parsed, insider ownership docs in JSON | REST API | ~ | $50–$150/mo; free trial available |
| **EODHD** | Insider transactions (Form 4) API | REST | ~ | Paid plans start ~$99/mo |

**Sources:**
- [edgartools PyPI](https://pypi.org/project/edgartools/)
- [OpenInsider](http://openinsider.com/)
- [SEC-API.io](https://sec-api.io/docs/insider-ownership-trading-api)

#### Earnings Call Transcripts

| Source | Coverage | Method | Free? | Latency | Notes |
|---|---|---|---|---|
| **Seeking Alpha** | 4,500 calls/quarter | Web page + PDF | ~ | ~6 hours after call | Manual scraping or use vendor API |
| **ROIC.ai API** | 60K+ companies | REST API + database | ~ | Same-day | Includes ROIC metrics, fiscal Q&Q organization |
| **API Ninjas** | Variable coverage | REST API | ~ | Hours | Requires ticker or CIK |
| **Motley Fool** | Major caps only | Web page | ~ | Same-day | Manual scraping only |

**Sources:**
- [Seeking Alpha Transcripts](https://seekingalpha.com/earnings/earnings-call-transcripts)
- [ROIC.ai API Docs](https://www.roic.ai/api)
- [API Ninjas Earnings](https://api-ninjas.com/api/earningscalltranscript)

#### Macro & News Data

| Source | Data | Method | Free? | Notes |
|---|---|---|---|---|
| **GDELT** | 844K+ global news events, coded in CAMEO format, sentiment | BigQuery CSV or direct download | ✓ | 15-min updates; works with Google BigQuery; sentiment needs ML enhancement |
| **NewsAPI** | 150K+ news sources | REST API | ~ | 100 req/day free; $45/mo for more |
| **Marketaux** | Financial news sentiment, entity tagging, trending stocks | REST API | ~ | 100 req/day free; $99/mo for unlimited |
| **Finnhub News** | Market news + sentiment | Included in Finnhub API | ✓ (in free tier) | Part of Finnhub package; no separate auth |

**Sources:**
- [GDELT Project](https://www.gdeltproject.org/)
- [NewsAPI](https://newsapi.org/)
- [Marketaux](https://www.marketaux.com/)

#### Crypto On-Chain Data

| Source | Data | Free Tier | Rate Limits | Notes |
|---|---|---|---|---|
| **CoinGecko** | Prices, market cap, volumes, on-chain (17M+ tokens), DEX data | ✓ | 10K calls/month | Best free on-chain option |
| **CoinMarketCap** | Prices, market cap, rankings, news | ~ | Limited free; premium $99–$999/mo | Less generous free tier than CoinGecko |
| **Dune Analytics** | Custom SQL queries on 20+ blockchains | ✓ Free tier | Seat caps on free | Community dashboards; overlaps Glassnode |
| **Glassnode** | BTC/ETH on-chain metrics, derivatives, holder behavior | ✓ Free tier | Reduced granularity, delayed | Daily chart updates on free; premium for intraday |

**Sources:**
- [CoinGecko API](https://www.coingecko.com/en/api)
- [Dune Analytics](https://dune.com/home)
- [Glassnode](https://glassnode.com/)

---

### D) Existing Claude/AI Finance Skills & Agents

| Skill/Agent | Purpose | GitHub | Type | Status |
|---|---|---|---|---|
| **Anthropic Financial Services** | Reference agents for investment banking, equity research, wealth management | [anthropics/financial-services](https://github.com/anthropics/financial-services/) | Reference Implementation | Maintained |
| **claude-trading-skills** | 62 ready-to-use skills for trading, DeFi, quant analysis | [agiprolabs/claude-trading-skills](https://github.com/agiprolabs/claude-trading-skills) | Skills Pack | Active |
| **LangAlpha** | 23 pre-built financial research skills (DCF, ratio analysis, SaaS metrics) | [ginlix-ai/LangAlpha](https://github.com/ginlix-ai/langalpha) | Full Framework | Active |
| **claude-skills (financial-analyst)** | Financial statement analysis, ratio analysis, DCF valuation, forecasting | [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) | Skill | Maintained |
| **personal-finance-skill** | 75 tools: banking (Plaid), trading (Alpaca), portfolio (IBKR), tax, sentiment | [6missedcalls/personal-finance-skill](https://github.com/6missedcalls/personal-finance-skill) | Skill | Active |
| **ConsensusAI / ai-sub-invest** | Simulates multiple investor personas, aggregates signals | [ancs21/ai-sub-invest](https://github.com/ancs21/ai-sub-invest) | Pattern | Reference |

**Sources:**
- [Anthropic Financial Services](https://github.com/anthropics/financial-services/)
- [claude-trading-skills](https://github.com/agiprolabs/claude-trading-skills)
- [LangAlpha](https://github.com/ginlix-ai/langalpha)
- [Snyk: Top 8 Claude Skills for Finance](https://snyk.io/articles/top-claude-skills-finance-quantitative-developers/)

---

## PART 2: Proposed Custom Skills for ATLAS

Based on the gaps, here are 10 recommended skills to build for ATLAS:

| Skill Name | What It Does | Primary Tools/APIs | Complexity | Priority | Est. Build Time |
|---|---|---|---|---|---|
| **ticker-fundamentals-fetch** | Grab latest P/E, PEG, dividend yield, market cap, latest earnings date for a ticker | FMP API + FRED for context | Low | MUST | 2–4 hrs |
| **sec-filing-analyzer** | Pull 10-K/10-Q, extract key metrics (revenue, debt, FCF), flag YoY changes | EdgarTools MCP or Python lib | Medium | MUST | 4–6 hrs |
| **insider-trading-monitor** | Fetch Form 4 insider trades for a watchlist, calculate insider buy/sell ratio | FMP API or sec-api.io | Low | High | 3–4 hrs |
| **earnings-call-synthesizer** | Fetch latest earnings transcript, extract management tone + guidance + key headwinds | ROIC.ai API or Seeking Alpha scrape | Medium | High | 4–6 hrs |
| **portfolio-tracker** | Read CSV/JSON of Tiago's positions, calculate P&L, Greeks exposure, sector/country allocation | Custom file parser + upstream APIs | Low | Medium | 2–3 hrs |
| **macro-briefing** | Pull FRED (Fed funds rate, yield curve, unemployment) + IMF outlook in one call; flag recession signals | FRED API + IMF API | Low | High | 3–4 hrs |
| **options-screener** | Find options with high IV rank, favorable Greeks given market outlook; compare bid-ask spreads | Polygon.io (paid) or Finviz (scrape) | Medium | Medium | 4–5 hrs |
| **news-sentiment-roll-up** | Pull last N days of news for a ticker/sector via Finnhub or Marketaux; aggregate sentiment | Finnhub news + Marketaux API | Low | Medium | 2–3 hrs |
| **crypto-on-chain-deep-dive** | Fetch CoinGecko on-chain data, whale movements, DEX volume trends, compare to price | CoinGecko API + Dune SQL query builder | Medium | Medium | 4–6 hrs |
| **valuation-model-builder** | DCF, dividend discount model, or comparable comps for a ticker; use FMP data | FMP API + edgartools | High | Low (future) | 6–8 hrs |

---

## PART 3: Top 3 Recommended Next Steps

### 1. **Integrate EdgarTools MCP (SEC Filings)**
**Why:** Unlocks insider trading + 10-K/10-Q fundamentals with zero API key overhead.

**Action:**
- Install: `pip install "edgartools[ai]"`
- Create `skills/sec-filings-analyzer/SKILL.md` wrapping edgartools
- Build skill to extract: revenue, net income, debt, FCF, insider forms
- Test on 5 stocks (AAPL, MSFT, NVDA, TSLA, SPY)

**Estimated ROI:** High — covers fundamentals + insider sentiment in one skill.

**Effort:** 4–6 hours build + 2 hours testing

---

### 2. **Wire Finnhub API (Real-Time Quotes + Fundamentals)**
**Why:** 60 req/min free tier, covers quotes + news + earnings calendar + company fundamentals. No better free option exists.

**Action:**
- Sign up for free API key at [finnhub.io](https://finnhub.io/)
- Create `skills/ticker-snapshot/SKILL.md` wrapping Finnhub
- Build skill to return: price, P/E, dividend, market cap, next earnings date, latest news sentiment
- Create `skills/earnings-calendar/SKILL.md` to monitor watchlist earnings dates

**Estimated ROI:** High — real-time + fundamentals in one call, zero latency vs. yfinance

**Effort:** 3–5 hours build + 1 hour testing

---

### 3. **Add Macro Context Layer (FRED + IMF)**
**Why:** Gives ATLAS ability to flag recession risk, Fed policy shifts, and cross-border trends.

**Action:**
- Get free FRED API key at [https://fredaccount.stlouisfed.org/apikeys](https://fredaccount.stlouisfed.org/apikeys)
- Create `skills/macro-briefing/SKILL.md` 
- Pull: Fed funds rate, 10Y-2Y yield spread, unemployment, inflation (CPI), IMF GDP growth forecasts
- Add logic: if yield curve inverts → flag "recession signal"

**Estimated ROI:** Medium — enables ATLAS to contextualize stock analysis within macro risk

**Effort:** 3–4 hours build + 1 hour testing

---

## PART 4: API Limits & Pricing Summary (for quick reference)

| API | Free Tier Limit | Cheapest Paid | When to Upgrade |
|---|---|---|---|
| Finnhub | 60 req/min, unlimited daily | $99/mo (pro) | Portfolio > 200 stocks or need real-time options |
| Alpha Vantage | 25 req/day, 5 req/min | $49/mo (standard) | Intraday data or portfolio > 10 symbols |
| FMP | 250 req/day | $19/mo (plus) | Need historical fundamentals + earnings transcripts |
| CoinGecko | 10K calls/month | $35/mo (pro) | Real-time on-chain data or API stability SLA |
| Polygon.io | 5 req/min (15-min delayed) | $29/mo (basic) | Real-time or options Greeks |
| FRED | Unlimited | N/A (always free) | Never; free is production-grade |
| yfinance | Unlimited (scraping) | N/A | Never; free but fragile to Yahoo site changes |

---

## Caveats & Gaps

1. **Real-time options Greeks:** No completely free source. Polygon.io free tier doesn't include Greeks. Would need to pay or build internal Greeks calculator.

2. **Earnings transcripts:** No free API with full coverage. Seeking Alpha requires scraping; ROIC.ai charges. Consider using [Apify actors](https://apify.com/) to scrape Seeking Alpha at scale ($0.06 per transcript).

3. **Charts & TradingView data:** TradingView has no public data API; charting library is free but requires application approval.

4. **International stock data:** Most free APIs focus on US equities. For Portugal/EU stocks, will need paid tier or regional API (e.g., idealo for pricing).

5. **Backtesting infrastructure:** No free backtesting engine recommended here; separate decision needed (Backtrader, VectorBT, or cloud SaaS).

---

## Sources

### MCP & APIs
- [Alpha Vantage MCP](https://mcp.alphavantage.co/)
- [Yahoo Finance MCP GitHub](https://github.com/Alex2Yang97/yahoo-finance-mcp)
- [EdgarTools Docs](https://www.edgartools.io/)
- [EdgarTools PyPI](https://pypi.org/project/edgartools/)
- [TensorBlock awesome-mcp-servers](https://github.com/TensorBlock/awesome-mcp-servers)
- [MCP Servers Registry (mcpservers.org)](https://mcpservers.org/)

### Fundamental APIs
- [Finnhub API](https://finnhub.io/docs/api)
- [Alpha Vantage Pricing](https://www.alphavantage.co/premium/)
- [yfinance PyPI](https://pypi.org/project/yfinance/)
- [FRED API](https://fred.stlouisfed.org/docs/api/fred/)
- [Financial Modeling Prep](https://site.financialmodelingprep.com/)
- [Tiingo](https://www.tiingo.com/)
- [Twelve Data](https://twelvedata.com/docs)
- [CoinGecko API](https://www.coingecko.com/en/api)
- [Polygon.io](https://polygon.io/)

### Specialized Data
- [ROIC.ai API](https://www.roic.ai/api)
- [Seeking Alpha Transcripts](https://seekingalpha.com/earnings/earnings-call-transcripts)
- [OpenInsider](http://openinsider.com/)
- [SEC-API.io](https://sec-api.io/)
- [IMF Data](https://data.imf.org/en/)
- [World Bank API](https://datahelpdesk.worldbank.org/)

### Macro & News
- [GDELT Project](https://www.gdeltproject.org/)
- [NewsAPI](https://newsapi.org/)
- [Marketaux](https://www.marketaux.com/)

### Existing Skills & Frameworks
- [Anthropic Financial Services](https://github.com/anthropics/financial-services/)
- [claude-trading-skills](https://github.com/agiprolabs/claude-trading-skills)
- [LangAlpha](https://github.com/ginlix-ai/langalpha)
- [Snyk: Top Claude Skills for Finance](https://snyk.io/articles/top-claude-skills-finance-quantitative-developers/)

### Reference Articles
- [Alpha Vantage IEX Cloud shutdown migration guide](https://www.alphavantage.co/iexcloud_shutdown_analysis_and_migration/)
- [Best Free Stock APIs (2026)](https://dev.to/nexgendata/best-free-stock-market-apis-and-data-tools-in-2026-a-developers-honest-comparison-1926)
- [Best Financial Data APIs (2026)](https://www.nb-data.com/p/best-financial-data-apis-in-2026)

---

## Next Actions for Tiago

1. **Decide MCP priority:** EdgarTools first (highest coverage), or pair with Finnhub API right away?
2. **Test Finnhub free tier:** Sign up and run sample queries against portfolio watchlist
3. **Pick first skill to build:** Recommend starting with `ticker-snapshot` (2–4 hrs, immediate value)
4. **Document ATLAS workflow:** How should ATLAS chain calls? E.g., Finnhub → EdgarTools → FRED for full investment thesis?
5. **Sandbox for portfolio data:** Where does Tiago keep positions (CSV, Supabase, spreadsheet)?
