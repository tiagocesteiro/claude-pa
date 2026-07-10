# Venue Tabs & Layout Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organise the venue admin into three tabs — **Mesas disponíveis** (table-type catalog), **Layouts de salas** (floor plans), **Templates** (saved table configurations by guest-count range) — and let the couple apply a template to a floor plan to bulk-add its tables.

**Architecture:** A shared venue `layout.tsx` with a tab bar. The catalog (Plan 8) becomes the base tab; the per-venue floor-plan list (from Plan 10) moves into a "Layouts" tab; a new `LayoutTemplate` model (name + guest range + JSON lines of `{tableTypeId, quantity}`) powers a "Templates" tab and an "Aplicar template" action in the floor-plan editor that bulk-adds tables (prefilled from the catalog, auto-positioned in a grid). Testable logic (schema/data/API/auto-grid) is TDD'd; UI verified by driving the app.

**Tech Stack:** Next.js (App Router), Prisma/SQLite, existing components, Vitest.

## Global Constraints

- **Local-first only.** No cloud/network.
- **Builds on Plans 1-10.** One migration adds `LayoutTemplate` (per venue). Reuse `TableType` (catalog), `GET /api/floorplans`, the floor-plan editor, and the tables PUT (carries width/depth/minCapacity). Schema Postgres-portable.
- **Template lines are JSON:** `LayoutTemplate.lines` = JSON string of `{ tableTypeId: string; quantity: number }[]`. A line referencing a deleted table type is ignored on apply (no FK on the JSON), same pattern as `extraGroups`/`boundary`.
- **Applying a template is additive + non-destructive:** it ADDS tables to the current floor plan (auto-grid positions in natural pixels); it does not clear existing tables. The user then drags them.
- **Do not disturb** the seating engine, react-konva SSR/geoms/drag, or existing catalog/editor behavior. `npx tsc --noEmit` + `npm run build` + `npm run test` (104 tests) stay green. UI verified by driving the app.
- **cwd hygiene:** shell commands start with `cd "d:/Claude - PA/projects/wedding-seating"` (or a subshell); never leave the shell cwd stranded.

---

### Task 1: Venue tabbed layout + Layouts tab (floor plans under the venue)

**Files:**
- Create: `src/app/admin/venue/[id]/layout.tsx` (venue-name header + tab bar)
- Modify: `src/app/admin/venue/[id]/page.tsx` (base tab = catalog; drop the h1/back now owned by the layout)
- Create: `src/app/admin/venue/[id]/layouts/page.tsx` (this venue's floor plans: list + create + open)
- Modify: `src/app/admin/page.tsx` (replace the per-venue floor-plan list with an "Abrir quinta" link to `/admin/venue/[id]`; keep create-venue + the venue list)

**Interfaces:**
- Venue layout tabs (active via `usePathname()`): **Mesas disponíveis** → `/admin/venue/[id]` (exact), **Layouts de salas** → `/admin/venue/[id]/layouts`, **Templates** → `/admin/venue/[id]/templates`.
- Layouts tab: lists `GET /api/floorplans` filtered by `venueId`; a "Nova planta" button (`POST /api/floorplans` → `router.push('/admin/floorplan/[id]')`) and an "Editar" link per existing plan ("Planta N", "(sem imagem)" for empty). Reuses the exact logic moved out of the admin page.

- [ ] **Step 1: Venue layout** — `layout.tsx` (`"use client"`): fetch venue name (find in `GET /api/venues` by `[id]`), render `<h1>{name}</h1>` (+ location) and a tab bar of three `next/link`s active-highlighted via `usePathname()` (base exact for catalog; `endsWith("/layouts")`; `endsWith("/templates")`). Render `{children}` below.

- [ ] **Step 2: Base tab = catalog** — trim `page.tsx` to remove the `<h1>`/back link (now in layout) and just render `<TableTypeCatalog venueId={venueId} />`.

- [ ] **Step 3: Layouts tab** — `layouts/page.tsx` (`"use client"`): the floor-plan list for this venue (move the logic from `admin/page.tsx`): fetch `/api/floorplans`, filter by `venueId`, render "Planta N" edit links + a "Nova planta" button; "Sem plantas ainda." when none.

- [ ] **Step 4: Admin page cleanup** — in `admin/page.tsx`, replace the per-venue floor-plan list + "New floor plan" button with a single `Link` "Abrir quinta" → `/admin/venue/[id]` (the "Table type catalog" link can be dropped since it's now a tab). Keep the venue create form + list and the weddings section unchanged.

- [ ] **Step 5: Verify by driving the app** (dev server on :3000; start if down)
   1. Open `/admin` → each venue shows "Abrir quinta"; click it → venue page with tabs (Mesas disponíveis active) + venue name.
   2. Click "Layouts de salas" → existing plans listed + "Nova planta"; open an existing plan → editor loads it. Click "Templates" → (placeholder page for now is fine until Task 3). Active-tab highlight follows.
   Screenshot the venue tabs. Report what was verified vs not.

- [ ] **Step 6: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test` (green).

```bash
git add "src/app/admin/venue/[id]" src/app/admin/page.tsx
git commit -m "feat(venue): tabbed venue admin (Mesas/Layouts/Templates) + floor plans under Layouts"
```

(If `templates/page.tsx` doesn't exist yet, add a minimal placeholder in this task so the tab link resolves; Task 3 fills it in.)

---

### Task 2: LayoutTemplate schema + data-access + API

**Files:**
- Modify: `prisma/schema.prisma` (`LayoutTemplate` model) + migration
- Create: `src/lib/db/templates.ts`
- Create: `src/app/api/venues/[id]/templates/route.ts` (GET, POST)
- Create: `src/app/api/templates/[id]/route.ts` (PATCH, DELETE)
- Test: `src/lib/db/templates.test.ts`, `src/app/api/venues/[id]/templates/route.test.ts`

**Interfaces:**
- Schema:
  ```prisma
  model LayoutTemplate {
    id        String  @id @default(cuid())
    venueId   String
    venue     Venue   @relation(fields: [venueId], references: [id], onDelete: Cascade)
    name      String
    minGuests Int
    maxGuests Int
    lines     String  // JSON: { tableTypeId: string; quantity: number }[]
    createdAt DateTime @default(now())
  }
  ```
  Add `layoutTemplates LayoutTemplate[]` to `Venue`.
- Data-access: `createTemplate({venueId,name,minGuests,maxGuests,lines})`, `listTemplates(venueId)`, `updateTemplate(id, patch)` (whitelisted fields: name/minGuests/maxGuests/lines), `deleteTemplate(id)`. `lines` is passed/stored as a JSON string.
- API: `GET/POST /api/venues/[id]/templates` (POST 201; 400 on missing name); `PATCH/DELETE /api/templates/[id]` (PATCH whitelists name/minGuests/maxGuests/lines — do NOT pass the raw body to Prisma).

- [ ] **Step 1: Schema + migrate** — add the model; `npx prisma migrate dev --name add_layout_templates` (stop `next dev` first if it locks the Prisma DLL).

- [ ] **Step 2: Failing tests → implement → pass**

`src/lib/db/templates.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { createTemplate, listTemplates, updateTemplate, deleteTemplate } from "./templates";
import { prisma } from "./client";

it("CRUDs layout templates for a venue", async () => {
  const v = await prisma.venue.create({ data: { name: "V Tpl" } });
  const lines = JSON.stringify([{ tableTypeId: "tt1", quantity: 10 }]);
  const t = await createTemplate({ venueId: v.id, name: "80-100", minGuests: 80, maxGuests: 100, lines });
  expect(JSON.parse(t.lines)).toHaveLength(1);
  const upd = await updateTemplate(t.id, { maxGuests: 110 });
  expect(upd.maxGuests).toBe(110);
  expect((await listTemplates(v.id)).length).toBe(1);
  await deleteTemplate(t.id);
  expect((await listTemplates(v.id)).length).toBe(0);
});

afterAll(async () => { await prisma.$disconnect(); });
```

`src/app/api/venues/[id]/templates/route.test.ts`: POST create (201) + missing-name (400) + GET list, mirroring the table-types route test.

Implement `src/lib/db/templates.ts` (thin Prisma wrappers; `updateTemplate` typed `Partial<Pick<...>>`) and the routes (await params, `.catch(()=>({}))`, POST validates `name` + numeric guest range; PATCH **whitelists** name/minGuests/maxGuests/lines like the table-type PATCH fix).

Run: `npm run test -- templates` then `npm run test` then `npx tsc --noEmit` then `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/db/templates.ts "src/app/api/venues/[id]/templates" "src/app/api/templates" src/lib/db/templates.test.ts "src/app/api/venues/[id]/templates/route.test.ts"
git commit -m "feat(venue): LayoutTemplate model + data-access + CRUD API"
```

---

### Task 3: Templates tab UI

**Files:**
- Create/replace: `src/app/admin/venue/[id]/templates/page.tsx`
- (Optional) Create: `src/components/venue/TemplateEditor.tsx`

**Interfaces:**
- Consumes: `/api/venues/[id]/templates` (GET/POST), `/api/templates/[id]` (PATCH/DELETE), and the venue's table types (`GET /api/venues/[id]/table-types`) to populate line selects.
- Produces: a page listing the venue's templates and a form to create/edit one — name, minGuests, maxGuests, and a list of **lines** (each = a table-type select from the catalog + a quantity), with add/remove line; delete a template. `lines` is sent as `JSON.stringify([{tableTypeId, quantity}])`. res.ok error handling.

- [ ] **Step 1: Build the templates page** (`"use client"`): load templates + table types; render each template (name, "80-100 convidados", and its lines resolved to type names + quantities) with edit/delete; a create/edit form with name, min/max guests, and dynamic line rows (tableType `<select>` + quantity input, add/remove). Save POSTs (create) or PATCHes (edit) with `lines` JSON. Show a helpful empty state ("Sem templates ainda") and a note if the venue has no table types yet ("Cria tipos de mesa primeiro").

- [ ] **Step 2: Verify by driving the app** — with a venue that has table types, create a template (e.g. "80-100" → 10× Redonda-8, 2× Rect-10); reload → it persists and shows the resolved lines; edit the max guests; delete. Screenshot. Report.

- [ ] **Step 3: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test`.

```bash
git add "src/app/admin/venue/[id]/templates" src/components/venue
git commit -m "feat(venue): templates tab — create/edit table configurations by guest count"
```

---

### Task 4: Apply a template in the floor-plan editor (auto-grid)

**Files:**
- Create: `src/lib/floorplan/autoLayout.ts` (pure) + test
- Modify: the floor-plan editor (`src/app/admin/floorplan/[id]/page.tsx` + editor components/state) — an "Aplicar template" control

**Interfaces:**
- `autoGridPositions(count: number, opts: { originX: number; originY: number; cellPx: number; cols?: number }): { x: number; y: number }[]` (pure, natural pixels) — returns exactly `count` points laid out row-major in a grid; `cols` defaults to `Math.ceil(Math.sqrt(count))`; cell spacing `cellPx`. Deterministic.
- Editor: an "Aplicar template" select of the venue's templates (fetched via `GET /api/venues/[id]/templates`; the floor plan's `venueId` is available from its GET). Applying expands each line into `quantity` tables of that table type (prefilled `capacity=maxSeats, minCapacity=minSeats, width/depth/shape` from the type), assigns `autoGridPositions` (cell size from the largest table dimension × scale, origin at a sensible offset), ADDS them to the editor state, and persists via the tables PUT. A short confirmation shows how many tables were added.

- [ ] **Step 1: Pure auto-grid (TDD)** — `autoLayout.ts` + test: `autoGridPositions(10, {originX:100, originY:100, cellPx:120})` returns 10 points, row-major, with `Math.ceil(sqrt(10))=4` columns (assert count + that the first row's y equals originY and points step by cellPx). Deterministic.

- [ ] **Step 2: Apply in the editor** — add an "Aplicar template" `<select>` (venue templates) + button near the existing "adicionar do catálogo"; on apply, build the table list from the template's lines (resolve each `tableTypeId` in the venue's table types; skip unknown), position via `autoGridPositions`, append to editor state, and Save (tables PUT). Non-destructive (adds to existing). Show "N mesas adicionadas do template X".

- [ ] **Step 3: Verify by driving the app** — on a floor plan, "Aplicar template" for a template with (e.g.) 12 tables → confirm 12 tables appear in a grid, prefilled (capacity/dimensions from their types), and persist on reload; existing tables are kept. Screenshot. Report.

- [ ] **Step 4: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test`.

```bash
git add src/lib/floorplan/autoLayout.ts src/lib/floorplan/autoLayout.test.ts "src/app/admin/floorplan/[id]" src/components/editor
git commit -m "feat(editor): apply layout template — bulk-add tables in an auto-grid"
```

---

## Definition of Done

- `npm run test` green; `npx tsc --noEmit` + `npm run build` clean.
- In the running app: the venue admin has three tabs (Mesas disponíveis | Layouts de salas | Templates); the couple defines table types, manages the venue's floor plans, creates table-configuration templates by guest-count range, and applies a template to a floor plan to bulk-add its tables (auto-positioned, prefilled from the catalog), then adjusts by hand.

## What comes next

- **Plan 12:** PDF export with color coding + legend + per-table list (the printable deliverable).
