# Table Shapes & Realistic Dimensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support three table shapes with the right dimension inputs — **round** (diameter), **oval** (large + small diameter), **rectangular** (length × width) — and draw every table on the canvas **to real scale** from those dimensions (not fixed-size glyphs), with chairs placed on the real outline.

**Architecture:** `TableType.shape` gains `"oval"`; dimensions are stored in the existing `width`/`depth` metre fields with per-shape meaning (round: diameter in both; oval: width=large, depth=small; rect: length×width). A pure helper converts a table's dimensions + the floor-plan `scale` (px/m) into on-screen pixel extents; both konva canvases (editor + plan view) render `Circle`/`Ellipse`/`Rect` at those extents, and chair positions derive from them. Catalog UI asks only the relevant inputs per shape. No table-ownership/flow changes here (that's Plans 13-14). Testable logic (dimension helper, chair layout) is TDD'd; UI verified by driving the app.

**Tech Stack:** Next.js (App Router), react-konva, existing pure floorplan helpers, Vitest.

## Global Constraints

- **Local-first only.** No cloud/network. **No schema migration** — `TableType.shape`/`Table.shape` are already `String`; `"oval"` is a new allowed value. Dimensions reuse the existing `width`/`depth` (metres) on `TableType` and `Table`.
- **Per-shape dimension meaning:** `round` → `width = depth = diameter`; `oval` → `width = large diameter`, `depth = small diameter`; `rect` → `width = length`, `depth = width(short side)`. Store both fields always (round sets depth = width) so downstream code can read width/depth uniformly.
- **Realistic rendering:** a table's on-screen size = its metre dimensions × the floor plan `scale` (px/m). When `scale` is 0/unset, fall back to a sensible default size (so drafts still render).
- **Builds on Plans 1-11.** Reuse the editor (`FloorPlanCanvas`), plan view (`PlanCanvas`), the catalog (`TableTypeCatalog`), and the pure `chairs.ts`/`geometry.ts`. Do NOT change table ownership, the seating engine, the generate flow, or drag/lock/swap/boundary behavior — only shapes, dimensions, and rendering.
- **Pure helpers stay pure.** `npx tsc --noEmit` + `npm run build` + `npm run test` stay green. UI verified by driving the app.
- **cwd hygiene:** shell commands start with `cd "d:/Claude - PA/projects/wedding-seating"`.

---

### Task 1: Catalog — three shapes with per-shape dimension inputs

**Files:**
- Modify: `src/components/venue/TableTypeCatalog.tsx` (shape select incl. "oval"; per-shape dimension fields)

**Interfaces:**
- The catalog create/edit form's **shape** select offers **Redonda** (`round`), **Oval** (`oval`), **Retangular** (`rect`).
- Dimension inputs depend on the selected shape:
  - round → a single **"Diâmetro (m)"** input → sends `width = depth = diameter`.
  - oval → **"Diâmetro maior (m)"** (`width`) + **"Diâmetro menor (m)"** (`depth`).
  - rect → **"Comprimento (m)"** (`width`) + **"Largura (m)"** (`depth`).
- The POST/PATCH bodies still send numeric `width` + `depth` (metres); only the labels/inputs shown change per shape. min/max seats + quantity unchanged.

- [ ] **Step 1: Shape-aware form** — in `TableTypeCatalog.tsx`, add `oval` to the shape `<select>`. Render the dimension inputs conditionally on the current shape (round: one "Diâmetro" bound to a value that sets both width and depth on submit; oval: "Diâmetro maior"→width, "Diâmetro menor"→depth; rect: "Comprimento"→width, "Largura"→depth). Keep the existing table listing; show a type's dimensions in a shape-appropriate way (e.g. round "⌀ 1.5 m", oval "1.8 × 1.2 m", rect "2.4 × 1.0 m"). Preserve res.ok error handling and the existing endpoints.

- [ ] **Step 2: Verify by driving the app (webapp-testing skill)** (dev server on :3000; start if down)
   1. Create a round type (diameter 1.5) → confirm it stores width=depth=1.5 (check via `GET /api/venues/[id]/table-types`) and lists as "⌀ 1.5 m".
   2. Create an oval type (1.8 × 1.2) and a rect type (2.4 × 1.0) → confirm width/depth stored + shape-appropriate labels.
   Screenshot. Report what was verified vs not.

- [ ] **Step 3: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test` (green).

```bash
git add src/components/venue/TableTypeCatalog.tsx
git commit -m "feat(catalog): round/oval/rect shapes with per-shape dimension inputs"
```

---

### Task 2: Pure render-size + chair layout for shapes

**Files:**
- Create: `src/lib/floorplan/tableShape.ts` (pure)
- Test: `src/lib/floorplan/tableShape.test.ts`
- Modify: `src/lib/floorplan/chairs.ts` (place chairs on the real outline for round/oval/rect)
- Test: update `src/lib/floorplan/chairs.test.ts` accordingly

**Interfaces:**
- `ShapeTable = { shape: string; width?: number | null; depth?: number | null; capacity: number }`.
- `DEFAULT_TABLE_METRES` reused from `spacing.ts` (fallback when dimensions absent).
- `tableRenderSize(table: ShapeTable, scale: number): { shape: "round" | "oval" | "rect"; wPx: number; hPx: number }` — pixel extents = metre dimensions × `scale`; round → wPx = hPx = diameterPx; oval → wPx (large), hPx (small); rect → wPx (length), hPx (short). When `scale <= 0`, use a fixed default pixel size (e.g. 92px) preserving aspect where known. Deterministic, pure.
- `chairPositions(table, scale)` (updated): places exactly `capacity` chairs around the real outline — a ring on the ellipse/circle for round/oval (using wPx/hPx), around the rectangle perimeter for rect. Still returns exactly `capacity` points (natural pixels, centered on the table's x/y — keep the existing x/y-centered contract).

- [ ] **Step 1: Write failing tests** — `tableShape.test.ts`: round 1.5m @ scale 50 → wPx=hPx=75; oval 1.8×1.2 @ 50 → wPx=90,hPx=60; rect 2.4×1.0 @ 50 → wPx=120,hPx=50; scale 0 → default fixed size. Update `chairs.test.ts` to assert `chairPositions` still returns `capacity` points and that for an oval the spread respects the wider axis (points' x-range > y-range), for round it's ~symmetric.

- [ ] **Step 2: Implement** — `tableShape.ts` per the interface; update `chairs.ts` to compute the ring/perimeter from `tableRenderSize` (oval ring via ellipse parametric x=cx+ (wPx/2+offset)·cosθ, y=cy+(hPx/2+offset)·sinθ; round is the oval case with wPx=hPx; rect distributes along the four edges of wPx×hPx + offset). Keep purity and the exact-count contract.

- [ ] **Step 3: Run + gates** — `npm run test -- tableShape chairs` then `npm run test` then `npx tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/floorplan/tableShape.ts src/lib/floorplan/tableShape.test.ts src/lib/floorplan/chairs.ts src/lib/floorplan/chairs.test.ts
git commit -m "feat(floorplan): pure realistic render-size + shape-aware chair layout"
```

---

### Task 3: Render tables to real scale on both canvases

**Files:**
- Modify: `src/components/editor/FloorPlanCanvas.tsx` (draw round/oval/rect at real px size; drop fixed ROUND_RADIUS/RECT_* glyphs)
- Modify: `src/components/plan/PlanCanvas.tsx` (same realistic rendering; chairs already colored — keep)
- Modify: the view types / geoms so each table's `shape`/`width`/`depth` reach the canvases (thread them through `EditorTable`/`PlanTableView` if not already; `Table` rows already carry width/depth/shape from Plan 8)

**Interfaces:**
- Both canvases compute each table's on-screen size via `tableRenderSize(table, scale)` (× displayScale for the view), and render:
  - `round`/`oval` → a Konva `Ellipse` (`radiusX = wPx/2`, `radiusY = hPx/2`) — a circle when wPx==hPx.
  - `rect` → a Konva `Rect` (`wPx`×`hPx`, centered via offset).
  - Labels/occupancy/name-chips/selection/warning highlight/drag/lock/swap and the HTML drop-overlay all use the same computed size (the overlay box = wPx×hPx × displayScale, centered on the table) so **drop targets stay aligned with the real shapes**.
  - Chairs use the updated `chairPositions` (Task 2).

- [ ] **Step 1: Thread dimensions** — ensure `EditorTable` (editor state) and `PlanTableView` (`usePlan`) carry `shape`, `width`, `depth`. The DB `Table` rows already have them; make sure the plan-data + editor-load paths pass them through (add fields if missing).

- [ ] **Step 2: Editor canvas** — in `FloorPlanCanvas`, replace the fixed-size `geoms` (ROUND_RADIUS/RECT_*) with `tableRenderSize`-driven per-table `wPx`/`hPx` (× displayScale), rendering Ellipse/Rect accordingly; keep the drop-overlay/hit-box derived from the SAME size so drag alignment holds (this is the critical geoms constraint from Plans 2/6/9).

- [ ] **Step 3: Plan canvas** — do the same in `PlanCanvas` (Ellipse/Rect at real size), keeping name chips, occupancy, colored tint (Plan 6), colored chairs (Plan 9), over-capacity red, and drag/lock/swap intact; chairs via the updated `chairPositions`.

- [ ] **Step 4: Verify by driving the app** — create round/oval/rect types, add tables of each to a floor plan (via the current add-from-catalog / template apply), and confirm on BOTH the editor and the wedding plan view that tables render at visibly different real sizes/shapes (a 2.4m rect is clearly bigger/longer than a 1.5m round; oval looks elliptical), chairs sit on the outline, and drag/drop still lands on the right table (alignment holds with the new sizes). Screenshot. Report what was verified vs not.

- [ ] **Step 5: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test`.

```bash
git add src/components/editor src/components/plan
git commit -m "feat(canvas): render tables to real scale (circle/ellipse/rect) on editor + plan"
```

---

## Definition of Done

- `npm run test` green; `npx tsc --noEmit` + `npm run build` clean.
- In the running app: the catalog defines round (diameter), oval (large+small diameter), and rectangular (length×width) table types; tables render on the editor and the wedding plan **to real scale** from those dimensions (circle/ellipse/rect), chairs sit on the real outline, and drag/lock/swap still work with the new sizes.

## What comes next

- **Plan 13:** Layouts = image + scale + multi-zone boundaries only (no tables); tables move to templates (positioned on a chosen layout); table editing happens in the Templates tab.
- **Plan 14:** Wedding consumes a template as an editable copy (Generate + manual edits on the copied tables).
- **Later:** PDF export with colors/legend/per-table list.
