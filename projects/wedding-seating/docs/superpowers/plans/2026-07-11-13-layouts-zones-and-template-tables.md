# Layouts (Zones) & Template-Owned Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Commit each task so an interruption is recoverable.

**Goal:** Make the venue's **Layouts** tab only about the room shell (photo + scale + multiple boundary **zones**), and move table placement into **Templates**: a template is tied to one layout, has a guest-count range, and holds **positioned tables** placed on that layout's background. (The wedding side keeps reading floor-plan tables for now; Plan 14 switches weddings to consume templates.)

**Architecture:** Additive schema — `FloorPlan.zones` (JSON array of polygons), `LayoutTemplate.floorPlanId` (the layout a template is built on), `Table.templateId` (tables can belong to a template; `floorPlanId` stays for the legacy/wedding path). The floor-plan editor becomes a **layout editor** (image + calibration + multi-zone drawing; no tables). The Templates tab gains a **table mini-editor** that renders the chosen layout's image + zones as read-only background and lets you add/drag catalog tables (realistic shapes from Plan 12), saved as the template's tables. Testable logic (schema/data/API) is TDD'd; the two editors are verified by driving the app.

**Tech Stack:** Next.js (App Router), Prisma/SQLite, react-konva, existing pure helpers, Vitest.

## Global Constraints

- **Local-first only.** No cloud/network.
- **Builds on Plans 1-12.** One migration adds `FloorPlan.zones String?`, `LayoutTemplate.floorPlanId String?` (+ relation), `Table.templateId String?` (+ relation); `Table.floorPlanId` becomes/stays nullable. Schema Postgres-portable.
- **Zones** = JSON array of polygons (each polygon = `{x,y}[]` in natural pixels). A point is "inside the room" if inside ANY zone (reuse `boundary.ts` per-polygon `pointInPolygon`). The old single `boundary` field stays but is superseded by `zones` (the layout editor migrates an existing `boundary` into `zones[0]` on first save).
- **Tables can belong to a template (`templateId`) OR a floor plan (`floorPlanId`).** This plan adds template-owned tables; the existing wedding flow (reads `listTables(floorPlanId)`) is left working. Do NOT break the seating engine or the wedding plan/generate.
- **Reuse Plan 12 realistic rendering** (`tableRenderSize`, Ellipse/Rect, chairs) and the catalog. Keep react-konva SSR/geoms/drag/lock patterns.
- **`npx tsc --noEmit` + `npm run build` + `npm run test` stay green.** UI verified by driving the app.
- **cwd hygiene:** shell commands start with `cd "d:/Claude - PA/projects/wedding-seating"`. Commit after each task.

---

### Task 1: Schema (zones, template.floorPlanId, table.templateId) + data-access + API

**Files:**
- Modify: `prisma/schema.prisma` + migration
- Modify: `src/lib/db/floorplans.ts` (`updateFloorPlanZones`)
- Modify: `src/lib/db/templates.ts` (`createTemplate` takes `floorPlanId`; keep whitelisted update)
- Create: `src/lib/db/templateTables.ts` (`saveTemplateTables`, `listTemplateTables`)
- Modify: `src/app/api/floorplans/[id]/route.ts` (PATCH accepts `zones`)
- Modify: `src/app/api/venues/[id]/templates/route.ts` (POST accepts `floorPlanId`)
- Create: `src/app/api/templates/[id]/tables/route.ts` (GET list, PUT save the template's tables)
- Test: `src/lib/db/templateTables.test.ts`, extend `src/lib/db/floorplans.test.ts`

**Interfaces:**
- Schema: `FloorPlan.zones String?`; `LayoutTemplate.floorPlanId String?` + `floorPlan FloorPlan? @relation(...)` and `templates` back-relation on FloorPlan; `Table.templateId String?` + `template LayoutTemplate? @relation(...)` and `tables` back-relation on LayoutTemplate; `Table.floorPlanId String?` (nullable).
- `updateFloorPlanZones(id, zones: string | null): Promise<FloorPlan>`.
- `createTemplate({venueId, floorPlanId, name, minGuests, maxGuests, lines?}): Promise<LayoutTemplate>` (lines now optional/legacy; floorPlanId stored).
- `saveTemplateTables(templateId, tables: TableInput[]): Promise<void>` (transaction: deleteMany where templateId, then createMany with templateId) and `listTemplateTables(templateId): Promise<Table[]>`. Reuse the `TableInput` type from `src/lib/db/tables.ts` (shape/capacity/x/y/fixed/width?/depth?/minCapacity?).
- `PATCH /api/floorplans/[id]` also accepts `{ zones: string | null }` (alongside scale/minSpacing/boundary).
- `POST /api/venues/[id]/templates` also accepts `floorPlanId`.
- `GET/PUT /api/templates/[id]/tables` — GET lists the template's tables; PUT body `{ tables: TableInput[] }` → saveTemplateTables (400 if not an array).

- [ ] **Step 1: Schema + migrate** — add the fields/relations; `npx prisma migrate dev --name add_zones_template_tables` (stop `next dev` first if it locks the Prisma DLL; re-run generate; don't leave half-applied).

- [ ] **Step 2: Failing tests → implement → pass**

`src/lib/db/templateTables.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { saveTemplateTables, listTemplateTables } from "./templateTables";
import { prisma } from "./client";

it("saves and lists a template's positioned tables (replace)", async () => {
  const v = await prisma.venue.create({ data: { name: "V TT" } });
  const fp = await prisma.floorPlan.create({ data: { venueId: v.id, image: "x", scale: 50, width: 10, depth: 10 } });
  const t = await prisma.layoutTemplate.create({ data: { venueId: v.id, floorPlanId: fp.id, name: "T", minGuests: 80, maxGuests: 100, lines: "[]" } });
  await saveTemplateTables(t.id, [
    { shape: "round", capacity: 8, x: 100, y: 100, fixed: false, width: 1.5, depth: 1.5 },
    { shape: "oval", capacity: 10, x: 200, y: 150, fixed: false, width: 1.8, depth: 1.2 },
  ]);
  expect((await listTemplateTables(t.id)).length).toBe(2);
  await saveTemplateTables(t.id, [{ shape: "rect", capacity: 6, x: 50, y: 50, fixed: false, width: 2.4, depth: 1 }]);
  const after = await listTemplateTables(t.id);
  expect(after.length).toBe(1);
  expect(after[0].shape).toBe("rect");
});

afterAll(async () => { await prisma.$disconnect(); });
```

Extend `floorplans.test.ts` with a `updateFloorPlanZones` store/clear test.

Implement the data-access + routes (await params, `.catch(()=>({}))`, PATCH zones branch reachable alongside the others; POST templates stores floorPlanId; templates/[id]/tables GET/PUT). `saveTemplateTables` mirrors `saveTables` but scopes to `templateId`.

Run: `npm run test -- templateTables floorplans` then `npm run test` then `npx tsc --noEmit` then `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/db/floorplans.ts src/lib/db/templates.ts src/lib/db/templateTables.ts "src/app/api/floorplans/[id]/route.ts" "src/app/api/venues/[id]/templates/route.ts" "src/app/api/templates/[id]/tables" src/lib/db/templateTables.test.ts src/lib/db/floorplans.test.ts
git commit -m "feat(venue): zones + template.floorPlanId + template-owned tables (schema/data/API)"
```

---

### Task 2: Layout editor = image + scale + multi-zone (no tables)

**Files:**
- Modify: `src/app/admin/floorplan/[id]/page.tsx` (remove table editing; multi-zone)
- Modify: `src/components/editor/FloorPlanCanvas.tsx` (render multiple zones; no table layer needed here — but the component is shared with the template editor, so keep table rendering available behind props)

**Interfaces:**
- The layout editor (`/admin/floorplan/[id]`, reached from the venue Layouts tab) now does ONLY: upload image, calibrate scale, and draw/manage **multiple zones** (draw a polygon → "Nova zona" to start another → "Limpar zonas"), persisted via `PATCH /api/floorplans/[id]` `{ zones: JSON.stringify(polygons) }`. Remove the add-table control, add-from-catalog, apply-template, table inspector, and spacing warnings from THIS page (they move to the template editor in Task 3).
- `FloorPlanCanvas` renders `zones` as multiple closed translucent polygons; the boundary-draw mode appends to the CURRENT zone; a "Nova zona" action starts a new polygon. Keep table rendering (Plan 12) available via props so the same component serves the template editor (Task 3) — but the layout page passes no editable tables.

- [ ] **Step 1: Multi-zone in the canvas** — extend `FloorPlanCanvas` to accept `zones: {x,y}[][]` and render each as a closed translucent Line; the draw mode appends points to the active (last) zone; expose an "start new zone" affordance. Migrate a legacy single `boundary` into `zones[0]` on load if `zones` is absent.
- [ ] **Step 2: Layout page trim** — in `floorplan/[id]/page.tsx`, remove table-editing UI (add-table, catalog select, apply-template, inspector, spacing panel) and wire the multi-zone controls (Desenhar zona / Nova zona / Limpar zonas) + persist `zones`. Keep image upload + calibration.
- [ ] **Step 3: Verify by driving the app** — open a layout; upload image; calibrate; draw TWO separate zones; reload → both persist; confirm there is NO table-adding UI here. Screenshot. Report.
- [ ] **Step 4: Gates + commit** — tsc/build/test green.

```bash
git add "src/app/admin/floorplan/[id]" src/components/editor
git commit -m "feat(layout): layout editor = image + scale + multi-zone only (tables removed)"
```

---

### Task 3: Template editor — place tables on a chosen layout

**Files:**
- Modify/replace: `src/app/admin/venue/[id]/templates/page.tsx` (create/edit → open the table editor on the chosen layout)
- Create: `src/components/venue/TemplateTableEditor.tsx` (canvas: layout image + zones background + add/drag catalog tables → save via PUT templates/[id]/tables)
- Reuse: `FloorPlanCanvas` (with the layout's image/zones as read-only background + editable tables) or a focused wrapper

**Interfaces:**
- The Templates tab lists templates ("{name} — {min}-{max} — {layout}"); create/edit a template requires choosing a **layout** (this venue's floor plans, via `GET /api/floorplans` filtered by venueId) + name + guest range. Opening a template shows a canvas with that layout's image (`/api/uploads/...`) + its zones (read-only) as background, and lets the user **add tables from the catalog** (realistic shapes, Plan 12) and drag them; "Guardar" persists via `PUT /api/templates/[id]/tables`. Also surface the spacing/out-of-any-zone warnings here (reuse `spacingViolations` + `pointInPolygon`-per-zone) since this is where tables now live.
- On load, the editor fetches the template's tables (`GET /api/templates/[id]/tables`), the layout floor plan (image+scale+zones), and the venue's table types.

- [ ] **Step 1: Template create with layout picker** — extend the create/edit form: a floor-plan `<select>` (venue's layouts) + name + min/max guests → POST/PATCH stores `floorPlanId`. After create, navigate/open the table editor for that template.
- [ ] **Step 2: TemplateTableEditor** — canvas with the layout image + zones (read-only) as background and editable tables (reuse the Plan 12 realistic rendering + the add-from-catalog + drag from the old floor-plan editor, now writing to the template's tables). Save via `PUT /api/templates/[id]/tables`. Show spacing + out-of-any-zone warnings.
- [ ] **Step 3: Verify by driving the app** — create a template on a layout (that has an image + zones); add round/oval/rect tables from the catalog; drag them; Guardar; reopen/reload → tables persist on the template with positions + shapes; confirm the layout image + zones show as background. Screenshot. Report.
- [ ] **Step 4: Gates + commit** — tsc/build/test green.

```bash
git add "src/app/admin/venue/[id]/templates" src/components/venue
git commit -m "feat(templates): table mini-editor — place catalog tables on a layout"
```

---

### Task 4: Cleanup — remove composition-lines template UI + apply-template-in-layout

**Files:**
- Modify: remove the old JSON-`lines` composition UI (Plan 11 Task 3) now replaced by positioned tables
- Modify: remove "Aplicar template" from the layout editor (Plan 11 Task 4) — templates are now built by placing tables, not applied to a layout editor

**Interfaces:**
- Templates no longer use the `lines` composition list in the UI (the field stays in the DB as legacy but is unused). The layout editor no longer has an "Aplicar template" control (that belonged to the old model). The Templates tab is fully the positioned-table editor.

- [ ] **Step 1: Remove the composition-lines UI** from the templates page (superseded by Task 3's editor) and the apply-template control from the layout editor. Keep the DB `lines` column (ignored).
- [ ] **Step 2: Verify + gates** — tsc/build/test green; drive the app to confirm the templates flow is coherent (create template → place tables → save → reopen) and the layout editor is zones-only. Screenshot. Report.
- [ ] **Step 3: Commit**

```bash
git add "src/app/admin" src/components
git commit -m "chore(venue): remove legacy composition-lines + apply-template UI (superseded by positioned templates)"
```

---

## Definition of Done

- `npm run test` green; `npx tsc --noEmit` + `npm run build` clean.
- In the running app: the venue Layouts tab edits only image + scale + multiple zones (no tables); the Templates tab creates templates tied to a chosen layout with a guest range and lets you place catalog tables (realistic shapes) on the layout background, saved as the template's positioned tables; spacing/out-of-zone warnings show in the template editor. (The wedding still reads floor-plan tables — Plan 14 switches it to consume templates.)

## What comes next

- **Plan 14:** Wedding consumes a template as an editable copy — pick a template → copy its tables into the wedding → Generate + manual edits on the copy, rendered on the template's layout background.
- **Later:** PDF export with colors/legend/per-table list.
