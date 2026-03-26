---
title: "PrintPal — Project Hub"
date: 2026-03-23
tags: [hub, project, 3d-printing-marketplace]
project: 3d-printing-marketplace
status: active
---

# PrintPal — Project Hub

> Global Design, Local Production. Click Globally, Print Locally.

**Status:** In development — core features built, MVP live on Vercel
**Priority:** PRIMARY

---

## Quick Links

- [[projects/3d-printing-marketplace/README|README]] — full project description, target market, roadmap
- [[projects/3d-printing-marketplace/site|Codebase]] — Next.js 16, Supabase, Tailwind CSS 4

---

## Research

| File | Topic | Date |
|---|---|---|
| [[research/3d-printing-consumer-marketplace-competitors-2026-03-06\|Consumer Competitors]] | Global competitor landscape | 2026-03-06 |
| [[research/3d-printing-marketplace-competitors-iberia-2026-03-06\|Iberia Competitors]] | Portugal/Spain specific | 2026-03-06 |
| [[research/3d-printing-marketplace-feasibility-unit-economics-2026-03-06\|Feasibility & Unit Economics]] | Business model validation | 2026-03-06 |
| [[research/printables-makerworld-api-research-2026-03-06\|Printables/MakerWorld API]] | Model catalog sourcing | 2026-03-06 |

---

## Key Decisions

See [[decisions/log|Decision Log]] for full history.

---

## Open Questions

- [ ] Order management flow (confirm/update status/tracking)
- [ ] Messaging system (buyer ↔ maker conversations)
- [ ] PT translations (next-intl)
- [ ] n8n webhook for order notifications
- [ ] Maker vetting / quality control strategy

---

## NotebookLM

**Notebook ID:** `76f9d16d-4cb3-4cfa-a024-6a4b4633fd77`

Sources loaded: Consumer Competitors, Iberia Competitors, Feasibility & Unit Economics, Printables/MakerWorld API

```bash
PYTHONIOENCODING=utf-8 notebooklm ask "your question" --notebook 76f9d16d-4cb3-4cfa-a024-6a4b4633fd77
```
