#!/usr/bin/env python3
"""
ticker-snapshot — one-shot ticker info via Finnhub free API.

Usage:
    python snapshot.py TICKER [TICKER ...]
    python snapshot.py NVDA
    python snapshot.py AAPL MSFT GOOGL

Env: FINNHUB_API_KEY (free at https://finnhub.io/register)
Rate limit: 60 req/min on free tier.
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

API_BASE = "https://finnhub.io/api/v1"


def _get(path: str, params: dict) -> dict:
    key = os.environ.get("FINNHUB_API_KEY")
    if not key:
        sys.exit("ERROR: FINNHUB_API_KEY not set. Get a free key at https://finnhub.io/register")
    params = {**params, "token": key}
    url = f"{API_BASE}{path}?{urlencode(params)}"
    req = Request(url, headers={"User-Agent": "atlas-ticker-snapshot/1.0"})
    try:
        with urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        if e.code == 429:
            return {"_error": "rate_limited"}
        return {"_error": f"http_{e.code}"}
    except URLError as e:
        return {"_error": f"network: {e.reason}"}


def quote(ticker: str) -> dict:
    return _get("/quote", {"symbol": ticker})


def profile(ticker: str) -> dict:
    return _get("/stock/profile2", {"symbol": ticker})


def metrics(ticker: str) -> dict:
    return _get("/stock/metric", {"symbol": ticker, "metric": "all"})


def earnings_calendar(ticker: str) -> dict:
    today = datetime.now(timezone.utc).date()
    to = today + timedelta(days=120)
    return _get("/calendar/earnings", {"from": str(today), "to": str(to), "symbol": ticker})


def company_news(ticker: str, days: int = 7) -> list:
    today = datetime.now(timezone.utc).date()
    frm = today - timedelta(days=days)
    res = _get("/company-news", {"symbol": ticker, "from": str(frm), "to": str(today)})
    return res if isinstance(res, list) else []


def news_sentiment(ticker: str) -> dict:
    return _get("/news-sentiment", {"symbol": ticker})


def _fmt_money(n):
    if n is None or n == 0:
        return "N/A"
    if abs(n) >= 1e12:
        return f"${n/1e12:.2f}T"
    if abs(n) >= 1e9:
        return f"${n/1e9:.2f}B"
    if abs(n) >= 1e6:
        return f"${n/1e6:.2f}M"
    return f"${n:,.2f}"


def _fmt_pct(n):
    return "N/A" if n is None else f"{n:+.2f}%"


def _fmt_num(n, decimals=2):
    return "N/A" if n is None else f"{n:.{decimals}f}"


def snapshot(ticker: str) -> str:
    ticker = ticker.upper()
    q = quote(ticker)
    p = profile(ticker)
    m = metrics(ticker).get("metric", {}) if not metrics(ticker).get("_error") else {}
    ec = earnings_calendar(ticker)
    sent = news_sentiment(ticker)
    news = company_news(ticker, days=7)

    if q.get("_error") or not q.get("c"):
        return f"ATLAS snapshot: {ticker} — no data (error: {q.get('_error', 'empty')})"

    price = q.get("c")
    prev = q.get("pc", 0)
    change_pct = ((price - prev) / prev * 100) if prev else 0
    high_52w = m.get("52WeekHigh")
    low_52w = m.get("52WeekLow")

    next_er = "N/A"
    er_list = ec.get("earningsCalendar", []) if isinstance(ec, dict) else []
    if er_list:
        next_er = er_list[0].get("date", "N/A")

    bullish = sent.get("sentiment", {}).get("bullishPercent")
    bearish = sent.get("sentiment", {}).get("bearishPercent")

    lines = [
        f"# ATLAS Snapshot: {ticker} — {p.get('name', 'Unknown')}",
        f"_{p.get('finnhubIndustry', 'N/A')} · {p.get('exchange', 'N/A')} · {p.get('country', 'N/A')}_",
        "",
        "## Price",
        f"- **Current:** ${_fmt_num(price)} ({_fmt_pct(change_pct)} today)",
        f"- **Day range:** ${_fmt_num(q.get('l'))} – ${_fmt_num(q.get('h'))}",
        f"- **52W range:** ${_fmt_num(low_52w)} – ${_fmt_num(high_52w)}",
        f"- **Open:** ${_fmt_num(q.get('o'))} · **Prev close:** ${_fmt_num(prev)}",
        "",
        "## Valuation & Quality",
        f"- **Market cap:** {_fmt_money((p.get('marketCapitalization') or 0) * 1e6)}",
        f"- **P/E (TTM):** {_fmt_num(m.get('peTTM'))}",
        f"- **P/B:** {_fmt_num(m.get('pbAnnual'))}",
        f"- **P/S (TTM):** {_fmt_num(m.get('psTTM'))}",
        f"- **EV/EBITDA:** {_fmt_num(m.get('currentEv/freeCashFlowTTM'))}",
        f"- **Dividend yield:** {_fmt_num(m.get('dividendYieldIndicatedAnnual'))}%",
        f"- **ROE:** {_fmt_num(m.get('roeTTM'))}%",
        f"- **Net margin:** {_fmt_num(m.get('netProfitMarginTTM'))}%",
        f"- **Debt/Equity:** {_fmt_num(m.get('totalDebt/totalEquityAnnual'))}",
        "",
        "## Catalysts",
        f"- **Next earnings:** {next_er}",
        f"- **News last 7d:** {len(news)} articles",
    ]

    if bullish is not None:
        lines.append(f"- **Sentiment (Finnhub):** {bullish:.0%} bullish / {bearish:.0%} bearish")

    if news[:3]:
        lines.append("")
        lines.append("## Recent headlines")
        for n in news[:3]:
            dt = datetime.fromtimestamp(n.get("datetime", 0), tz=timezone.utc).strftime("%Y-%m-%d")
            headline = n.get("headline", "")[:120]
            lines.append(f"- [{dt}] {headline}")

    lines.append("")
    lines.append(f"_Data: Finnhub · fetched {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}_")
    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: snapshot.py TICKER [TICKER ...]")
    tickers = [t.upper() for t in sys.argv[1:]]
    out = []
    for i, t in enumerate(tickers):
        if i > 0:
            time.sleep(1.1)
            out.append("\n\n---\n\n")
        out.append(snapshot(t))
    print("".join(out))


if __name__ == "__main__":
    main()
