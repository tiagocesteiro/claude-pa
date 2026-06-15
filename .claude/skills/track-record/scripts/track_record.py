#!/usr/bin/env python3
"""
track-record — log ATLAS's directional calls and grade them over time.

Every time ATLAS issues a real call (bullish/bearish on a ticker, with a
horizon), log it. Later, `review` fetches live prices and grades open calls;
`scorecard` aggregates the hit rate so ATLAS is accountable and can learn.

Store: data/calls.jsonl (append-only, one JSON object per line).

Usage:
    # Log a call (entry + benchmark fetched live if --entry omitted)
    python track_record.py log --ticker GEV --bias bullish --horizon medium \\
        --source screener --thesis "grid capex supercycle" [--target 1100] [--stop 820]

    # Grade open calls: MTM, alpha vs SPY, target/stop hits, due verdicts
    python track_record.py review

    # Aggregate hit rate by bias / horizon / source
    python track_record.py scorecard

    # List everything (incl. closed)
    python track_record.py list --all

Env: FINNHUB_API_KEY (for live prices).
Horizons: short ~30d, medium ~180d, long ~730d (when a call becomes "due").
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[4]
SKILLS = REPO_ROOT / ".claude" / "skills"
sys.path.insert(0, str(SKILLS / "ticker-snapshot" / "scripts"))

import snapshot as snap  # noqa: E402  (Finnhub quote helper)

CALLS = REPO_ROOT / "data" / "calls.jsonl"
BENCHMARK = "SPY"
HORIZON_DAYS = {"short": 30, "medium": 180, "long": 730}


# ---------------------------------------------------------------------------
# Store
# ---------------------------------------------------------------------------

def _load() -> list[dict]:
    if not CALLS.exists():
        return []
    rows = []
    for line in CALLS.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def _append(call: dict) -> None:
    CALLS.parent.mkdir(parents=True, exist_ok=True)
    with open(CALLS, "a", encoding="utf-8") as f:
        f.write(json.dumps(call, ensure_ascii=False) + "\n")


def _rewrite(rows: list[dict]) -> None:
    with open(CALLS, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def _price(ticker: str) -> float | None:
    q = snap.quote(ticker)
    c = q.get("c") if isinstance(q, dict) else None
    return float(c) if c else None


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_log(args) -> None:
    entry = args.entry if args.entry is not None else _price(args.ticker)
    if entry is None:
        sys.exit(f"ERROR: could not fetch entry price for {args.ticker}; pass --entry explicitly.")
    bench = _price(BENCHMARK)

    call = {
        "id": uuid.uuid4().hex[:8],
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "ticker": args.ticker.upper(),
        "bias": args.bias,
        "entry_price": round(entry, 2),
        "benchmark_entry": round(bench, 2) if bench else None,
        "horizon": args.horizon,
        "target": args.target,
        "stop": args.stop,
        "source": args.source,
        "thesis": args.thesis or "",
        "status": "open",
    }
    _append(call)
    print(f"Logged [{call['id']}] {call['bias'].upper()} {call['ticker']} @ {entry:.2f} "
          f"({args.horizon}, src={args.source})")


def _days_since(date_str: str) -> int:
    d = datetime.strptime(date_str, "%Y-%m-%d").date()
    return (datetime.now(timezone.utc).date() - d).days


def _call_return(bias: str, entry: float, now: float) -> float:
    """Return % from the call's point of view (a bearish call profits when price falls)."""
    raw = (now - entry) / entry * 100
    return raw if bias == "bullish" else -raw


def _evaluate(call: dict, now: float, bench_now: float | None) -> dict:
    entry = call["entry_price"]
    cr = _call_return(call["bias"], entry, now)
    alpha = None
    if bench_now and call.get("benchmark_entry"):
        bench_ret = (bench_now - call["benchmark_entry"]) / call["benchmark_entry"] * 100
        bench_cr = bench_ret if call["bias"] == "bullish" else -bench_ret
        alpha = cr - bench_cr
    days = _days_since(call["date"])
    due = days >= HORIZON_DAYS.get(call["horizon"], 180)

    # Target/stop short-circuit (directional)
    hit = None
    t, s = call.get("target"), call.get("stop")
    if call["bias"] == "bullish":
        if t and now >= t:
            hit = "target"
        elif s and now <= s:
            hit = "stop"
    else:
        if t and now <= t:
            hit = "target"
        elif s and now >= s:
            hit = "stop"

    if hit == "target":
        verdict = "WIN (target)"
    elif hit == "stop":
        verdict = "LOSS (stop)"
    elif due:
        verdict = "WIN" if cr > 0 else "LOSS"
    else:
        verdict = "pending"
    return {"call_return": cr, "alpha": alpha, "days": days, "due": due, "verdict": verdict, "hit": hit}


def cmd_review(args) -> None:
    rows = _load()
    open_calls = [r for r in rows if r.get("status") == "open"]
    if not open_calls:
        print("No open calls. Log some with `track_record.py log`.")
        return

    bench_now = _price(BENCHMARK)
    out = ["# ATLAS Track Record — Review", ""]
    out.append("| ID | Date | Call | Entry | Now | Call ret | Alpha | Age | Verdict |")
    out.append("|---|---|---|---:|---:|---:|---:|---:|---|")

    closed_ids = []
    for c in sorted(open_calls, key=lambda r: r["date"]):
        now = _price(c["ticker"])
        if now is None:
            out.append(f"| {c['id']} | {c['date']} | {c['bias'][:4]} {c['ticker']} | "
                       f"{c['entry_price']:.2f} | N/A | — | — | — | no price |")
            continue
        ev = _evaluate(c, now, bench_now)
        alpha_s = f"{ev['alpha']:+.1f}%" if ev["alpha"] is not None else "—"
        out.append(
            f"| {c['id']} | {c['date']} | {c['bias'][:4]} {c['ticker']} "
            f"| {c['entry_price']:.2f} | {now:.2f} | {ev['call_return']:+.1f}% "
            f"| {alpha_s} | {ev['days']}d | {ev['verdict']} |"
        )
        # Auto-close calls that reached a verdict (due or target/stop hit)
        if ev["verdict"] != "pending":
            c["status"] = "closed"
            c["closed_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            c["exit_price"] = round(now, 2)
            c["result"] = ev["verdict"]
            c["final_return"] = round(ev["call_return"], 2)
            c["final_alpha"] = round(ev["alpha"], 2) if ev["alpha"] is not None else None
            closed_ids.append(c["id"])

    if closed_ids and not args.dry_run:
        _rewrite(rows)
        out.append("")
        out.append(f"_Closed {len(closed_ids)} call(s) that reached a verdict: {', '.join(closed_ids)}._")

    out.append("")
    out.append("_Call ret = return from the call's direction (bearish profits when price falls). "
               "Alpha = call ret minus SPY over the same window._")
    print("\n".join(out))


def cmd_scorecard(args) -> None:
    rows = _load()
    closed = [r for r in rows if r.get("status") == "closed"]
    if not closed:
        print("No closed calls yet — nothing to score. Run `review` once calls reach their horizon.")
        return

    def _stats(subset):
        n = len(subset)
        wins = sum(1 for r in subset if str(r.get("result", "")).startswith("WIN"))
        avg = sum(r.get("final_return", 0) for r in subset) / n if n else 0
        alphas = [r["final_alpha"] for r in subset if r.get("final_alpha") is not None]
        avg_alpha = sum(alphas) / len(alphas) if alphas else None
        wr = wins / n * 100 if n else 0
        return n, wr, avg, avg_alpha

    out = ["# ATLAS Scorecard", ""]
    n, wr, avg, aa = _stats(closed)
    aa_s = f" · avg alpha {aa:+.1f}%" if aa is not None else ""
    out.append(f"**Overall:** {n} calls · {wr:.0f}% win rate · avg return {avg:+.1f}%{aa_s}")
    out.append("")

    for dim in ("bias", "horizon", "source"):
        groups: dict[str, list] = {}
        for r in closed:
            groups.setdefault(r.get(dim, "?"), []).append(r)
        out.append(f"## By {dim}")
        for k, sub in sorted(groups.items(), key=lambda kv: -len(kv[1])):
            gn, gwr, gavg, _ = _stats(sub)
            out.append(f"- {k}: {gn} calls · {gwr:.0f}% win · {gavg:+.1f}% avg")
        out.append("")
    print("\n".join(out))


def cmd_list(args) -> None:
    rows = _load()
    if not args.all:
        rows = [r for r in rows if r.get("status") == "open"]
    if not rows:
        print("No calls.")
        return
    for r in sorted(rows, key=lambda x: x["date"]):
        tgt = f" T:{r['target']}" if r.get("target") else ""
        stp = f" S:{r['stop']}" if r.get("stop") else ""
        status = r.get("result") or r.get("status")
        print(f"[{r['id']}] {r['date']} {r['bias'].upper():7} {r['ticker']:6} @ {r['entry_price']:>8.2f}"
              f"{tgt}{stp}  {r['horizon']:6} {r['source']:12} {status}  — {r.get('thesis','')}")


def main():
    ap = argparse.ArgumentParser(description="ATLAS call track record")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_log = sub.add_parser("log", help="Log a new directional call")
    p_log.add_argument("--ticker", required=True)
    p_log.add_argument("--bias", required=True, choices=["bullish", "bearish"])
    p_log.add_argument("--horizon", required=True, choices=["short", "medium", "long"])
    p_log.add_argument("--source", default="atlas", help="screener | analysis | briefing | youtube | manual")
    p_log.add_argument("--thesis", default="")
    p_log.add_argument("--entry", type=float, default=None, help="Entry price (live-fetched if omitted)")
    p_log.add_argument("--target", type=float, default=None)
    p_log.add_argument("--stop", type=float, default=None)
    p_log.set_defaults(func=cmd_log)

    p_rev = sub.add_parser("review", help="Grade open calls (MTM + due verdicts)")
    p_rev.add_argument("--dry-run", action="store_true", help="Don't auto-close calls that reached a verdict")
    p_rev.set_defaults(func=cmd_review)

    p_sc = sub.add_parser("scorecard", help="Aggregate hit rate")
    p_sc.set_defaults(func=cmd_scorecard)

    p_ls = sub.add_parser("list", help="List calls")
    p_ls.add_argument("--all", action="store_true", help="Include closed calls")
    p_ls.set_defaults(func=cmd_list)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
