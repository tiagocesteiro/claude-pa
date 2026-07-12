# Wedding Consumes a Template (Editable Copy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Commit each task so an interruption is recoverable.

**Goal:** A wedding picks a **template** → the template's positioned tables are **copied** into the wedding as its own editable set, rendered on the template's layout (image + zones). Generate + manual seating + table edits operate on the wedding's copy. This closes the loop so weddings work again after the Plan 13 restructure (venues now build tables in templates, not floor plans).

**Architecture:** Tables gain a third owner — `Table.weddingId` (the couple's copy) alongside `templateId` (venue arrangement) and legacy `floorPlanId`. `Wedding.templateId` records the source template; `Wedding.floorPlanId` (already exists) is set to the template's layout so the plan renders on the right image/zones. An "apply template" action copies template tables → wedding tables (clearing prior wedding tables + guest assignments). The wedding plan reads the wedding's own tables and the layout; generate/manual-edit operate on them. Testable logic (schema/data/API) is TDD'd; the plan UI is verified by driving the app.

**Tech Stack:** Next.js (App Router), Prisma/SQLite, react-konva, the pure seating engine + floorplan helpers, Vitest.

## Global Constraints

- **Local-first only.** No cloud/network.
- **Builds on Plans 1-13.** One migration adds `Table.weddingId String?` (+ relation, `Wedding.tables` back-relation) and `Wedding.templateId String?`. `Wedding.floorPlanId` already exists (nullable) — set it to the chosen template's `floorPlanId`. Schema Postgres-portable.
- **Tables now have three possible owners** (`floorPlanId` legacy, `templateId` venue arrangement, `weddingId` the couple's copy). The wedding path uses `weddingId`. Keep template + floorplan paths working.
- **Apply is a copy + reset:** applying a template to a wedding DELETEs the wedding's existing tables, CREATES copies of the template's tables (new ids, same shape/capacity/min/width/depth/x/y/fixed) with `weddingId`, sets `wedding.floorPlanId = template.floorPlanId` + `wedding.templateId`, and NULLs the wedding's guests' `assignedTableId` (old table ids are gone).
- **Reuse everything:** the seating engine, `buildSeatingInput`, `PlanCanvas` (Plan 12 realistic shapes + colors + chairs), the add-from-catalog + drag patterns. Keep react-konva SSR/geoms/drag/lock/swap intact.
- **`npx tsc --noEmit` + `npm run build` + `npm run test` stay green.** UI verified by driving the app.
- **cwd hygiene:** shell commands start with `cd "d:/Claude - PA/projects/wedding-seating"`. Commit after each task.

---

### Task 1: Schema + data-access (wedding tables, apply-template) + templates list

**Files:**
- Modify: `prisma/schema.prisma` + migration
- Create: `src/lib/db/weddingTables.ts` (`listWeddingTables`, `saveWeddingTables`, `applyTemplateToWedding`)
- Modify: `src/lib/db/weddings.ts` if needed (a helper to set floorPlanId/templateId)
- Create: `src/app/api/templates/route.ts` (GET list ALL templates with venue + layout info, for the wedding picker)
- Test: `src/lib/db/weddingTables.test.ts`

**Interfaces:**
- Schema: `Table.weddingId String?` + `wedding Wedding? @relation(...)`; `Wedding.tables Table[]` back-relation; `Wedding.templateId String?`.
- `listWeddingTables(weddingId): Promise<Table[]>` — `where: { weddingId }`.
- `saveWeddingTables(weddingId, tables: TableInput[]): Promise<void>` — `$transaction([deleteMany({where:{weddingId}}), createMany({data: tables.map(t=>({...t, weddingId}))})])` (used by Task 4's table editing).
- `applyTemplateToWedding(weddingId, templateId): Promise<{ copied: number }>` — in a transaction: `deleteMany` wedding's tables (`where:{weddingId}`); read the template's tables (`where:{templateId}`) and `createMany` copies with `weddingId` (strip id/createdAt/floorPlanId/templateId; keep shape/capacity/minCapacity/width/depth/x/y/fixed); `wedding.update` set `floorPlanId = template.floorPlanId, templateId`; `guest.updateMany({where:{weddingId}, data:{assignedTableId:null}})`. Returns the copied count.
- `GET /api/templates` → all templates, each `{ id, name, minGuests, maxGuests, venueId, venue:{name}, floorPlanId, floorPlan:{image} }` (for the wedding template picker).

- [ ] **Step 1: Schema + migrate** — add fields/relations; `npx prisma migrate dev --name add_wedding_tables` (stop `next dev` first if it locks the Prisma DLL; re-run generate; don't leave half-applied). Confirm existing rows preserved (nullable columns).

- [ ] **Step 2: Failing test → implement → pass**

`src/lib/db/weddingTables.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { listWeddingTables, applyTemplateToWedding } from "./weddingTables";
import { prisma } from "./client";

it("copies a template's tables into the wedding and points the wedding at the layout", async () => {
  const v = await prisma.venue.create({ data: { name: "V WT" } });
  const fp = await prisma.floorPlan.create({ data: { venueId: v.id, image: "img", scale: 50, width: 10, depth: 10 } });
  const t = await prisma.layoutTemplate.create({ data: { venueId: v.id, floorPlanId: fp.id, name: "T", minGuests: 80, maxGuests: 100, lines: "[]" } });
  await prisma.table.createMany({ data: [
    { templateId: t.id, shape: "round", capacity: 8, x: 100, y: 100, fixed: false, width: 1.5, depth: 1.5 },
    { templateId: t.id, shape: "rect", capacity: 10, x: 200, y: 150, fixed: false, width: 2.4, depth: 1 },
  ]});
  const w = await prisma.wedding.create({ data: { couple: "Apply Test" } });
  const g = await prisma.guest.create({ data: { weddingId: w.id, name: "A", assignedTableId: "stale" } });

  const res = await applyTemplateToWedding(w.id, t.id);
  expect(res.copied).toBe(2);
  const wt = await listWeddingTables(w.id);
  expect(wt.length).toBe(2);
  expect(wt.every((x) => x.weddingId === w.id && x.templateId === null)).toBe(true);
  const wedding = await prisma.wedding.findUnique({ where: { id: w.id } });
  expect(wedding?.floorPlanId).toBe(fp.id);
  expect(wedding?.templateId).toBe(t.id);
  const guest = await prisma.guest.findUnique({ where: { id: g.id } });
  expect(guest?.assignedTableId).toBeNull();

  // applying again replaces (still 2, not 4)
  await applyTemplateToWedding(w.id, t.id);
  expect((await listWeddingTables(w.id)).length).toBe(2);
});

afterAll(async () => { await prisma.$disconnect(); });
```

Implement `weddingTables.ts` + `GET /api/templates`. Run: `npm run test -- weddingTables` then `npm run test` then `npx tsc --noEmit` then `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/db/weddingTables.ts src/lib/db/weddings.ts "src/app/api/templates/route.ts" src/lib/db/weddingTables.test.ts
git commit -m "feat(wedding): wedding-owned tables + applyTemplateToWedding + templates list"
```

---

### Task 2: API — apply-template, plan-data + generate on wedding tables

**Files:**
- Create: `src/app/api/weddings/[id]/apply-template/route.ts` (POST)
- Modify: `src/app/api/weddings/[id]/plan/route.ts` (return wedding tables + the layout)
- Modify: `src/app/api/weddings/[id]/generate/route.ts` (seat into wedding tables)
- Modify: `src/app/api/weddings/[id]/assignment/route.ts` (unchanged if it updates guests by id — confirm)
- Test: `src/app/api/weddings/[id]/apply-template/route.test.ts`

**Interfaces:**
- `POST /api/weddings/[id]/apply-template` body `{ templateId }` → `applyTemplateToWedding` → 200 `{ copied }` (400 missing templateId; 404 template not found).
- `GET /api/weddings/[id]/plan` → `{ guests, constraints, tables: listWeddingTables(id), layout: { floorPlanId, image, scale, zones } | null }` where the layout comes from `wedding.floorPlanId` (the applied template's layout). No `floorPlanId` query param needed anymore (the wedding knows its layout); keep the param tolerated but ignored, or drop it.
- `POST /api/weddings/[id]/generate` → build `SeatingInput` from `listWeddingTables(id)` (+ guests/constraints), solve, persist assignment. Remove the `floorPlanId` requirement (use the wedding's own tables). 400 with a clear message if the wedding has no tables yet ("aplica um template primeiro").

- [ ] **Step 1: Failing test → implement → pass**

`apply-template/route.test.ts`: seed a venue+layout+template(with tables)+wedding; POST apply-template → 200 {copied:2}; then `GET /api/weddings/[id]/plan` returns 2 tables + a layout with the image; POST generate seats the guests into those tables. 400 on missing templateId.

Implement the routes. `plan` route: read the wedding (for floorPlanId), `listWeddingTables`, and the floor plan (image/scale/zones). `generate`: `buildSeatingInput(guests, listWeddingTables(id), constraints)`; if tables empty → 400.

Run: `npm run test -- "apply-template" "generate/route"` then `npm run test` then `npx tsc --noEmit` then `npm run build`.

- [ ] **Step 2: Commit**

```bash
git add "src/app/api/weddings/[id]/apply-template" "src/app/api/weddings/[id]/plan" "src/app/api/weddings/[id]/generate" "src/app/api/weddings/[id]/assignment/route.test.ts"
git commit -m "feat(wedding): apply-template + plan/generate operate on wedding tables"
```

---

### Task 3: Wedding plan UI — pick a template, render + generate on the copy

**Files:**
- Modify: `src/components/plan/usePlan.ts` (fetch templates for the picker; apply-template; plan data now includes wedding tables + layout)
- Modify: `src/app/admin/wedding/[id]/plan/page.tsx` (template picker + "Usar este template"; render on the layout; Generate)
- Modify: `src/components/plan/PlanCanvas.tsx` if it needs the layout image/zones as background (it renders tables + guests; add the layout image + zones background like the editor)

**Interfaces:**
- Consumes: `GET /api/templates` (picker), `POST /api/weddings/[id]/apply-template`, `GET /api/weddings/[id]/plan` (now returns `tables` = wedding tables + `layout`), `POST generate`, existing assignment/drag.
- Produces: the plan tab shows a **template picker** ("{venue} — {name} — {min}-{max}") + "Usar este template" which applies (copies) the template; then the plan renders the wedding's tables on the template's **layout image + zones** background, and **Generate** + manual guest drag/lock/swap operate on the wedding's tables (as before, now sourced from the wedding). If no template applied yet, show a prompt to pick one. Re-applying a template warns it will replace current tables + seating.

- [ ] **Step 1: usePlan** — add `templates` (from GET /api/templates) + `applyTemplate(templateId)` (POST apply-template, then refresh plan data). Plan data now comes from `GET /api/weddings/[id]/plan` returning `{guests, constraints, tables, layout}`; expose `layout` (image/scale/zones) so the canvas can render the background. `generate()` no longer needs a floorPlanId.
- [ ] **Step 2: PlanCanvas background** — render the layout image (via `/api/uploads/...`) + zones (read-only) behind the tables, using the same natural-pixel/displayScale approach as the editor; keep tables/chips/colors/chairs/drag/lock/swap intact.
- [ ] **Step 3: plan page** — a template picker + "Usar este template" (confirm-replace if tables already exist); render the plan (canvas + table list + warnings) on the applied template; Generate; if no template applied, a clear empty state. Keep the color-by-attribute + legend (Plan 6) + chairs (Plan 9/12).
- [ ] **Step 4: Verify by driving the app** — on a wedding with imported guests: pick a template (that has tables + a layout image); "Usar este template" → the plan renders the copied tables on the layout background; Generate → guests seated on those tables; drag a guest between tables persists; reload → assignment persists; re-apply a template → replaces tables + clears seating (with warning). Screenshot. Report honestly.
- [ ] **Step 5: Gates + commit** — tsc/build/test green.

```bash
git add src/components/plan "src/app/admin/wedding/[id]/plan"
git commit -m "feat(wedding): plan tab picks a template + renders/generates on the copied tables"
```

---

### Task 4: Wedding table editing (editable copy)

**Files:**
- Modify: `src/components/plan/*` + the plan page — allow adding/removing/moving TABLES in the wedding (not just guests)
- Modify: `src/app/api/weddings/[id]/tables` — a PUT to save the wedding's tables (or reuse an existing endpoint) via `saveWeddingTables`

**Interfaces:**
- The couple can adjust the copied tables **for their wedding only**: move a table (drag), add a table from the catalog (the venue's table types, resolved from the template's venue), and remove a table — persisted via `saveWeddingTables` (a `PUT /api/weddings/[id]/tables` body `{tables}`), without touching the venue's template. Moving/adding/removing tables re-validates spacing/out-of-zone and keeps seating where possible (a removed table's guests become unassigned).

- [ ] **Step 1: Wedding tables PUT** — `PUT /api/weddings/[id]/tables` `{tables: TableInput[]}` → `saveWeddingTables`. (TDD a small round-trip.)
- [ ] **Step 2: Table-edit affordances in the plan** — add a "editar mesas" mode (or always-on): drag a table to move it (persist), an add-from-catalog control (venue table types), and a remove-table control; on remove, null the assignedTableId of guests seated there. Reuse the editor table patterns + Plan 12 realistic rendering. Keep guest drag/lock/swap working.
- [ ] **Step 3: Verify by driving the app** — after applying a template: move a table (persists on reload), add a table from the catalog, remove a table (its guests become unassigned), Generate still works on the edited set; the venue's template is UNCHANGED (verify its tables via the template editor). Screenshot. Report.
- [ ] **Step 4: Gates + commit** — tsc/build/test green.

```bash
git add "src/app/api/weddings/[id]/tables" src/components/plan "src/app/admin/wedding/[id]/plan"
git commit -m "feat(wedding): edit the copied tables (move/add/remove) without touching the template"
```

---

## Definition of Done

- `npm run test` green; `npx tsc --noEmit` + `npm run build` clean.
- In the running app: a wedding picks a template → its tables are copied into the wedding and rendered on the template's layout (image + zones); Generate seats guests on those tables; the couple can adjust the copied tables (move/add/remove) and re-seat, all without changing the venue's template; assignment + colors + chairs + drag/lock/swap all work. The Plan 13 restructure is complete end-to-end.

## What comes next

- **PDF export** with colors + legend + per-table list (the printable deliverable) — the main remaining feature.
- Follow-ups in `.superpowers/sdd/progress.md` (refine perf at ~200 guests; endpoint hardening; minor UX edges).
