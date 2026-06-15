---
name: track-record
description: >
  Log ATLAS's directional calls (bullish/bearish on a ticker, with a horizon)
  and grade them over time — MTM, alpha vs SPY, hit rate. Use when ATLAS issues
  a real call, or when Tiago asks "how are your calls doing", "track record",
  "did you get X right", "win rate", "review your calls", "scorecard".
---

# track-record — ATLAS accountability & learning

ATLAS makes directional calls (in analyses, the daily briefing, YouTube critiques,
and screener leads). Without a record, there's no accountability and no learning.
This skill logs each call and grades it once it matures.

## When to log a call

Log whenever ATLAS commits to a **direction** on a ticker with conviction — not
for neutral/"watch" notes. Sources: `analysis`, `briefing`, `youtube`,
`screener`, `manual`.

```bash
python ".claude/skills/track-record/scripts/track_record.py" log \
  --ticker GEV --bias bullish --horizon medium --source analysis \
  --thesis "grid capex supercycle" [--entry 940] [--target 1100] [--stop 820]
```

- `--entry` is fetched live (Finnhub) if omitted. The benchmark (SPY) is also
  snapshotted at entry so alpha can be computed later.
- `--horizon`: `short` (~30d), `medium` (~180d), `long` (~730d) — sets when the
  call becomes "due" for a verdict.

## When to review

```bash
python ".claude/skills/track-record/scripts/track_record.py" review
```

- Fetches live prices for all open calls, shows call return (direction-aware:
  a bearish call profits when price falls), alpha vs SPY, and age.
- Calls that reach a verdict (past horizon, or target/stop hit) auto-close with
  a WIN/LOSS result. Use `--dry-run` to preview without closing.

```bash
python ".claude/skills/track-record/scripts/track_record.py" scorecard
python ".claude/skills/track-record/scripts/track_record.py" list --all
```

- `scorecard`: overall hit rate + average return + alpha, broken down by bias,
  horizon, and source. This is the honest mirror — if a source/horizon
  underperforms, ATLAS should say so and adjust.

## How verdicts work

- **target hit** → WIN, **stop hit** → LOSS (checked directionally, any time).
- Otherwise, once `age >= horizon days`: WIN if call return > 0, else LOSS.
- Alpha = call return minus SPY over the same window (the real test — beating
  cash is easy in a bull market; beating the index is the bar).

## Store

`data/calls.jsonl` — append-only, one JSON object per line. Open calls stay
open until a verdict; closed calls keep their exit price, result, and alpha.

## ATLAS habit

- After issuing a directional verdict in an analysis, **log it**.
- When Tiago asks for new leads or a briefing, occasionally surface the
  scorecard so calls stay honest ("last 90d: 6 calls, 4 wins, +3% avg alpha").
- Never bury a losing call — the point is to learn from it.
