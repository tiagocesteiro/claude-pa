#!/usr/bin/env python3
"""
stock-screener — scan a universe of tickers and rank investment leads by a
multi-factor score (momentum, growth, quality, value) + insider buying on the
finalists.

Built for ATLAS. Reuses the ticker-snapshot Finnhub helpers so there's one
source of truth for data fetching.

Usage:
    python screener.py                 # full scan, default universe + profile
    python screener.py --top 12        # show more finalists
    python screener.py --bucket complement   # only diversifying names
    python screener.py --no-insider    # skip the (slow) EDGAR insider step
    python screener.py --universe path.yaml --profile path.yaml

Env: FINNHUB_API_KEY (scan), SEC_IDENTITY (insider step).
Rate limit: Finnhub free = 60 req/min; the scan sleeps ~1s between tickers.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[4]
SKILLS = REPO_ROOT / ".claude" / "skills"
sys.path.insert(0, str(SKILLS / "ticker-snapshot" / "scripts"))
sys.path.insert(0, str(SKILLS / "sec-filings" / "scripts"))

try:
    import yaml
except ImportError:
    sys.exit("ERROR: pyyaml not installed. Run: pip install pyyaml")

import snapshot as snap  # noqa: E402  (Finnhub quote/profile/metrics helpers)

DEFAULT_UNIVERSE = REPO_ROOT / "data" / "screener_universe.yaml"
DEFAULT_PROFILE = REPO_ROOT / "data" / "screener_profile.yaml"


# ---------------------------------------------------------------------------
# Config loading
# ---------------------------------------------------------------------------

def load_universe(path: Path) -> list[dict]:
    """Flatten the YAML into [{ticker, bucket, theme}, ...]."""
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    rows = []
    seen = set()
    for bucket in ("complement", "reinforce"):
        for theme, tickers in (data.get(bucket) or {}).items():
            for t in tickers or []:
                t = t.upper()
                if t in seen:
                    continue
                seen.add(t)
                rows.append({"ticker": t, "bucket": bucket, "theme": theme})
    return rows


def load_profile(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


# ---------------------------------------------------------------------------
# Factor extraction
# ---------------------------------------------------------------------------

def _f(metric: dict, *keys):
    """First non-null metric value among keys."""
    for k in keys:
        v = metric.get(k)
        if v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                continue
    return None


def fetch_factors(ticker: str) -> dict | None:
    """One Finnhub /stock/metric call → raw factor values for a ticker."""
    m_raw = snap.metrics(ticker)
    if m_raw.get("_error"):
        return None
    m = m_raw.get("metric", {})
    if not m:
        return None
    return {
        "momentum": _f(m, "26WeekPriceReturnDaily"),
        "momentum_13w": _f(m, "13WeekPriceReturnDaily"),
        "rev_growth": _f(m, "revenueGrowthTTMYoy", "revenueGrowthQuarterlyYoy"),
        "eps_growth": _f(m, "epsGrowthTTMYoy", "epsGrowthQuarterlyYoy"),
        "roe": _f(m, "roeTTM"),
        "net_margin": _f(m, "netProfitMarginTTM"),
        "debt_equity": _f(m, "totalDebt/totalEquityAnnual", "totalDebt/totalEquityQuarterly"),
        "pe": _f(m, "peTTM"),
        "ev_fcf": _f(m, "currentEv/freeCashFlowTTM"),
        "high_52w": _f(m, "52WeekHigh"),
        "low_52w": _f(m, "52WeekLow"),
    }


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def _percentile_ranks(values: dict[str, float | None], higher_is_better: bool = True) -> dict[str, float]:
    """Map ticker -> 0..100 percentile within the non-null cohort.

    Tickers with no value get 50 (neutral) so a single missing factor doesn't
    nuke an otherwise strong candidate.
    """
    present = {t: v for t, v in values.items() if v is not None}
    out: dict[str, float] = {}
    if not present:
        return {t: 50.0 for t in values}
    ordered = sorted(present.items(), key=lambda kv: kv[1], reverse=not higher_is_better)
    # ordered ascending in "worst first" order; assign rank percentile
    n = len(ordered)
    for i, (t, _v) in enumerate(ordered):
        out[t] = (i / (n - 1) * 100) if n > 1 else 100.0
    for t in values:
        if t not in out:
            out[t] = 50.0
    return out


def score_universe(rows: list[dict], factors: dict[str, dict], profile: dict) -> list[dict]:
    weights = profile.get("weights", {})
    mult = profile.get("bucket_multiplier", {"complement": 1.0, "reinforce": 1.0})
    cap = profile.get("momentum_cap_pct", 120)

    tickers = [r["ticker"] for r in rows if factors.get(r["ticker"])]

    # Momentum: cap blow-off tops before ranking.
    momentum_vals = {}
    for t in tickers:
        mv = factors[t].get("momentum")
        if mv is not None:
            mv = min(mv, cap)
        momentum_vals[t] = mv

    # Composite growth = average of available growth factors.
    growth_vals = {}
    for t in tickers:
        g = [factors[t].get("rev_growth"), factors[t].get("eps_growth")]
        g = [x for x in g if x is not None]
        growth_vals[t] = (sum(g) / len(g)) if g else None

    # Composite quality = ROE + net margin (higher better), debt/equity (lower better).
    roe_rank = _percentile_ranks({t: factors[t].get("roe") for t in tickers}, higher_is_better=True)
    margin_rank = _percentile_ranks({t: factors[t].get("net_margin") for t in tickers}, higher_is_better=True)
    de_rank = _percentile_ranks({t: factors[t].get("debt_equity") for t in tickers}, higher_is_better=False)
    quality_rank = {t: (roe_rank[t] + margin_rank[t] + de_rank[t]) / 3 for t in tickers}

    # Value = cheap P/E and EV/FCF (lower better). Negative/zero P/E treated as missing.
    pe_clean = {t: (factors[t].get("pe") if (factors[t].get("pe") or 0) > 0 else None) for t in tickers}
    fcf_clean = {t: (factors[t].get("ev_fcf") if (factors[t].get("ev_fcf") or 0) > 0 else None) for t in tickers}
    pe_rank = _percentile_ranks(pe_clean, higher_is_better=False)
    fcf_rank = _percentile_ranks(fcf_clean, higher_is_better=False)
    value_rank = {t: (pe_rank[t] + fcf_rank[t]) / 2 for t in tickers}

    momentum_rank = _percentile_ranks(momentum_vals, higher_is_better=True)
    growth_rank = _percentile_ranks(growth_vals, higher_is_better=True)

    by_ticker = {r["ticker"]: r for r in rows}
    scored = []
    for t in tickers:
        base = (
            weights.get("momentum", 0) * momentum_rank[t]
            + weights.get("growth", 0) * growth_rank[t]
            + weights.get("quality", 0) * quality_rank[t]
            + weights.get("value", 0) * value_rank[t]
        )
        # insider weight is applied later (only finalists), renormalise the visible base
        visible_w = weights.get("momentum", 0) + weights.get("growth", 0) + weights.get("quality", 0) + weights.get("value", 0)
        base = base / visible_w if visible_w else base
        bucket = by_ticker[t]["bucket"]
        final = base * mult.get(bucket, 1.0)
        scored.append({
            **by_ticker[t],
            "score": final,
            "base": base,
            "ranks": {
                "momentum": momentum_rank[t],
                "growth": growth_rank[t],
                "quality": quality_rank[t],
                "value": value_rank[t],
            },
            "factors": factors[t],
        })
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def _reason(row: dict) -> str:
    f = row["factors"]
    ranks = row["ranks"]
    bits = []
    mom = f.get("momentum")
    if mom is not None:
        bits.append(f"26wk {mom:+.0f}%")
    g = f.get("rev_growth")
    if g is not None:
        bits.append(f"rev growth {g:+.0f}%")
    roe = f.get("roe")
    if roe is not None:
        bits.append(f"ROE {roe:.0f}%")
    # name the strongest factor driving the score
    top_factor = max(ranks, key=ranks.get)
    bits.append(f"top: {top_factor}")
    return " · ".join(bits)


def report(scored: list[dict], profile: dict, top: int, run_insider: bool) -> str:
    out = ["# ATLAS Screener — Investment Leads", ""]
    if not scored:
        out.append("No scoreable tickers (check FINNHUB_API_KEY / rate limit).")
        return "\n".join(out)

    n_comp = sum(1 for s in scored[:top] if s["bucket"] == "complement")
    n_reinf = top - n_comp
    out.append(f"_Scanned {len(scored)} tickers · top {top}: {n_comp} complement / {n_reinf} reinforce_")
    out.append("")
    out.append("| # | Ticker | Theme | Bucket | Score | Why it ranked |")
    out.append("|---:|---|---|---|---:|---|")
    for i, s in enumerate(scored[:top], 1):
        out.append(
            f"| {i} | **{s['ticker']}** | {s['theme']} | {s['bucket']} "
            f"| {s['score']:.0f} | {_reason(s)} |"
        )

    # Insider check on finalists (slow — EDGAR parse).
    if run_insider:
        out.append("")
        out.append("## Insider signal (finalists)")
        try:
            import sec  # noqa
        except Exception:
            out.append("_sec-filings skill unavailable — skipped._")
            return "\n".join(out)
        for s in scored[:top]:
            t = s["ticker"]
            # ADRs / foreign tickers usually have no Form 4 — skip gracefully.
            try:
                summary = sec.insider(t, days=90)
                first_line = ""
                for ln in summary.splitlines():
                    if ln.startswith("**Signal:**"):
                        first_line = ln.replace("**Signal:**", "").strip()
                        break
                out.append(f"- **{t}**: {first_line or 'no open-market Form 4 data'}")
            except Exception:
                out.append(f"- **{t}**: insider lookup failed")
            time.sleep(0.3)

    out.append("")
    out.append("_Leads only — not buy calls. Run a full ATLAS analysis on any name before acting._")
    out.append("_Not financial advice._")
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="ATLAS multi-factor stock screener")
    ap.add_argument("--universe", default=str(DEFAULT_UNIVERSE))
    ap.add_argument("--profile", default=str(DEFAULT_PROFILE))
    ap.add_argument("--top", type=int, default=None, help="How many finalists to show")
    ap.add_argument("--bucket", choices=["complement", "reinforce"], help="Restrict to one bucket")
    ap.add_argument("--no-insider", action="store_true", help="Skip the EDGAR insider step")
    args = ap.parse_args()

    universe = load_universe(Path(args.universe))
    profile = load_profile(Path(args.profile))
    if args.bucket:
        universe = [r for r in universe if r["bucket"] == args.bucket]
    top = args.top or profile.get("finalists", 8)

    print(f"[screener] scanning {len(universe)} tickers (Finnhub)...", file=sys.stderr)
    factors: dict[str, dict] = {}
    for i, r in enumerate(universe):
        if i > 0:
            time.sleep(1.1)  # Finnhub free 60/min
        f = fetch_factors(r["ticker"])
        if f:
            factors[r["ticker"]] = f
        else:
            print(f"  [skip] {r['ticker']} — no data", file=sys.stderr)

    scored = score_universe(universe, factors, profile)
    print(report(scored, profile, top, run_insider=not args.no_insider))


if __name__ == "__main__":
    main()
