---
title: Dashboard
date: 2026-03-23
tags: [dashboard, meta]
---

# Dashboard

> Home base. Everything active, at a glance.

---

## Active Projects

| Project | Status | Priority | Hub |
|---|---|---|---|
| PrintPal (3D Marketplace) | In development | PRIMARY | [[projects/3d-printing-marketplace/HUB\|HUB]] |
| Smoothie Machine | Planning | SECONDARY | [[projects/smoothie-machine/HUB\|HUB]] |
| Clean & Maintain | Phase 1 | ACTIVE | `projects/clean-maintain/` |
| n8n Client Workflow | Ongoing | FREELANCE | — |

---

## Recent Research

```dataview
TABLE date, project, tags
FROM "research"
WHERE file.name != "README"
SORT date DESC
LIMIT 10
```

---

## Recent Decisions

See [[decisions/log|Decision Log]]

---

## Goals — Q1 2026

- [ ] Define MVP scope for 3D printing marketplace ← **IN PROGRESS**
- [ ] Evaluate smoothie machine feasibility ← **IN PROGRESS**
- [ ] Keep n8n email automation stable
- [ ] Decide which business idea to fully commit to

---

## Quick Nav

- [[context/current-priorities|Current Priorities]]
- [[context/goals|Goals]]
- [[decisions/log|Decision Log]]
- `research/` — all research reports
