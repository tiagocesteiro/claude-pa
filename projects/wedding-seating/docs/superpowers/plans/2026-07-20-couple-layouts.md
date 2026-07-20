# Couple Layouts + per-layout Seating — Implementation Plan

## Context
Today a wedding has ONE dinner arrangement (couple applies a venue template → tables copied to `Table.weddingId`; each guest has ONE seat `Guest.assignedTableId`). Owner wants the COUPLE to own **multiple layouts** per wedding, each with its OWN table arrangement AND its OWN seating, and to **mark one as final**. The guest list is shared; only the tables + seating differ per layout. This re-architects seating from 1→N per wedding.

## Owner decisions
- **Final layout:** the couple marks one layout as **final**; that one drives the venue's progress view (Fase E), the Visão geral, and the PDF. Others are drafts/alternatives.
- **Couple editor = simplified:** the couple creates a layout from **(a) a venue template** (copy its tables + use the template's floor plan as read-only background) or **(b) a blank room by dimensions** (no photo). Then they **add / remove / move tables** (realistic shapes, snap, spacing). NO photo upload / calibration / zone-drawing by the couple (that stays venue-side).

## Data model
- **`WeddingLayout`** (couple-owned via `weddingId`): `{ id, weddingId, name, isFinal Boolean @default(false), floorPlanId? (background from a venue template's floor plan — read-only render source: image/scale/zones/elements), width? depth? scale? (blank-room case, no floorPlanId), createdAt }`. Exactly one `isFinal` per wedding (enforced in the data layer). `onDelete: Cascade` from Wedding.
- **`Table.weddingLayoutId?`** (+ relation, cascade) — the couple layout's tables live here (was `Table.weddingId` for the dinner copy). Keep the other polymorphic parents (floorPlanId/templateId) for venue-owned tables; the couple's per-layout tables use `weddingLayoutId`.
- **`LayoutSeat`** (new join) `{ id, weddingLayoutId (→WeddingLayout, cascade), guestId (→Guest, cascade), tableId String }` with `@@unique([weddingLayoutId, guestId])` — a guest sits at one table per layout; absent row = unseated in that layout. This REPLACES `Guest.assignedTableId` (remove it, or keep temporarily then drop).
- Guests/Groups/Constraints stay wedding-level (shared across layouts). Constraints apply when generating any layout.
- **Migration** `add_couple_layouts`: additive tables/columns. Prod data is essentially test data → migrate existing `Table[weddingId]` into one `WeddingLayout{name:"Principal", isFinal:true}` per wedding (set `weddingLayoutId`, clear `weddingId`) and `Guest.assignedTableId` → `LayoutSeat` rows; OR (simpler, acceptable since fresh) start clean and drop old dinner tables/assignments. Pick the safe path; document it.

## Access control (extends `src/lib/auth/access.ts`)
- A `WeddingLayout` (and its tables + seats) is owned by the couple who owns the wedding (`weddingLayout.wedding.ownerId`). `assertLayoutAccess(actor, layoutId, mode)` resolves via weddingId → Wedding.ownerId (couple owner / admin). Venue: NO access to layouts (Fase E only sees PII-free progress of the FINAL layout). Add `assertTableAccess` resolution for `weddingLayoutId` tables.

## Waves
### Wave 1 — schema + data-access + access + migration (no UI)
- Schema + migration as above.
- Data-access `src/lib/db/layouts.ts`: `listLayouts(weddingId)`, `createLayoutFromTemplate(weddingId, templateId, name)` (copy the template's tables into the new layout + set floorPlanId=template.floorPlanId), `createBlankLayout(weddingId, {name,width,depth,scale})`, `renameLayout`, `deleteLayout`, `setFinalLayout(weddingId, layoutId)` (unset others, set one — transaction), `getFinalLayout(weddingId)`.
- Per-layout tables + seating access: `listLayoutTables(layoutId)`, `saveLayoutTables(layoutId, TableInput[])` (id-diff like saveWeddingTables — preserve ids so seats survive), `getLayoutSeats(layoutId)`, `saveLayoutSeat(layoutId, guestId, tableId|null)`, `saveLayoutAssignment(layoutId, {guestId,tableId}[])` (scoped), `clearLayoutSeats(layoutId)`.
- Extend `access.ts` (`assertLayoutAccess`, layout-table resolution) + guard.
- TDD: layout CRUD, final-flag single-per-wedding, per-layout seat isolation (seating layout A ≠ layout B), template-copy correctness, access (couple owns; venue/other couple denied).

### Wave 2 — API routes (layout-aware)
- `GET|POST /api/weddings/[id]/layouts` (list / create: body `{source:"template"|"blank", templateId?|{name,width,depth,scale}, name}`), `PATCH|DELETE /api/weddings/[id]/layouts/[layoutId]` (rename / setFinal / delete), `GET|PUT /api/layouts/[layoutId]/tables` (couple edits tables), `GET /api/layouts/[layoutId]/plan` (tables + seats + background), `PUT /api/layouts/[layoutId]/assignment`, `POST /api/layouts/[layoutId]/generate` (run the engine on this layout's tables + the wedding's guests/constraints → save LayoutSeat). All guarded by `assertLayoutAccess`. Keep the seating ENGINE untouched (just call it per layout).

### Wave 3 — couple UI (the Seating plan tab becomes Layouts)
- The wedding "Seating plan" tab → a **Layouts** view: list the couple's layouts (name, final badge, table count, seated/total), buttons: "Novo layout" (choose: a partir de um template [pick a venue template] / sala por dimensões), open, marcar final, apagar.
- Open a layout → the plan editor: render the background (template floorplan or blank room), the layout's tables; **add-from-catalog / move / remove tables** (simplified, reuse PlanCanvas + the editor bits) + **Generate** + guest drag/lock/swap + Pintar por — all scoped to THIS layout's tables + seats.
- Guests tab unchanged (shared list).

### Wave 4 — make final-layout-aware everywhere
- **Visão geral** (`CoupleView`): render the FINAL layout (its tables, arrangement-only per current rules) instead of the single wedding arrangement.
- **PDF export**: export the final layout.
- **Fase E venue oversight** (`listVenueBookings`): `arrangementPicked` = wedding has a final layout with tables; `seated` counts = the FINAL layout's LayoutSeat; counts stay PII-free.
- **Detalhes**: the dinner-template picker becomes "cria um layout a partir deste template" (or remove, since layouts subsume it) — reconcile so there's no dead/duplicate path.
- Remove the old single-arrangement plumbing (`wedding.templateId` apply-to-wedding copy, `Guest.assignedTableId`, `saveWeddingTables`) once the layout path replaces it — carefully, keeping tests green.

## Verification (per wave)
- `npm run test` green (+ new); `tsc` + `build` clean.
- Wave 3/4 live: a couple creates 2 layouts (one from a template, one blank-by-dimensions), edits tables in each, seats guests DIFFERENTLY in each, marks one final; the Visão geral + PDF + the venue's progress all reflect the FINAL one; the other layout keeps its own seating; a second couple/venue can't touch these (tenancy).

## NOT changing
The seating engine (`src/lib/seating/**`), konva canvases, geometry, RGPD/tenancy model — only extended to be layout-aware.
