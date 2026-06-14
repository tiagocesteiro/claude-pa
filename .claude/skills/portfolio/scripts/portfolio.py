#!/usr/bin/env python3
"""
portfolio — read data/portfolio.yaml and produce a live P&L report.

Usage:
    python portfolio.py                # full report
    python portfolio.py --no-prices    # just list positions, no API calls (offline)
    python portfolio.py --file path/to/portfolio.yaml

Env: FINNHUB_API_KEY (for live prices)
Reads: data/portfolio.yaml relative to repo root.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
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

REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_PORTFOLIO = REPO_ROOT / "data" / "portfolio.yaml"
FINNHUB = "https://finnhub.io/api/v1"
FRANKFURTER = "https://api.frankfurter.app"

# FX rate cache: (from_ccy, to_ccy) -> rate
_fx_cache: dict[tuple[str, str], float] = {}


def fx_rate(from_ccy: str, to_ccy: str) -> float | None:
    """Convert 1 unit of from_ccy to to_ccy via the ECB (frankfurter.app, free, no key).

    Returns None if the rate can't be fetched (caller should flag, not silently sum).
    """
    from_ccy = (from_ccy or "USD").upper()
    to_ccy = (to_ccy or "USD").upper()
    if from_ccy == to_ccy:
        return 1.0
    if (from_ccy, to_ccy) in _fx_cache:
        return _fx_cache[(from_ccy, to_ccy)]
    url = f"{FRANKFURTER}/latest?{urlencode({'base': from_ccy, 'symbols': to_ccy})}"
    req = Request(url, headers={"User-Agent": "atlas-portfolio/1.0"})
    try:
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        rate = data.get("rates", {}).get(to_ccy)
        if rate is not None:
            _fx_cache[(from_ccy, to_ccy)] = float(rate)
            return float(rate)
    except (HTTPError, URLError, json.JSONDecodeError, ValueError):
        pass
    return None


def _quote(ticker: str) -> dict:
    key = os.environ.get("FINNHUB_API_KEY")
    if not key:
        return {"_error": "FINNHUB_API_KEY not set"}
    url = f"{FINNHUB}/quote?{urlencode({'symbol': ticker, 'token': key})}"
    req = Request(url, headers={"User-Agent": "atlas-portfolio/1.0"})
    try:
        with urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except (HTTPError, URLError, json.JSONDecodeError) as e:
        return {"_error": str(e)}


def _profile(ticker: str) -> dict:
    key = os.environ.get("FINNHUB_API_KEY")
    if not key:
        return {}
    url = f"{FINNHUB}/stock/profile2?{urlencode({'symbol': ticker, 'token': key})}"
    req = Request(url, headers={"User-Agent": "atlas-portfolio/1.0"})
    try:
        with urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except (HTTPError, URLError, json.JSONDecodeError):
        return {}


def load_portfolio(path: Path) -> tuple[list[dict], str]:
    """Return (positions, base_currency). base_currency defaults to EUR."""
    if not path.exists():
        sys.exit(f"ERROR: portfolio file not found at {path}\nCreate it from the template.")
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    positions = data.get("positions", [])
    if not positions:
        sys.exit("ERROR: no positions in portfolio.yaml")
    base_currency = (data.get("base_currency") or "EUR").upper()
    return positions, base_currency


def _fmt_money(n, currency="USD"):
    sign = "$" if currency == "USD" else f"{currency} "
    if n is None:
        return "N/A"
    if abs(n) >= 1e9:
        return f"{sign}{n/1e9:,.2f}B"
    if abs(n) >= 1e6:
        return f"{sign}{n/1e6:,.2f}M"
    return f"{sign}{n:,.2f}"


def report(portfolio_path: Path, fetch_prices: bool = True) -> str:
    positions, base = load_portfolio(portfolio_path)
    out = ["# Portfolio Report", f"_Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} · base currency: {base}_", ""]

    rows = []
    sector_alloc: dict[str, float] = {}
    country_alloc: dict[str, float] = {}
    total_value = 0.0          # all in base currency
    total_cost = 0.0           # all in base currency
    fx_failures: set[str] = set()
    no_price: list[str] = []   # tickers excluded from totals (no live price)

    for i, pos in enumerate(positions):
        ticker = pos.get("ticker")
        qty = float(pos.get("qty", 0))
        avg_cost = float(pos.get("avg_cost", 0))
        currency = (pos.get("currency") or "USD").upper()
        sector_override = pos.get("sector")
        country_override = pos.get("country")

        # FX rate from this position's currency to the portfolio base currency.
        rate = fx_rate(currency, base) if fetch_prices else (1.0 if currency == base else None)
        if rate is None:
            fx_failures.add(currency)
            rate = 1.0  # fall back to 1:1 so we still show a number, but flag it

        cost_basis = qty * avg_cost                 # native currency
        cost_basis_base = cost_basis * rate         # base currency

        current_price = None
        pnl = None
        pnl_pct = None
        sector = sector_override or "?"
        country = country_override or "?"

        if fetch_prices:
            if i > 0:
                time.sleep(1.1)
            q = _quote(ticker)
            if not q.get("_error") and q.get("c"):
                current_price = q["c"]
                value_native = qty * current_price
                pnl = value_native - cost_basis            # native currency
                pnl_pct = (pnl / cost_basis * 100) if cost_basis else 0
                total_value += value_native * rate         # base currency
                total_cost += cost_basis_base              # only count cost where we have a price (keeps P&L coherent)
            else:
                no_price.append(ticker)
        else:
            total_cost += cost_basis_base
            if not sector_override or not country_override:
                p = _profile(ticker)
                sector = sector_override or p.get("finnhubIndustry", "?")
                country = country_override or p.get("country", "?")

        if current_price is not None:
            value_base = qty * current_price * rate
            sector_alloc[sector] = sector_alloc.get(sector, 0) + value_base
            country_alloc[country] = country_alloc.get(country, 0) + value_base

        rows.append({
            "ticker": ticker,
            "qty": qty,
            "avg_cost": avg_cost,
            "currency": currency,
            "current": current_price,
            "value": qty * current_price if current_price else None,
            "cost_basis": cost_basis,
            "pnl": pnl,
            "pnl_pct": pnl_pct,
            "sector": sector,
            "country": country,
        })

    # Positions table
    out.append("## Positions")
    out.append("| Ticker | Qty | Avg cost | Current | Value | Cost basis | P&L | P&L % |")
    out.append("|---|---:|---:|---:|---:|---:|---:|---:|")
    for r in rows:
        pnl_pct_str = f"{r['pnl_pct']:+.2f}%" if r["pnl_pct"] is not None else "N/A"
        out.append(
            f"| **{r['ticker']}** "
            f"| {r['qty']:g} "
            f"| {_fmt_money(r['avg_cost'], r['currency'])} "
            f"| {_fmt_money(r['current'], r['currency'])} "
            f"| {_fmt_money(r['value'], r['currency'])} "
            f"| {_fmt_money(r['cost_basis'], r['currency'])} "
            f"| {_fmt_money(r['pnl'], r['currency'])} "
            f"| {pnl_pct_str} |"
        )

    if total_value > 0:
        total_pnl = total_value - total_cost
        total_pnl_pct = total_pnl / total_cost * 100 if total_cost else 0
        out.append("")
        out.append(f"## Totals (converted to {base} via ECB rates)")
        out.append(f"- **Total value:** {_fmt_money(total_value, base)}")
        out.append(f"- **Total cost basis:** {_fmt_money(total_cost, base)}")
        out.append(f"- **Total P&L:** {_fmt_money(total_pnl, base)} ({total_pnl_pct:+.2f}%)")

    if sector_alloc:
        out.append("")
        out.append(f"## Sector allocation (% of {base} value)")
        total = sum(sector_alloc.values())
        for sec, val in sorted(sector_alloc.items(), key=lambda x: -x[1]):
            pct = val / total * 100 if total else 0
            out.append(f"- {sec}: {pct:.1f}% ({_fmt_money(val, base)})")

    if country_alloc:
        out.append("")
        out.append(f"## Country allocation (% of {base} value)")
        total = sum(country_alloc.values())
        for c, val in sorted(country_alloc.items(), key=lambda x: -x[1]):
            pct = val / total * 100 if total else 0
            out.append(f"- {c}: {pct:.1f}% ({_fmt_money(val, base)})")

    if no_price:
        out.append("")
        out.append(f"_⚠️ No live price for: {', '.join(no_price)} — excluded from totals & allocation (Finnhub free tier may not cover this listing)._")

    if fx_failures:
        out.append("")
        out.append(f"_⚠️ FX conversion failed for: {', '.join(sorted(fx_failures))} — those positions counted 1:1 into {base} (totals may be off). Check currency codes._")

    if not fetch_prices:
        out.append("")
        out.append("_⚠️ Prices not fetched (--no-prices). Run without flag for live P&L._")

    return "\n".join(out)


def main():
    parser = argparse.ArgumentParser(description="Live portfolio P&L report")
    parser.add_argument("--file", type=str, default=str(DEFAULT_PORTFOLIO))
    parser.add_argument("--no-prices", action="store_true", help="Skip live price fetch")
    args = parser.parse_args()

    print(report(Path(args.file), fetch_prices=not args.no_prices))


if __name__ == "__main__":
    main()
