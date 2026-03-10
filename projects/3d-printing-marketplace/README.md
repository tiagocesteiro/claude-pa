# Global Design, Local Production

A decentralized marketplace connecting customers with local 3D printer owners.

**Tagline:** Click Globally, Print Locally.
**Status:** Active -- planning phase

## Description

- Curated catalog of CC-licensed 3D models (sourced from Printables and similar)
- Geolocation-based matching to the nearest available printer
- Service layer: custom file uploads + designer consultancy
- Built-in licensing engine to keep creators and makers compliant

## Target Market

Consumer-facing ("Etsy for 3D printed objects") — not B2B/industrial.
- **Buyers**: regular people who want a physical 3D printed item, no technical knowledge needed
- **Makers**: hobbyists with printers at home earning side income
- **Starting market**: Lisbon, Portugal → expand to Iberian Peninsula

## Key Dates

- Target: meaningful MVP progress by end of March 2026

## Research Done

See `research/` folder for full reports:
- `3d-printing-marketplace-competitors-iberia-2026-03-06.md` — Iberian competitor landscape (wide open)
- `3d-printing-consumer-marketplace-competitors-2026-03-06.md` — Global consumer marketplace analysis
- `3d-printing-marketplace-feasibility-unit-economics-2026-03-06.md` — Unit economics & feasibility
- `printables-makerworld-api-research-2026-03-06.md` — API/scraping research

## Tools Built

- `tools/printables_scraper.py` — Fetches CC-licensed models from Printables GraphQL API
  - Persists to SQLite (`tools/catalog.db`)
  - Filters by category, deduplicates, exports JSON/CSV
  - 32 models seeded so far

## Commercial-Safe Licenses

For selling physical prints, only use models with:
- CC0 (Public Domain) — no conditions
- CC BY (Attribution) — credit creator
- CC BY-SA (Attribution-ShareAlike) — credit + same license on derivatives

## Next Steps

- [ ] Decide on MVP scope — full platform vs. manual (Airtable + WhatsApp) validation first
- [ ] Seed catalog further (target: 200+ models across key categories)
- [ ] Recruit first 10 makers in Lisbon
- [ ] Validate demand with 50 early buyers
