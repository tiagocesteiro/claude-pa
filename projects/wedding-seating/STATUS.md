---
project: Wedding Seating Planner
status: active build — MVP core + usability + attributes/colors + multi-group + venue catalog + walls/chairs + wedding-tabs + venue-tabs + layouts(zones) + realistic shapes + wedding-consumes-template(editable copy) done
last_updated: 2026-07-12
branch: feat/wedding-seating-engine (94+ commits ahead of master, NOT merged)
tags: [wedding-seating, product, nextjs, local-first]
---

# Wedding Seating Planner — Project Status

## What it is
A local-first web app to build wedding seating plans. B2B2C vision (couples pay, venues are partners), but currently a **local tool** (`next dev`, SQLite) built to validate. Differentiator vs casamentos.pt: real calibrated venue floor plans + an automatic table-assignment engine + rich guest attributes/colors.

## How to run
```
cd "d:/Claude - PA/projects/wedding-seating"
npm run dev            # http://localhost:3000/admin
npm run test           # full vitest suite (104 tests as of 2026-07-10)
npx prisma migrate dev # if schema changed
```
- Stack: Next.js (App Router, TS), Prisma pinned **6.19.3** over SQLite (dev.db), react-konva, exceljs, Vitest.
- Sample import file: `d:/Claude - PA/convidados-exemplo.xlsx` (15 guests, groups + attribute columns).
- **Windows gotcha:** a running `next dev` locks the Prisma query-engine DLL; stop it before `prisma generate`/migrate, then restart.

## Architecture (key locations)
- **Pure seating engine:** `src/lib/seating/` (types, constraints, score, place, refine, solve) — no I/O, fully tested. Hard constraints: capacity, `separate`, fixed tables/locked guests (fixed-occupant-aware). Preferences: `together` pairs + priority-weighted multi-group reward (`GROUP_WEIGHTS=[10,5,2]`). Deterministic (greedy + hill-climbing refine).
- **Mapping:** `src/lib/plan/buildSeatingInput.ts` (DB rows → engine `SeatingInput`), `validate.ts` (live violations reusing engine validators), `colors.ts` (attribute→color legend).
- **Floorplan geometry (pure):** `src/lib/floorplan/` (geometry, spacing, boundary point-in-polygon, chairs).
- **Data layer:** `src/lib/db/` (Prisma singleton + per-entity access). Test DB provisioned once via `vitest.globalSetup.ts` (throwaway `prisma/test.db`).
- **API:** `src/app/api/` route handlers (venues, floorplans, tables, table-types, weddings, guests, groups, constraints, import, generate, plan, assignment, uploads).
- **UI:** `src/app/admin/` pages + `src/components/{editor,plan,guests,venue}/`. Konva canvases loaded via `next/dynamic {ssr:false}`; table coords stored in **image-natural pixels**, rendered with a shared `geoms`/displayScale.

## Plans done (specs+plans in `docs/superpowers/`, SDD ledger in `.superpowers/sdd/progress.md`)
1. **Foundation + seating engine** — Next.js+Prisma/SQLite+Vitest; pure engine, headless, tested.
2. **Floor-plan editor** — venue → upload room photo → calibrate scale → place/move/edit tables → save → reload. Natural-pixel coords.
3. **Guest import + grouping** — Excel parser (exceljs, accent-safe), import service, drag-to-group board, constraints editor (together/separate).
4. **Seating generation + plan view** — map wedding+floorplan → engine → Generate → render on plan → manual drag between tables with live over-capacity/separation highlighting; persistence in `Guest.assignedTableId`. Closed the fixed-occupant `separate` gap.
5. **Usability & legibility** — `Guest.locked` (persistent lock respected by Generate); manual add guest; "Casal" shortcut; named warnings (group/guest names not IDs); legible tables + per-table list; easy swap (drag chip onto chip).
6. **Guest attributes + colors** — `Guest.ageGroup/gender/dietary` (Excel + manual); pure color model; "Pintar por" filter + legend + attributes in list.
7. **Prioritized multi-group** — `Guest.extraGroups` (JSON ordered); engine group score → priority-weighted reward (prefers primary, falls back to secondary); per-guest priority editor.
8. **Venue table catalog** — `TableType` (name/shape/min/max seats/dimensions/quantity) per venue; per-table dimensions/minCapacity; `FloorPlan.minSpacing`; add-from-catalog in editor; spacing + under-min warnings. (Fixed a mass-assignment PATCH bug.)
9. **Walls + chairs** — `FloorPlan.boundary` polygon drawn over the photo (visual guide + out-of-bounds warning, NOT a solver constraint); chairs rendered around each table, occupied chairs colored by the selected attribute.
10. **Wedding tabs + editable floor plans** — wedding workspace uses tabs (Convidados & Grupos | Restrições | Plano de mesas) instead of an arrow link (shared `layout.tsx` + constraints route); admin lists a venue's existing floor plans so they can be reopened/modified (not only created). Also: `.claude/settings.json` hooks hardened to `$CLAUDE_PROJECT_DIR` absolute paths (survive cwd changes).
11. **Venue tabs + layout templates** — venue admin uses tabs (Mesas disponíveis [catalog] | Layouts de salas | Templates); `LayoutTemplate` model. (NOTE: the composition-only version from this plan was superseded by Plan 13.)
12. **Table shapes + realistic dimensions** — catalog: round (diameter), oval (large+small diameter), rectangular (length×width); `TableType.shape` gains "oval"; tables render on both canvases **to real scale** (circle/ellipse/rect via `tableRenderSize`), chairs on the real outline; drag alignment holds (shape + drop-overlay from the same size).
13. **Layouts (zones) + template-owned tables** — venue re-architecture: the Layouts editor = image + scale + **multiple zones** only (no tables); tables now live on **templates** (positioned): `LayoutTemplate.floorPlanId` (the layout), `Table.templateId` (positioned tables), `FloorPlan.zones` (multi-polygon). The Templates tab is a table mini-editor placing catalog tables on the chosen layout's image+zones background (realistic shapes, spacing + out-of-any-zone warnings), saved to the template. **Table.floorPlanId is now nullable**; the wedding flow still reads floor-plan tables until Plan 14.
14. **Wedding consumes a template (editable copy)** — the wedding plan tab picks a template → `applyTemplateToWedding` COPIES its tables into the wedding (`Table.weddingId`), sets `wedding.floorPlanId` (=template's layout) + `wedding.templateId`, nulls guest seats; plan/generate now operate on the wedding's own tables and render on the template's layout background (image+zones). The couple **edits the copy** (move/add-from-catalog/remove) via `PUT /api/weddings/[id]/tables` → `saveWeddingTables` (ID-DIFF: update-in-place preserves seating, create new, delete-missing + unassign only those guests) **without touching the venue template**. `saveWeddingTables` was rewritten from delete-all+recreate to id-diff (delete-all would mint new ids and orphan every guest seat — `Guest.assignedTableId` has no FK). New data-access: `src/lib/db/weddingTables.ts` (`listWeddingTables`/`saveWeddingTables`/`applyTemplateToWedding`). **The wedding loop is now closed end-to-end.**

## Current data model (Prisma) — key fields added over time
- Guest: `groupId` (primary group), `extraGroups` (JSON ordered extras), `assignedTableId`, `locked`, `ageGroup`, `gender`, `dietary`.
- Table: `capacity` (=max), `minCapacity?`, `width?`, `depth?`, `fixed`, `x/y` (natural px), `shape`.
- FloorPlan: `image`, `scale` (px/m), `width/depth`, `minSpacing?`, `boundary?` (JSON polygon).
- TableType: venue catalog (name, shape, minSeats, maxSeats, width, depth, quantity).
- Venue, Wedding, Group, Constraint (type together|separate).

## NOT done / deferred (top of the backlog)
- **PDF export** with color coding + legend + per-table list (the printable deliverable for couples/venues). NEXT logical step (was "Plan 10", now the main remaining feature).
- Layout templates are done as **composition-only** (types × quantities, auto-grid on apply); storing exact per-image positions per template is still not done (lower priority).
- **Follow-ups (in `.superpowers/sdd/progress.md`):** refine perf at ~200 guests (incremental delta-scoring; groupReward is O(G²)); `GET /api/weddings/[id]`; Constraint→Guest FK; endpoint wedding-scoping/validation hardening; a few UI edge cases (boundary draft dropped on calibrate; AddGuestForm dead catch; chairs don't thread width/depth).

## Key decisions
- Local-first (SQLite, no cloud/auth/Stripe) until validated; migrate to Postgres later (schema kept portable).
- Branch left UNMERGED on `feat/wedding-seating-engine` by owner's choice; not pushed to a remote.
- Multi-group semantics = primary + ordered fallback (owner-specified), implemented as a priority-weighted engine reward.
- Walls/spacing/min-occupancy are warnings, not solver constraints (solver places guests into existing tables; it doesn't move tables).
- Accents work correctly in import (an earlier "scrambled groups" report was a corrupted bash-generated sample file, not an app bug).

## Verification status
- 138 automated tests green; `tsc --noEmit` + `next build` clean. Every plan's UI was driven end-to-end with Playwright (generate, drag, colors, locks, swap, catalog, spacing, boundary, chairs, zones, template-apply, wedding table move/add/remove + template-unchanged) with screenshots in `.superpowers/`.
