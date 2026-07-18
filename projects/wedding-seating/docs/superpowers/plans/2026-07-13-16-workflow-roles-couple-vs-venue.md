# Workflow Roles: Couple vs Venue — Implementation Plan

**Goal:** Split responsibilities so the **couple** only (1) introduces/imports guests, (2) tracks them (RSVP confirmed/pending/declined + dietary), and (3) seats guests for the dinner + views the venue's plans. The **venue** designs the table arrangements for each moment (dinner, cocktail, …). The couple can pick which arrangement the dinner uses (e.g. by guest count) but CANNOT edit tables (move/add/remove) — that lives on the venue side. Non-dinner moments are venue-designed arrangements the couple only views.

**Owner decisions (confirmed):** couple *chooses* the dinner arrangement but can't edit tables; each moment (cocktail/ceremony/dance) is a venue-designed table arrangement the couple views (seating is dinner-only).

**Builds on:** Plans 1-15 (dinner seating = wedding consumes a template as a copy; wedding details + WeddingMoment; read-only Vista do casal). This plan re-scopes the couple UI and points moments at venue *templates* (arrangements with tables) instead of bare floor plans.

**Tech Stack:** Next.js (App Router, TS), Prisma/SQLite, react-konva, Vitest.

## Global Constraints
- **Local-first**, additive migrations (new nullable columns only; no drops). No data loss.
- Do NOT change the seating engine or the dinner template-apply/copy mechanism. The couple keeps guest drag/lock/swap + Generate; only *table structural editing* is removed from the couple side (it stays on the venue Templates editor).
- `npx tsc --noEmit` + `npm run build` + `npm run test` stay green. Testable logic TDD'd; UI verified by driving the app.
- **cwd hygiene:** `cd "d:/Claude - PA/projects/wedding-seating"`. **Windows Prisma DLL lock:** stop `next dev` before migrate/generate.

---

### Task 1: Guest RSVP tracking (couple task #2)

**Schema:** `Guest` += `rsvp String? @default("pending")` (values `pending` | `confirmed` | `declined`). Migration `add_guest_rsvp`.

**Data-access + API:** extend `updateGuestAttributes` (or the guests PATCH) to accept `rsvp` (validate ∈ the 3 values; ignore/400 otherwise). Keep existing groupId/locked/ageGroup/gender/dietary paths.

**UI (`src/components/guests/GuestTable.tsx`):**
- Add a **"Confirmação"** column: a `<select>` per row (Pendente/Confirmado/Recusado) → `updateGuestAttrs`/PATCH; color the row/cell subtly by status (e.g. confirmed=green tint, declined=muted/strikethrough name, pending=default).
- Above the table, a small **summary**: "X confirmados · Y pendentes · Z recusados" out of the total.
- Keep the existing columns/inline editing (Plan: guest table view).

**TDD:** data-access rsvp round-trip + PATCH route (valid value persists; bad value rejected). Gates: tsc/test/build.

**Commit:** `feat(guests): RSVP status (confirmado/pendente/recusado) tracking in the guest table`.

---

### Task 2: Couple seating = seat only (remove couple-side table editing)

**Files:** `src/components/plan/usePlan.ts`, `src/app/admin/wedding/[id]/plan/page.tsx` (and the "Editar mesas" affordances). Keep `PlanCanvas`'s `editMode`/add/move/remove code intact (still used by the venue Templates editor) — just stop the couple's plan page from exposing it.

- Remove the **"Editar mesas"** toggle and the add-from-catalog / move / remove-table controls from the couple's Plano de mesas tab. `PlanCanvas` is rendered without `editMode`/`addTableMode` (tables are the venue's design — not draggable/removable here).
- KEEP: template picker ("Usar este template" — the couple chooses the arrangement, per the owner decision), **Generate**, **Pintar por**, and guest interactions (drag between tables, lock, swap). Seating persistence unchanged.
- The `PUT /api/weddings/[id]/tables` endpoint + `saveWeddingTables` stay (used by the venue side / apply flow) — only the couple UI stops calling the table-edit paths. Confirm no dead imports.

**Verify by driving the app:** couple plan tab has no table add/move/remove; picking a template + Generate + dragging a guest between tables + lock + swap all still work and persist. Screenshot.

**Commit:** `feat(plan): couple seats only — remove table editing from the wedding plan (venue owns table design)`.

---

### Task 3: Moments reference venue arrangements; Vista do casal renders tables per moment

**Schema:** `WeddingMoment` += `templateId String?` + `template LayoutTemplate? @relation(...)`; `LayoutTemplate` += `moments WeddingMoment[]`. Keep `floorPlanId` (backward compat / room-only moments). Migration `add_moment_template`.

**Data-access + API:** `setMomentTemplate(weddingId, kind, templateId|null)`; extend `PUT /api/weddings/[id]/moments/[kind]` to accept `{ templateId }` (validate the template exists AND its venue === the wedding's venue, else 400). `getWeddingDetail` includes each moment's `template` (with its floorPlan + tables count).

**UI — Detalhes tab moment picker (`src/components/wedding/WeddingDetails.tsx`):** for ceremony/cocktail/dance, change the select to list the venue's **templates** (arrangements) — label by name + guest range — writing `templateId`. Dinner stays a link to Plano de mesas (its arrangement = the seating template). Disable until a venue is set.

**UI — Vista do casal (`src/components/wedding/CoupleView.tsx`):** for each non-dinner moment that has a `templateId`, render that template's tables on its layout (image + zones) READ-ONLY (reuse `PlanCanvas readOnly` with the template's tables mapped to `PlanTableView`, no seated guests) — or the existing floor-plan render if only `floorPlanId` is set. Dinner unchanged (seated tables). Placeholder when nothing is set. Fetch the template's tables via a small endpoint (`GET /api/templates/[id]/tables` if not present — check `listTemplateTables`) or include them in `getWeddingDetail`.

**TDD:** moments PUT templateId validation (cross-venue rejected; valid persists). Gates: tsc/test/build.

**Verify by driving the app:** venue designs a cocktail arrangement (Templates tab); assign it to the wedding's Cocktail moment (Detalhes); Vista do casal shows the cocktail tables read-only; dinner still shows seated tables. Screenshot.

**Commit:** `feat(wedding): moments use venue table arrangements; couple views each moment's tables`.

---

## Definition of Done
- `npm run test` green; `npx tsc --noEmit` + `npm run build` clean.
- Couple side does exactly: guests (import/introduce) + RSVP/dietary tracking + dinner seating (no table editing) + read-only view of every moment's venue-designed arrangement. Table design lives on the venue side. Seating engine + Plan 14/15 data unchanged (additive).

## What comes next
- Optionally seat only confirmed guests (RSVP-aware Generate).
- PDF export (per-moment arrangements + dinner seating with colors/legend/per-table list).
- Later: separate couple vs venue logins/links (currently one local admin).
