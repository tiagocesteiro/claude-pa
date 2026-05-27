#!/usr/bin/env python3
"""
macro-briefing — pull macro data from FRED + IMF + World Bank.

Usage:
    python macro.py us          # US: Fed funds, yield curve, CPI, unemployment, NFP
    python macro.py fx          # DXY, EUR/USD, USD/JPY, USD/CNY
    python macro.py global      # IMF GDP forecasts for major economies
    python macro.py alert       # Auto-flag key risks (yield inversion, etc.)
    python macro.py all         # Everything in one report

Env: FRED_API_KEY (free at https://fredaccount.stlouisfed.org/apikeys)
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

FRED_BASE = "https://api.stlouisfed.org/fred"
IMF_BASE = "https://www.imf.org/external/datamapper/api/v1"
WB_BASE = "https://api.worldbank.org/v2"


def _http(url: str) -> dict | list | None:
    req = Request(url, headers={"User-Agent": "atlas-macro/1.0"})
    try:
        with urlopen(req, timeout=20) as resp:
            return json.loads(resp.read())
    except (HTTPError, URLError, json.JSONDecodeError) as e:
        return {"_error": str(e)}


def fred_latest(series_id: str) -> tuple[float | None, str | None]:
    key = os.environ.get("FRED_API_KEY")
    if not key:
        return None, "FRED_API_KEY not set"
    params = {"series_id": series_id, "api_key": key, "file_type": "json", "sort_order": "desc", "limit": 1}
    url = f"{FRED_BASE}/series/observations?{urlencode(params)}"
    res = _http(url)
    if isinstance(res, dict) and not res.get("_error"):
        obs = res.get("observations", [])
        if obs and obs[0].get("value") not in (".", None):
            try:
                return float(obs[0]["value"]), obs[0].get("date")
            except ValueError:
                return None, obs[0].get("date")
    return None, None


def _fmt(v, suffix=""):
    return f"{v:.2f}{suffix}" if isinstance(v, (int, float)) else "N/A"


def us_macro() -> str:
    series = {
        "Fed Funds Rate (effective)": ("DFF", "%"),
        "10Y Treasury yield": ("DGS10", "%"),
        "2Y Treasury yield": ("DGS2", "%"),
        "CPI YoY (headline)": ("CPIAUCSL", " idx"),
        "Core CPI YoY": ("CPILFESL", " idx"),
        "Unemployment rate": ("UNRATE", "%"),
        "Nonfarm payrolls (k)": ("PAYEMS", "k"),
        "Real GDP growth (QoQ ann.)": ("A191RL1Q225SBEA", "%"),
        "Initial jobless claims": ("ICSA", ""),
        "M2 money supply": ("M2SL", "B"),
    }

    out = ["# US Macro Briefing", f"_Source: FRED · fetched {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}_", ""]
    out.append("| Indicator | Latest | Date |")
    out.append("|---|---|---|")

    values = {}
    for label, (sid, suf) in series.items():
        v, d = fred_latest(sid)
        values[label] = v
        out.append(f"| {label} | {_fmt(v, suf)} | {d or 'N/A'} |")

    # Yield curve check
    y10 = values.get("10Y Treasury yield")
    y2 = values.get("2Y Treasury yield")
    if y10 is not None and y2 is not None:
        spread = y10 - y2
        signal = "🚨 INVERTED (recession signal)" if spread < 0 else "✅ Normal"
        out.append("")
        out.append(f"**Yield curve (10Y–2Y):** {spread:+.2f}pp — {signal}")

    return "\n".join(out)


def fx() -> str:
    pairs = {
        "DXY (Trade-Weighted USD)": "DTWEXBGS",
        "EUR/USD": "DEXUSEU",
        "USD/JPY": "DEXJPUS",
        "USD/CNY": "DEXCHUS",
        "GBP/USD": "DEXUSUK",
        "USD/CHF": "DEXSZUS",
        "USD/CAD": "DEXCAUS",
    }
    out = ["# FX Briefing", f"_Source: FRED · fetched {datetime.now(timezone.utc).strftime('%Y-%m-%d')}_", ""]
    out.append("| Pair | Rate | Date |")
    out.append("|---|---|---|")
    for label, sid in pairs.items():
        v, d = fred_latest(sid)
        out.append(f"| {label} | {_fmt(v)} | {d or 'N/A'} |")
    return "\n".join(out)


def imf_indicator(indicator: str, countries: list[str]) -> dict:
    url = f"{IMF_BASE}/{indicator}/{'/'.join(countries)}"
    res = _http(url)
    if isinstance(res, dict) and "values" in res:
        return res["values"].get(indicator, {})
    return {}


def global_macro() -> str:
    """IMF GDP growth forecasts + inflation for major economies."""
    countries = ["USA", "CHN", "DEU", "JPN", "IND", "GBR", "FRA", "ITA", "BRA", "RUS", "KOR", "PRT"]
    out = ["# Global Macro Briefing", f"_Source: IMF WEO · fetched {datetime.now(timezone.utc).strftime('%Y-%m-%d')}_", ""]

    gdp = imf_indicator("NGDP_RPCH", countries)
    cpi = imf_indicator("PCPIPCH", countries)
    unemp = imf_indicator("LUR", countries)

    if not gdp:
        return "\n".join(out + ["IMF API unavailable or returned no data."])

    years = sorted({y for c in gdp.values() for y in c.keys()})[-3:]
    out.append(f"## Real GDP growth (%) — {', '.join(years)}")
    out.append("| Country | " + " | ".join(years) + " |")
    out.append("|---" * (len(years) + 1) + "|")
    for c in countries:
        row = [c] + [_fmt(gdp.get(c, {}).get(y)) for y in years]
        out.append("| " + " | ".join(row) + " |")

    if cpi:
        years_cpi = sorted({y for c in cpi.values() for y in c.keys()})[-3:]
        out.append("")
        out.append(f"## Inflation (CPI %) — {', '.join(years_cpi)}")
        out.append("| Country | " + " | ".join(years_cpi) + " |")
        out.append("|---" * (len(years_cpi) + 1) + "|")
        for c in countries:
            row = [c] + [_fmt(cpi.get(c, {}).get(y)) for y in years_cpi]
            out.append("| " + " | ".join(row) + " |")

    if unemp:
        years_u = sorted({y for c in unemp.values() for y in c.keys()})[-3:]
        out.append("")
        out.append(f"## Unemployment (%) — {', '.join(years_u)}")
        out.append("| Country | " + " | ".join(years_u) + " |")
        out.append("|---" * (len(years_u) + 1) + "|")
        for c in countries:
            row = [c] + [_fmt(unemp.get(c, {}).get(y)) for y in years_u]
            out.append("| " + " | ".join(row) + " |")

    return "\n".join(out)


def alert() -> str:
    """Auto-detect macro red flags."""
    out = ["# Macro Alert Scan", f"_Scanned {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}_", ""]
    flags = []

    y10, _ = fred_latest("DGS10")
    y2, _ = fred_latest("DGS2")
    if y10 is not None and y2 is not None:
        spread = y10 - y2
        if spread < 0:
            flags.append(f"🚨 **Yield curve inverted:** 10Y–2Y = {spread:+.2f}pp (historical recession leader 6–18mo)")
        elif spread < 0.25:
            flags.append(f"⚠️ **Yield curve very flat:** 10Y–2Y = {spread:+.2f}pp")

    claims, _ = fred_latest("ICSA")
    if claims is not None and claims > 300000:
        flags.append(f"⚠️ **Initial jobless claims elevated:** {claims:,.0f} (>300k = labour cooling)")

    unemp, _ = fred_latest("UNRATE")
    if unemp is not None and unemp > 4.5:
        flags.append(f"⚠️ **Unemployment elevated:** {unemp:.1f}% (Sahm rule territory near 4.5%+)")

    dxy, _ = fred_latest("DTWEXBGS")
    if dxy is not None and dxy > 125:
        flags.append(f"⚠️ **USD very strong:** trade-weighted index at {dxy:.1f} (headwind for EM + commodities)")

    if not flags:
        out.append("✅ No major macro red flags detected from monitored indicators.")
    else:
        out.extend(flags)

    return "\n".join(out)


def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: macro.py {us|fx|global|alert|all}")
    cmd = sys.argv[1].lower()
    if cmd == "us":
        print(us_macro())
    elif cmd == "fx":
        print(fx())
    elif cmd == "global":
        print(global_macro())
    elif cmd == "alert":
        print(alert())
    elif cmd == "all":
        print(us_macro())
        print("\n\n---\n\n")
        print(fx())
        print("\n\n---\n\n")
        print(global_macro())
        print("\n\n---\n\n")
        print(alert())
    else:
        sys.exit(f"Unknown command: {cmd}. Use one of: us, fx, global, alert, all")


if __name__ == "__main__":
    main()
