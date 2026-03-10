# Decision Log

Append-only. When a meaningful decision is made, log it here.

Format: [YYYY-MM-DD] DECISION: ... | REASONING: ... | CONTEXT: ...

---

[2026-03-06] DECISION: 3D printing marketplace is consumer-focused (Etsy model), not B2B industrial | REASONING: Industrial platforms (3DHubs, Craftcloud) already exist and are saturated. The gap is connecting hobbyist makers with regular buyers who want physical printed objects, abstracting all technical complexity | CONTEXT: Research confirmed no direct competitor combines P2P maker fulfillment + geolocation + CC-licensed catalog + simplified buyer UX

[2026-03-06] DECISION: Use Printables GraphQL API (not scraping) to seed model catalog | REASONING: Printables exposes an internal GraphQL API at api.printables.com/graphql that returns structured data including license IDs — no HTML scraping needed. MakerWorld had no accessible API. | CONTEXT: Built printables_scraper.py with SQLite persistence; commercial-safe license IDs: 7 (CC0), 1 (CC BY), 2 (CC BY-SA), 15 (Commercial Use)

[2026-03-06] DECISION: Pursue MVP validation before building a platform | REASONING: Lisbon TAM is small (est. €6K-12K/year locally), maker supply is the hardest constraint, and unit economics only work if commission ≤12% and delivery is buyer-paid. Validate with manual process first (Airtable + WhatsApp + 10 makers + 50 buyers) before investing in tech | CONTEXT: Feasibility research showed viable unit economics but high risk on supply side

[2026-03-09] DECISION: Launch smoothie machine 3-month plan (March–May 2026) | REASONING: Secondary business idea with strong unit economics (€2.40–€2.90 net/cup after 25% venue share, 1.2-month break-even on €700 machine). Lower complexity than 3D marketplace. Budget €2k–€5k feasible. Goal: first machine live by May 31 | CONTEXT: Approved 3-month plan: Month 1 supplier research + venue outreach, Month 2 negotiate + procure, Month 3 deploy + learn. Target venues = Vertigo, Escala25, IDEA Spaces, Avila Spaces (cold outreach)
