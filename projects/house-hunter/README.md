# House Hunter — Portuguese Real-Estate Alert Bot

Scrapes property portals, filters by date (≤3 days), validates via AI agent (Claude), shows results in web dashboard where you can approve/reject verdicts to improve the agent over time.

## Features (MVP)

- **Multi-portal scraping:** Custojusto, CasaSapo (Imovirtual, Idealista stubs)
- **Date extraction:** Auto-parses publication & update dates from listings
- **Recent-only filtering:** Shows listings updated in last 3 days
- **AI validation:** Claude agent checks descriptions against exclusion rules
- **Web dashboard:** Browse, approve/reject verdicts, filter by price/location
- **Feedback loop:** User verdicts stored for agent training (Phase 2)

## Usage

### CLI
```bash
python scripts/house_hunter.py --dry-run --search "T2/T3 Lisboa compra até 300k"
```

### Web Dashboard
```bash
python scripts/house_hunter.py --web --search "T2/T3 Lisboa compra até 300k"
# Opens browser to http://localhost:5000/results
```

## Configuration

Edit `data/house_radar.yaml`:

```yaml
searches:
  - name: "T2/T3 Lisboa compra até 300k"
    operation: comprar
    property_type: apartamento
    location: lisboa
    price_max: 300000
    typology: [T2, T3]
    portals: [custojusto]
    reject_if:
      - "arrendada a inquilinos"
      - "sem licença de habitação"
    active: true
```

## State & Feedback

Verdicts stored in `data/house_state.json`:
- `verdict`: agent decision (manter|rejeitar)
- `user_feedback`: user override (pending|approved|rejected)
- `published_date`, `updated_date`: extracted from listing
- `price_eur`, `location`, `typology`, `area_m2`, `image`: listing metadata

## Tech Stack

- Python 3.12, FastAPI, Firecrawl, Claude API
- HTML5 + vanilla JS (no build step)
- JSON state file

## Roadmap (Phase 2+)

- Distance filtering (Google Maps API)
- Remax + ERA portal scrapers
- Analytics & historical trends
- Use feedback loop to retrain validation agent
