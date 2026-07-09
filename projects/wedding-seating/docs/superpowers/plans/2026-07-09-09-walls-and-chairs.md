# Floor-Plan Walls & Chair Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin draw the usable room boundary (walls/counters) over the floor-plan photo so tables can be kept inside it (with an out-of-bounds warning), and render chairs around each table on the plan — coloring the occupied chairs by the selected guest attribute for a richer, printable seating picture.

**Architecture:** A `FloorPlan.boundary` JSON polygon (natural-pixel points) drawn in the editor; a pure point-in-polygon helper flags tables whose center falls outside; and the plan view renders `capacity` chair marks around each table, filling occupied chairs with the seated guests' attribute colors (reusing the Plan 6 color model). Boundary is a **visual guide + warning**, not a solver constraint (the solver seats guests into existing tables; it does not move tables). Testable logic (schema/geometry/data/API) is TDD'd; UI verified by driving the app.

**Tech Stack:** Next.js (App Router), Prisma/SQLite, react-konva, the pure floorplan geometry helpers, Vitest.

## Global Constraints

- **Local-first only.** No cloud/network.
- **Builds on Plans 1-8.** One migration adds `FloorPlan.boundary String?` (JSON array of `{x,y}` natural-pixel points forming the usable-area polygon; null = no boundary). Schema Postgres-portable.
- **Boundary is natural-pixel** (same coordinate space as table x/y), rendered with the existing displayScale. Boundary is a **visual guide + out-of-bounds warning only** — it does NOT constrain the seating solver.
- **Chairs are visual only.** We assign guests to tables (not to specific seats); chairs render `capacity` marks per table, the first `occupancy` filled (in the table's guest-list order) and colored via the Plan 6 `colorByGuest`; empty chairs are neutral. No new seat-assignment persistence.
- **Reuse existing pure helpers** (`geometry.ts`, `colors.ts`) and the react-konva SSR/natural-pixel/geoms patterns — do NOT disturb drag/lock/swap/spacing behavior.
- **Pure geometry stays pure.** DB tests use the throwaway test DB. TDD for logic/data/API; UI verified by driving the app; tsc + build clean.

---

### Task 1: Schema `FloorPlan.boundary` + data-access + API

**Files:**
- Modify: `prisma/schema.prisma` (`boundary String?` on FloorPlan) + migration
- Modify: `src/lib/db/floorplans.ts` (`updateFloorPlanBoundary`)
- Modify: `src/app/api/floorplans/[id]/route.ts` (PATCH accepts optional `boundary`)
- Test: `src/lib/db/floorplans.test.ts` (extend, or a small new test)

**Interfaces:**
- `FloorPlan.boundary String?` — JSON string of `{ x: number; y: number }[]` (natural pixels), or null.
- `updateFloorPlanBoundary(id: string, boundary: string | null): Promise<FloorPlan>`.
- `PATCH /api/floorplans/[id]` also accepts `{ boundary: string | null }` (in addition to `scale` and `minSpacing`).

- [ ] **Step 1: Add field + migrate**

Add `boundary String?` to `model FloorPlan`. Run `npx prisma migrate dev --name add_floorplan_boundary` (stop `next dev` first if it locks the Prisma DLL; re-run generate if needed; don't leave it half-applied).

- [ ] **Step 2: Write failing test**

Add to `src/lib/db/floorplans.test.ts`:

```ts
import { updateFloorPlanBoundary } from "./floorplans";

it("stores and clears a floor plan boundary", async () => {
  const v = await createVenue({ name: "V Bound" });
  const fp = await createFloorPlan({ venueId: v.id, image: "x", scale: 50, width: 10, depth: 10 });
  const poly = JSON.stringify([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
  const updated = await updateFloorPlanBoundary(fp.id, poly);
  expect(JSON.parse(updated.boundary!)).toHaveLength(3);
  const cleared = await updateFloorPlanBoundary(fp.id, null);
  expect(cleared.boundary).toBeNull();
});
```

- [ ] **Step 3: Run to fail → implement → pass**

Add to `src/lib/db/floorplans.ts`:

```ts
export function updateFloorPlanBoundary(id: string, boundary: string | null): Promise<FloorPlan> {
  return prisma.floorPlan.update({ where: { id }, data: { boundary } });
}
```

In `src/app/api/floorplans/[id]/route.ts` PATCH, add a branch: if `b.boundary === null || typeof b.boundary === "string"`, call `updateFloorPlanBoundary(id, b.boundary)`. Keep the existing `scale` + `minSpacing` branches (a body with any one of them works).

Run: `npm run test -- floorplans` then `npm run test` then `npx tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/db/floorplans.ts "src/app/api/floorplans/[id]/route.ts" src/lib/db/floorplans.test.ts
git commit -m "feat(floorplan): boundary polygon field + data-access + PATCH"
```

---

### Task 2: Pure geometry — point-in-polygon + out-of-bounds tables

**Files:**
- Create: `src/lib/floorplan/boundary.ts`
- Test: `src/lib/floorplan/boundary.test.ts`

**Interfaces:**
- `Pt = { x: number; y: number }`.
- `pointInPolygon(p: Pt, polygon: Pt[]): boolean` — standard ray-casting; a polygon with < 3 points returns `true` (no boundary = everything inside).
- `outOfBoundsTables(tables: { id: string; x: number; y: number }[], polygon: Pt[]): string[]` — ids of tables whose center is NOT inside the polygon (empty when polygon has < 3 points).

- [ ] **Step 1: Write the failing test**

Create `src/lib/floorplan/boundary.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pointInPolygon, outOfBoundsTables } from "./boundary";

const square = [ { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 } ];

it("point-in-polygon for a square", () => {
  expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
  expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
});

it("no boundary (<3 pts) treats everything as inside", () => {
  expect(pointInPolygon({ x: 999, y: 999 }, [])).toBe(true);
  expect(outOfBoundsTables([{ id: "t1", x: 999, y: 999 }], [])).toEqual([]);
});

it("flags tables outside the polygon", () => {
  const tables = [ { id: "in", x: 5, y: 5 }, { id: "out", x: 20, y: 20 } ];
  expect(outOfBoundsTables(tables, square)).toEqual(["out"]);
});
```

- [ ] **Step 2: Run to fail → implement → pass**

Create `src/lib/floorplan/boundary.ts` with a standard ray-casting `pointInPolygon` and `outOfBoundsTables`. Run: `npm run test -- boundary` then `npm run test` then `npx tsc --noEmit`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/floorplan/boundary.ts src/lib/floorplan/boundary.test.ts
git commit -m "feat(floorplan): pure point-in-polygon + out-of-bounds table check"
```

---

### Task 3: Editor UI — draw the room boundary + out-of-bounds warning

**Files:**
- Modify: `src/components/editor/FloorPlanCanvas.tsx` (render the boundary polygon; a draw mode to add points)
- Modify: `src/app/admin/floorplan/[id]/page.tsx` (boundary draw/clear controls; PATCH boundary; out-of-bounds warning)
- Modify: `src/components/editor/useEditorState.ts` if boundary is kept in editor state

**Interfaces:**
- Consumes: `PATCH /api/floorplans/[id]` (`{boundary}`), the pure `outOfBoundsTables`.
- Produces: a "desenhar limites da sala" mode where clicking on the image adds polygon points (in natural pixels, via the existing `toNatural` conversion); the polygon renders as a translucent overlay (react-konva `Line` closed); a "limpar limites" button; the boundary persists (PATCH). A warnings line lists tables whose center falls outside the boundary ("Mesa X fora dos limites da sala").

- [ ] **Step 1: Render + draw** — in `FloorPlanCanvas`, accept a `boundary: {x,y}[]` prop and render a closed, translucent Konva `Line` (points scaled by displayScale). Add a boundary-draw mode: while active, a stage click appends the clicked point (converted to natural pixels) to the boundary; a visible vertex marker per point. Keep the existing table drag/add/spacing behavior working when NOT in boundary-draw mode (mode is mutually exclusive with add-table).

- [ ] **Step 2: Controls + persist + warn** — in the editor page: buttons "Desenhar limites" (toggle draw mode), "Limpar limites" (set boundary = []/null), and save on change (PATCH `{boundary: JSON.stringify(points) or null}`). Compute `outOfBoundsTables(state.tables, boundary)` and render a warnings line; optionally highlight offending tables (reuse the warning highlight from Plan 8 if easy).

- [ ] **Step 3: Verify by driving the app (webapp-testing skill)** (dev server on :3000; start if down)
   1. Draw a boundary polygon around part of the image; reload → boundary persists and re-renders.
   2. Place a table inside → no warning; drag it outside the polygon → "fora dos limites" warning appears; move back → clears.
   Screenshot. Report what was verified vs not.

- [ ] **Step 4: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test`.

```bash
git add src/components/editor "src/app/admin/floorplan/[id]"
git commit -m "feat(editor): draw room boundary + out-of-bounds table warning"
```

---

### Task 4: Plan view — chair rendering colored by attribute

**Files:**
- Modify: `src/components/plan/PlanCanvas.tsx` (render chairs around each table; color occupied chairs by `colorByGuest`)
- Possibly Create: `src/lib/floorplan/chairs.ts` (pure: compute chair positions around a table) + test
- Modify: `src/app/admin/wedding/[id]/plan/page.tsx` if a "mostrar cadeiras" toggle is added

**Interfaces:**
- `chairPositions(table: { x: number; y: number; capacity: number; shape: string; width?: number|null; depth?: number|null }, scale: number): { x: number; y: number }[]` (pure, natural pixels) — evenly spaced points around the table perimeter (a ring for `round`, along the four edges for `rect`), one per seat up to `capacity`.
- `PlanCanvas` renders each table's chairs (small Konva circles), filling the first `occupancy` chairs (in the table's seated-guest order) with `colorByGuest[guestId]` (fallback neutral) and the rest light gray. Reuses the existing `geoms`/displayScale; must NOT disturb drag/lock/swap/tint.

- [ ] **Step 1: Pure chair layout (TDD)** — create `src/lib/floorplan/chairs.ts` + test: `chairPositions` returns exactly `capacity` points; for a `round` table they lie on a ring of a sensible radius (from width/depth or a default) centered on x/y; assert count and that all points are within a bounding box around the center. Keep it deterministic.

```ts
// example assertion
it("returns capacity chairs around a round table", () => {
  const pts = chairPositions({ x: 100, y: 100, capacity: 8, shape: "round", width: 1.5, depth: 1.5 }, 50);
  expect(pts).toHaveLength(8);
});
```

- [ ] **Step 2: Render chairs in PlanCanvas** — for each table, compute `chairPositions` (scaled by displayScale for on-screen), render small circles; map the table's seated guests (already available per table) to the first N chairs and fill with `colorByGuest[guestId]` (neutral when no color/attr selected); empty chairs light gray. Keep table shape, labels, name chips, drag/lock/swap, and the shared `geoms` alignment intact — chairs are an additional decorative layer.

- [ ] **Step 3: Verify by driving the app** — on a generated plan, confirm chairs render around tables matching capacity; pick "Pintar por: Faixa etária" (Plan 6) → confirm occupied chairs take the guests' attribute colors and empty chairs stay neutral. Screenshot the colored chairs. Report what was verified vs not.

- [ ] **Step 4: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test`.

```bash
git add src/lib/floorplan/chairs.ts src/lib/floorplan/chairs.test.ts src/components/plan "src/app/admin/wedding/[id]/plan"
git commit -m "feat(plan): chair rendering per table colored by guest attribute"
```

---

## Definition of Done

- `npm run test` green; `npx tsc --noEmit` + `npm run build` clean.
- In the running app: the admin can draw the room boundary over the floor-plan photo (persisted) and gets a warning when a table sits outside it; the plan view renders chairs around each table with occupied chairs colored by the selected guest attribute.

## What comes next

- **Plan 10:** PDF export with color coding + legend + per-table list + (optionally) the chair/boundary rendering.
- **Deferred:** positioned layout templates by guest-count (Plan 8b).
