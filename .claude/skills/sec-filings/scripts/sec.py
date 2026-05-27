#!/usr/bin/env python3
"""
sec-filings — SEC EDGAR access via edgartools (no API key needed).

Usage:
    python edgar.py latest TICKER [--n 5]      # last N filings (any form)
    python edgar.py insider TICKER [--days 90] # insider trades (Form 4)
    python edgar.py metrics TICKER             # key financials from latest 10-Q/10-K

Setup:
    pip install "edgartools[ai]"
    Set SEC_IDENTITY env var (required by SEC): "Your Name your@email.com"
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timedelta, timezone

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from edgar import Company, set_identity
except ImportError:
    sys.exit("ERROR: edgartools not installed. Run: pip install \"edgartools[ai]\"")


def _identify():
    ident = os.environ.get("SEC_IDENTITY")
    if not ident:
        # SEC requires identifying yourself in User-Agent. Use a sane fallback but warn.
        ident = "ATLAS Investment Analyst atlas@example.com"
    set_identity(ident)


def _fmt_money(n):
    if n is None:
        return "N/A"
    try:
        n = float(n)
    except (TypeError, ValueError):
        return str(n)
    if abs(n) >= 1e12:
        return f"${n/1e12:.2f}T"
    if abs(n) >= 1e9:
        return f"${n/1e9:.2f}B"
    if abs(n) >= 1e6:
        return f"${n/1e6:.2f}M"
    return f"${n:,.0f}"


def latest(ticker: str, n: int = 5) -> str:
    _identify()
    try:
        c = Company(ticker.upper())
    except Exception as e:
        return f"ERROR: cannot find {ticker} on EDGAR ({e})"

    out = [f"# Latest SEC filings: {ticker.upper()} — {c.name}", ""]
    filings = c.get_filings().head(n)
    out.append("| Date | Form | Description |")
    out.append("|---|---|---|")
    for f in filings:
        date = getattr(f, "filing_date", "?")
        form = getattr(f, "form", "?")
        desc = (getattr(f, "primary_doc_description", "") or "")[:60]
        out.append(f"| {date} | {form} | {desc} |")
    return "\n".join(out)


def insider(ticker: str, days: int = 90) -> str:
    _identify()
    try:
        c = Company(ticker.upper())
    except Exception as e:
        return f"ERROR: cannot find {ticker} on EDGAR ({e})"

    cutoff = datetime.now(timezone.utc).date() - timedelta(days=days)
    out = [f"# Insider activity: {ticker.upper()} — last {days} days", ""]

    try:
        form4 = c.get_filings(form="4").head(40)
    except Exception as e:
        return f"ERROR fetching Form 4: {e}"

    rows = []
    for f in form4:
        try:
            fd = getattr(f, "filing_date", None)
            if fd is None:
                continue
            fd_date = fd if hasattr(fd, "year") else datetime.fromisoformat(str(fd)).date()
            if fd_date < cutoff:
                continue
            rows.append((fd_date, getattr(f, "accession_number", "")))
        except Exception:
            continue

    if not rows:
        out.append(f"No Form 4 filings in the last {days} days.")
        return "\n".join(out)

    out.append(f"**{len(rows)} insider filings (Form 4) in the last {days} days.**")
    out.append("")
    out.append("| Date | Accession |")
    out.append("|---|---|")
    for fd, acc in rows[:20]:
        out.append(f"| {fd} | {acc} |")
    out.append("")
    out.append(f"_Raw counts only. For trade direction (buy/sell) and $ amounts, open the filings on SEC EDGAR._")
    return "\n".join(out)


def metrics(ticker: str) -> str:
    _identify()
    try:
        c = Company(ticker.upper())
    except Exception as e:
        return f"ERROR: cannot find {ticker} on EDGAR ({e})"

    out = [f"# Key financials: {ticker.upper()} — {c.name}", ""]

    # Try latest 10-Q first, then 10-K
    target = None
    for form in ("10-Q", "10-K"):
        try:
            f = c.get_filings(form=form).head(1)
            if len(f) > 0:
                target = f[0]
                out.append(f"_Source: {form} filed {getattr(target, 'filing_date', '?')}_")
                break
        except Exception:
            continue

    if target is None:
        out.append("No 10-K or 10-Q found.")
        return "\n".join(out)

    try:
        obj = target.obj()
        fin = getattr(obj, "financials", None) or getattr(obj, "get_financials", lambda: None)()
        if fin is None:
            out.append("")
            out.append("Filing fetched but structured financials unavailable. Open on EDGAR.")
            return "\n".join(out)

        # edgartools API surface varies; try multiple shapes
        out.append("")
        out.append("## Income Statement")
        for attr in ("get_income_statement", "income_statement"):
            v = getattr(fin, attr, None)
            if v is not None:
                stmt = v() if callable(v) else v
                out.append(f"```\n{str(stmt)[:2000]}\n```")
                break

        out.append("")
        out.append("## Balance Sheet")
        for attr in ("get_balance_sheet", "balance_sheet"):
            v = getattr(fin, attr, None)
            if v is not None:
                stmt = v() if callable(v) else v
                out.append(f"```\n{str(stmt)[:2000]}\n```")
                break

        out.append("")
        out.append("## Cash Flow")
        for attr in ("get_cash_flow_statement", "cash_flow_statement", "cashflow"):
            v = getattr(fin, attr, None)
            if v is not None:
                stmt = v() if callable(v) else v
                out.append(f"```\n{str(stmt)[:2000]}\n```")
                break

    except Exception as e:
        out.append(f"\nCould not parse financials: {e}")

    return "\n".join(out)


def main():
    parser = argparse.ArgumentParser(description="SEC EDGAR access")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_latest = sub.add_parser("latest", help="Latest N filings")
    p_latest.add_argument("ticker")
    p_latest.add_argument("--n", type=int, default=5)

    p_ins = sub.add_parser("insider", help="Form 4 insider trades")
    p_ins.add_argument("ticker")
    p_ins.add_argument("--days", type=int, default=90)

    p_met = sub.add_parser("metrics", help="Financial statements from latest 10-Q/10-K")
    p_met.add_argument("ticker")

    args = parser.parse_args()

    if args.cmd == "latest":
        print(latest(args.ticker, args.n))
    elif args.cmd == "insider":
        print(insider(args.ticker, args.days))
    elif args.cmd == "metrics":
        print(metrics(args.ticker))


if __name__ == "__main__":
    main()
