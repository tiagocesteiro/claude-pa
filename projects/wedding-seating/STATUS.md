---
project: Wedding Seating Planner
status: active build — MVP + usability + colors + multi-group + venue catalog + walls/chairs + tabs + layouts(zones) + realistic shapes + wedding-consumes-template + guest-table + site theme + details/moments/couple-view + RSVP + couple-vs-venue roles + plus-one + dots-only-plan done
last_updated: 2026-07-13
branch: feat/wedding-seating-engine (108+ commits ahead of master, NOT merged)
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
18. **Editor & flow refinements (batch, in progress)** — Waves 1-2 done: tabs renamed (**Seating plan**, **Visão geral**); seating plan hides zones, adds "Pintar por: **Grupo**", table list shows only names; Visão geral hides dinner zones + shows **N convidados · M confirmados** + per-moment **notes**; template editor shows the **layout name**, drops the generic circular table, and can **delete** placed tables; guest table gets **sorting + filters** (group/RSVP/name). Schema adds: `WeddingMoment.notes`, `Table.name` (double-click to rename on both canvases; seating plan via `PATCH /api/tables/[id]`), `Table.heads` (**rectangular tables with/without cabeceiras** — chair layout only, round/oval unaffected). The **dinner arrangement is now chosen by the venue in Detalhes** (with a thumbnail; the Seating plan no longer has a template picker — it seats into the applied dinner tables). Wave 3 (all done): **blank room by dimensions** (`updateFloorPlanDimensions` + `roomFit` — a photo-less floor plan defined by comprimento×largura → a to-scale room rectangle); **extra room elements** (`FloorPlan.elements` JSON — labelled coloured rectangles like dance floor/bar drawn in the template editor, rendered behind tables everywhere, exempt from spacing/zone checks); **snap/alignment guides** (`snap.ts` — dragging a table in the template editor snaps its centre to other tables' centres with dashed guide lines); **per-room PDF export** (`jspdf` — an "Exportar PDF" button per moment in the Visão geral outputs the room plan image + a per-table guest-name list for the dinner). **Plan 18 COMPLETE.**

17. **Plus-one + dots-only plan + arrangement-only couple view** — (1) the guest table has a **"Plus one"** column: picking guest B for guest A pairs them symmetrically (`Guest.plusOneId` `@unique` self-relation; `setPlusOne` sets/clears BOTH sides, re-pairing frees old partners; `PUT /api/guests/[id]/plus-one`), shows "(cross reference)", and both drop out of every other guest's dropdown. (2) **Vista do casal** now shows only the table arrangement (no seated guests) for every moment, dinner included. (3) The **sitting plan** (Plano de mesas) shows only each guest's colored **dot** per table by default; a table's guest **names** appear only when you click that table (`selectedTableId` gates chip visibility; assign-by-drop/fix/lock/drag/swap unchanged).

16. **Workflow roles: couple vs venue** — clarified who does what. **Couple** does only: import/introduce guests, **RSVP tracking** (`Guest.rsvp` = pending/confirmed/declined, editable "Confirmação" column + summary counts in the guest table), dinner seating, and viewing plans. **Venue** owns table design. Removed the couple's table editing (no more "Editar mesas"/move/add/remove on the Plano de mesas tab — the couple still picks a template, Generates, and drags/locks/swaps guests, but tables are the venue's design). Moments now reference a **venue template** (arrangement with tables): `WeddingMoment.templateId`; the Detalhes moment picker selects a venue arrangement per moment (ceremony/cocktail/dance), and **Vista do casal** renders each moment's tables read-only (dinner shows seated guests; others show the arrangement). Moments PUT validates the template belongs to the wedding's venue. New `GET /api/templates/[id]/tables`. (Follow-up: PlanCanvas/usePlan table-edit code is now dead/unreachable — left in place; couple-side editing removed only from the page.)

15. **Wedding details + plans-per-moment + couple view** — a wedding is now a real record: creation captures venue + date; a **Detalhes** tab (first tab) edits couple, both partners' name/email/phone, date, venue, guest estimate, notes (`PATCH /api/weddings/[id]` whitelist; new single `GET /api/weddings/[id]`). New `WeddingMoment` model (4 moments: ceremony/cocktail/dinner/dance, each with an optional `floorPlanId`, seeded on wedding create in a tx). **Seating applies only to the dinner** (the existing wedding tables/template = the dinner); the other 3 moments just pick a venue floor plan (`PUT /api/weddings/[id]/moments/[kind]`, validates the plan belongs to the wedding's venue). New read-only **Vista do casal** tab renders each moment: dinner = the seated tables (`PlanCanvas readOnly` — new prop, all interaction gated, Plan 14 editing unchanged), the others = the room image + zones; placeholders when unset. Data-access: `weddings.ts` (createWedding/getWeddingDetail/updateWedding) + new `moments.ts`. Tabs: Detalhes | Convidados & Grupos | Restrições | Plano de mesas | Vista do casal. Also (same session, pre-Plan-15): editable **guest table view** (row=guest, cols=attributes, inline group/attr edits — new `updateGuestAttributes` + guests PATCH), a warm **light site theme** (globals.css tokens/typography/soft buttons/accent tabs), softer guest+zone **color palette**, back-to-home nav, and a **min-table-spacing** control in the layout editor.

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
- 239 automated tests green; `tsc --noEmit` + `next build` clean.
- Template editor barriers (Plan 18 T11/T12): tables keep min-spacing from each other AND from **zone walls** (`spacingGeom` + `zoneClearance`), with visual boundaries + drag barrier + add-outside-limit. Rect tables seat along their length (`chairs.ts`). Detalhes moment thumbnails render the **arrangement** (tables, no zones) via `ArrangementThumbnail`.
- Admin can **delete** weddings and venues (cascade) via "Apagar" buttons on `/admin` (`DELETE /api/weddings/[id]` + `DELETE /api/venues/[id]`; deleting a wedding cascades guests/groups/constraints/moments/tables; deleting a venue cascades floor plans/table types/templates and nulls referencing weddings' venueId).
- Floor plans (layouts) have a **name** (`FloorPlan.name`, editable in the layouts list + editor) and can be **deleted** (`DELETE /api/floorplans/[id]` — cascades the plan's tables + any templates built on it). Layouts list shows the name (fallback "Planta N").
- The dev DB (`prisma/dev.db`) was wiped clean of all QA/test data on 2026-07-13 — starts empty. (Note: orphaned uploaded images may remain under `data/uploads/`.) Every plan's UI was driven end-to-end with Playwright (generate, drag, colors, locks, swap, catalog, spacing, boundary, chairs, zones, template-apply, wedding table move/add/remove + template-unchanged) with screenshots in `.superpowers/`.
