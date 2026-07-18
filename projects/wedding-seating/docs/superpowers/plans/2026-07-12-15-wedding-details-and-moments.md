# Wedding Details, Plans-per-Moment & Couple View — Implementation Plan

**Goal:** A wedding is now a real record: on creation and in a **Detalhes** tab it captures the venue (quinta), date, both partners' names + contacts, guest estimate, and notes. A wedding has four **moments** — *cerimónia, cocktail, jantar, dança* — and each moment can be assigned a floor plan (a room of the venue). **Seating (the table engine) applies only to the dinner** (the existing wedding tables/template flow *is* the dinner). The other three moments just pick a plan to show. A read-only **Vista do casal** tab lets the couple view each moment's plan (dinner shows the seating with guests; the others show the room's image + zones).

**Decisions (confirmed with owner):** seating only at dinner; couple view = a read-only tab inside the wedding.

**Tech Stack:** Next.js (App Router, TS), Prisma/SQLite, react-konva, Vitest. Builds on Plans 1-14 (wedding consumes a template as an editable copy = the dinner seating).

## Global Constraints
- **Local-first**, additive schema migration (all new columns nullable; new `WeddingMoment` table). No data loss; existing weddings keep working (their current `floorPlanId`/`templateId`/tables remain the dinner seating).
- Do **not** change the seating engine, the dinner template-apply flow, or the guest table (Plan 14/prior). Layer moments + details on top.
- `npx tsc --noEmit` + `npm run build` + `npm run test` stay green. Testable logic TDD'd; UI verified by driving the app.
- **cwd hygiene:** shell commands start with `cd "d:/Claude - PA/projects/wedding-seating"`. **Windows Prisma DLL lock:** stop `next dev` before `prisma migrate`/`generate`.

---

### Task 1: Schema + data-access + APIs (details & moments)

**Schema (prisma/schema.prisma):**
- `Wedding` gains (all nullable): `venueId String?` + `venue Venue? @relation(...)`; `partner1 String?`, `partner1Email String?`, `partner1Phone String?`, `partner2 String?`, `partner2Email String?`, `partner2Phone String?`, `guestEstimate Int?`, `notes String?`; `moments WeddingMoment[]`. Keep `couple`, `date`, `floorPlanId`, `templateId`.
- `Venue` gains `weddings Wedding[]`.
- New `WeddingMoment { id String @id @default(cuid()); weddingId String; wedding Wedding @relation(fields:[weddingId], references:[id], onDelete: Cascade); kind String; floorPlanId String?; floorPlan FloorPlan? @relation(fields:[floorPlanId], references:[id]); @@unique([weddingId, kind]) }`.
- `FloorPlan` gains `moments WeddingMoment[]`.

**Data-access (`src/lib/db/weddings.ts` + `src/lib/db/moments.ts`):**
- `createWedding` accepts the new optional fields AND creates the 4 moments (`ceremony`,`cocktail`,`dinner`,`dance`, floorPlanId null) in the same transaction.
- `getWeddingDetail(id)` → wedding + venue + moments (each with its floorPlan image) — used by the new single-GET route.
- `updateWedding(id, fields)` → whitelist update (couple, date, venueId, partner1/partner1Email/partner1Phone, partner2/partner2Email/partner2Phone, guestEstimate, notes). No reparenting of tables/guests.
- `setMomentFloorPlan(weddingId, kind, floorPlanId|null)` → upsert the moment row's floorPlanId (validate kind ∈ the 4).

**APIs:**
- `POST /api/weddings` — extend to accept the detail fields (couple still required).
- `GET /api/weddings/[id]` — NEW; returns `getWeddingDetail` (404 if missing). (Closes a long-standing backlog gap.)
- `PATCH /api/weddings/[id]` — NEW; whitelist detail fields → `updateWedding`. Reject unknown → ignore; 400 if body empty/no known field.
- `PUT /api/weddings/[id]/moments/[kind]` — NEW; body `{ floorPlanId: string|null }`; validate `kind`; if floorPlanId given, verify it belongs to the wedding's venue (else 400). → `setMomentFloorPlan`.

**TDD:** data-access round-trips (create seeds 4 moments; updateWedding whitelists; setMomentFloorPlan upserts) + the moments PUT route (kind validation, venue-membership check). Then `npx tsc --noEmit`, `npm run test`, `npm run build`.

**Commit:** `feat(wedding): detail fields + WeddingMoment model + details/moments APIs`.

---

### Task 2: Creation form + Detalhes tab (details & moment plans)

**Files:** `src/app/admin/page.tsx` (create form), new `src/app/admin/wedding/[id]/details/` route + a `WeddingDetails` component, `src/app/admin/wedding/[id]/layout.tsx` (add tabs).

- **Create form** (`/admin`): add a **venue** `<select>` (from `/api/venues`) + **date** input to the existing couple input. POST includes them. (Keep couple required.)
- **Detalhes tab** (new, made the FIRST tab): a form to view/edit all wedding fields (couple, both partners' names + email + phone, date, venue select, guest estimate, notes) → `PATCH /api/weddings/[id]`. Save-on-submit with a "Guardado." flash.
- **Moment plans** (in the Detalhes tab, below the fields): list the 4 moments. For **cerimónia/cocktail/dança**, a `<select>` of the venue's floor plans (`/api/floorplans` filtered to `wedding.venueId`) → `PUT …/moments/[kind]`. For **jantar**, show a read-only note "Definido pelo template no separador Plano de mesas" linking to the plan tab. Disable the moment selects until a venue is chosen (with a hint).
- **Tabs** (wedding `layout.tsx`): `Detalhes | Convidados & Grupos | Restrições | Plano de mesas | Vista do casal`. Add the two new tabs; keep existing routes/active-state logic; use the theme tokens (accent active).

**Verify by driving the app:** create a wedding with venue+date; edit all detail fields and confirm persistence (reload); assign a floor plan to cerimónia/cocktail/dança and confirm it saves. Screenshot.

**Commit:** `feat(wedding): creation captures venue/date; Detalhes tab edits all fields + moment plans`.

---

### Task 3: Vista do casal (read-only moments view)

**Files:** new `src/app/admin/wedding/[id]/couple/` route + a `CoupleView` component; add a `readOnly` prop to `src/components/plan/PlanCanvas.tsx` (suppresses guest drag/table-edit — render only); reuse a read-only floor-plan render for the non-dinner moments.

- The tab loads `GET /api/weddings/[id]` (moments + venue) and `GET /api/weddings/[id]/plan` (dinner seating: guests, tables, layout).
- Renders the 4 moments in order (Cerimónia, Cocktail, Jantar, Dança), each a titled section:
  - **Jantar:** the seating render — `PlanCanvas readOnly` (tables + seated guests + chairs colored, NO drag/edit/generate). If no template applied yet → "Plano de mesas por definir".
  - **Cerimónia / Cocktail / Dança:** the moment's floor plan shown read-only (image + zones), no tables. If none chosen → "Planta por definir".
- `PlanCanvas` `readOnly`: when true, guest chips are not draggable, table drag disabled, the HTML drop-overlay is inert (or omitted), edit affordances hidden. Existing (editable) behavior unchanged when `readOnly` is false/absent — verify Plan 14 editing still works.

**Verify by driving the app:** on a wedding with a dinner template applied + a floor plan set for cerimónia, open Vista do casal → dinner shows tables+guests (no drag handles / can't move), cerimónia shows the room image+zones, unset moments show the placeholder. Confirm the editable Plano de mesas tab is unaffected. Screenshot.

**Commit:** `feat(wedding): read-only Vista do casal showing each moment's plan`.

---

## Definition of Done
- `npm run test` green; `npx tsc --noEmit` + `npm run build` clean.
- A wedding captures venue/date/partners' contacts/estimate/notes (create + Detalhes tab). Each of the 4 moments can be assigned a venue floor plan (dinner = the seating). A read-only Vista do casal shows every moment's plan; the dinner shows the seated tables. Existing seating/editing (Plan 14) is unchanged.

## What comes next
- PDF export (per-moment plans + seating with colors/legend/per-table list) — the printable couple/venue deliverable.
- Later: per-moment schedule times; optional seating on non-dinner moments; shareable couple link (auth).
