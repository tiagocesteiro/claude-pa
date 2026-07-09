# Venue Table Catalog & Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each venue a catalog of table types (name, shape, min/max seats, dimensions, quantity), let the floor-plan editor add tables from that catalog (prefilled), warn when a used table sits below its minimum occupancy, and warn when tables are closer than a configurable minimum spacing.

**Architecture:** A `TableType` catalog per venue + optional dimensions/min-capacity on `Table` + a `minSpacing` on `FloorPlan` (schema). CRUD data-access + API for the catalog and spacing. Pure geometry helpers compute spacing violations and under-min tables (tested). The floor-plan editor manages the catalog and adds tables from a type; the plan/editor surfaces spacing + under-min warnings. Testable logic (schema/data/API/geometry) is TDD'd; UI verified by driving the app.

**Tech Stack:** Next.js (App Router), Prisma/SQLite, the pure floorplan geometry helpers, Vitest.

## Global Constraints

- **Local-first only.** No cloud/network.
- **Builds on Plans 1-7.** One migration adds: `TableType` model (per venue); `Table.width Float?`, `Table.depth Float?`, `Table.minCapacity Int?`; `FloorPlan.minSpacing Float?` (metres). `Table.capacity` stays = the maximum seats. Schema Postgres-portable.
- **Dimensions + spacing are in metres**, converted to pixels via the floor plan's `scale` (px/metre) for on-screen checks — reuse the Plan 2 geometry helpers.
- **Min occupancy and spacing are WARNINGS, not solver constraints** (the solver places guests into existing tables; it doesn't move tables or enforce min occupancy). Deferring solver-level min-occupancy keeps risk low.
- **Templates (saved positioned layouts by guest-count) are OUT OF SCOPE here** — deferred to a later plan; this plan delivers the catalog + dimensions + min/max + spacing + add-from-catalog.
- **Pure geometry stays pure** (`src/lib/floorplan/*`). DB tests use the throwaway test DB. TDD for logic/data/API; UI verified by driving the app; tsc + build clean.

---

### Task 1: Schema (TableType, dimensions, min-capacity, min-spacing) + data-access

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/db/tableTypes.ts`
- Modify: `src/lib/db/floorplans.ts` (`updateFloorPlanSpacing`)
- Test: `src/lib/db/tableTypes.test.ts`

**Interfaces:**
- Schema:
  ```prisma
  model TableType {
    id        String  @id @default(cuid())
    venueId   String
    venue     Venue   @relation(fields: [venueId], references: [id], onDelete: Cascade)
    name      String
    shape     String  // "round" | "rect"
    minSeats  Int
    maxSeats  Int
    width     Float   // metres
    depth     Float   // metres
    quantity  Int     @default(1)
    createdAt DateTime @default(now())
  }
  ```
  Add `tableTypes TableType[]` to `Venue`. Add to `Table`: `width Float?`, `depth Float?`, `minCapacity Int?`. Add to `FloorPlan`: `minSpacing Float?`.
- Data-access:
  - `createTableType(input: { venueId; name; shape; minSeats; maxSeats; width; depth; quantity? }): Promise<TableType>`
  - `listTableTypes(venueId): Promise<TableType[]>`
  - `updateTableType(id, patch): Promise<TableType>`
  - `deleteTableType(id): Promise<void>`
  - `updateFloorPlanSpacing(id, minSpacing: number | null): Promise<FloorPlan>`

- [ ] **Step 1: Add schema + migrate**

Add the model/fields above. Run `npx prisma migrate dev --name add_table_catalog` (stop `next dev` first if it locks the Prisma DLL; re-run `npx prisma generate` if needed; don't leave the migration half-applied).

- [ ] **Step 2: Write failing test**

Create `src/lib/db/tableTypes.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { createTableType, listTableTypes, updateTableType, deleteTableType } from "./tableTypes";
import { prisma } from "./client";

async function venue() {
  return prisma.venue.create({ data: { name: "V Cat" } });
}

it("CRUDs table types for a venue", async () => {
  const v = await venue();
  const t = await createTableType({
    venueId: v.id, name: "Redonda 8", shape: "round", minSeats: 6, maxSeats: 8, width: 1.5, depth: 1.5, quantity: 10,
  });
  expect(t.maxSeats).toBe(8);
  const updated = await updateTableType(t.id, { quantity: 12 });
  expect(updated.quantity).toBe(12);
  expect((await listTableTypes(v.id)).length).toBe(1);
  await deleteTableType(t.id);
  expect((await listTableTypes(v.id)).length).toBe(0);
});

afterAll(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 3: Run to fail → implement → pass**

Create `src/lib/db/tableTypes.ts`:

```ts
import type { TableType } from "@prisma/client";
import { prisma } from "./client";

export function createTableType(input: {
  venueId: string; name: string; shape: string; minSeats: number; maxSeats: number; width: number; depth: number; quantity?: number;
}): Promise<TableType> {
  return prisma.tableType.create({ data: { ...input, quantity: input.quantity ?? 1 } });
}
export function listTableTypes(venueId: string): Promise<TableType[]> {
  return prisma.tableType.findMany({ where: { venueId }, orderBy: { createdAt: "asc" } });
}
export function updateTableType(id: string, patch: Partial<Omit<TableType, "id" | "venueId" | "createdAt">>): Promise<TableType> {
  return prisma.tableType.update({ where: { id }, data: patch });
}
export async function deleteTableType(id: string): Promise<void> {
  await prisma.tableType.delete({ where: { id } });
}
```

Add to `src/lib/db/floorplans.ts`:

```ts
export function updateFloorPlanSpacing(id: string, minSpacing: number | null): Promise<FloorPlan> {
  return prisma.floorPlan.update({ where: { id }, data: { minSpacing } });
}
```

Run: `npm run test -- tableTypes` then `npm run test` then `npx tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/db/tableTypes.ts src/lib/db/floorplans.ts src/lib/db/tableTypes.test.ts
git commit -m "feat(venue): TableType catalog + table dimensions/min-capacity + floorplan minSpacing"
```

---

### Task 2: API — table-type CRUD + floorplan spacing + table dimensions on create

**Files:**
- Create: `src/app/api/venues/[id]/table-types/route.ts` (GET list, POST create)
- Create: `src/app/api/table-types/[id]/route.ts` (PATCH, DELETE)
- Modify: `src/app/api/floorplans/[id]/route.ts` (PATCH accepts optional `minSpacing`)
- Modify: `src/app/api/floorplans/[id]/tables/route.ts` (PUT saveTables carries optional width/depth/minCapacity)
- Modify: `src/lib/db/tables.ts` (`TableInput` gains optional `width/depth/minCapacity`)
- Test: `src/app/api/venues/[id]/table-types/route.test.ts`

**Interfaces:**
- `GET /api/venues/[id]/table-types` → list; `POST` body `{name,shape,minSeats,maxSeats,width,depth,quantity?}` → 201 (400 on missing name/seats).
- `PATCH /api/table-types/[id]` → partial update; `DELETE` → remove.
- `PATCH /api/floorplans/[id]` also accepts `{ minSpacing: number | null }` (in addition to the existing `scale`).
- `TableInput` (`src/lib/db/tables.ts`) gains optional `width?: number; depth?: number; minCapacity?: number`, threaded through `saveTables` so the editor can persist per-table dimensions and min.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/venues/[id]/table-types/route.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { GET, POST } from "./route";
import { prisma } from "@/lib/db/client";

it("POST creates a table type; GET lists it", async () => {
  const v = await prisma.venue.create({ data: { name: "V API" } });
  const res = await POST(
    new Request("http://x/tt", { method: "POST", body: JSON.stringify({ name: "R8", shape: "round", minSeats: 6, maxSeats: 8, width: 1.5, depth: 1.5, quantity: 5 }) }),
    { params: Promise.resolve({ id: v.id }) }
  );
  expect(res.status).toBe(201);
  const list = await (await GET(new Request("http://x/tt"), { params: Promise.resolve({ id: v.id }) })).json();
  expect(list.some((t: { name: string }) => t.name === "R8")).toBe(true);
});

it("POST rejects missing name", async () => {
  const v = await prisma.venue.create({ data: { name: "V API2" } });
  const res = await POST(new Request("http://x/tt", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: v.id }) });
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 2: Implement (TDD) + thread TableInput**

- Routes as specified (await `params`, `.catch(()=>({}))` on json, validate). POST requires `name` + numeric `minSeats`/`maxSeats` → else 400.
- `TableInput` gains the three optional numeric fields; `saveTables` maps them into `createMany` (Prisma ignores undefined → stored null).
- `floorplans/[id]` PATCH: if `typeof b.minSpacing === "number" || b.minSpacing === null`, call `updateFloorPlanSpacing`; keep the existing scale branch.

Run: `npm run test -- "table-types"` then `npm run test` then `npx tsc --noEmit` then `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/venues/[id]/table-types" "src/app/api/table-types" "src/app/api/floorplans/[id]" src/lib/db/tables.ts "src/app/api/venues/[id]/table-types/route.test.ts"
git commit -m "feat(api): table-type CRUD + floorplan minSpacing + per-table dimensions"
```

---

### Task 3: Pure geometry — spacing + under-min checks

**Files:**
- Create: `src/lib/floorplan/spacing.ts`
- Test: `src/lib/floorplan/spacing.test.ts`

**Interfaces:**
- `SpacingTable = { id: string; x: number; y: number; width?: number | null; depth?: number | null; shape: string; capacity: number }` (x/y natural pixels).
- `spacingViolations(tables: SpacingTable[], minSpacingMetres: number, scale: number): { a: string; b: string; gapMetres: number }[]` — for each pair, edge gap (metres) = pixelDistance(centers)/scale − halfExtentA − halfExtentB, where halfExtent = (max(width,depth) or a default from capacity)/2 in metres; return pairs with gap < minSpacingMetres.
- `underMinTables(occupancyByTableId: Record<string, number>, tables: { id: string; minCapacity?: number | null }[]): string[]` — table ids that are USED (occupancy ≥ 1) but occupancy < minCapacity.

- [ ] **Step 1: Write the failing test**

Create `src/lib/floorplan/spacing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { spacingViolations, underMinTables } from "./spacing";

it("flags tables closer than the minimum spacing", () => {
  // two 1m-wide tables (halfExtent .5m each), centers 200px apart at 100px/m = 2m; gap = 2 - .5 - .5 = 1m
  const tables = [
    { id: "t1", x: 0, y: 0, width: 1, depth: 1, shape: "round", capacity: 8 },
    { id: "t2", x: 200, y: 0, width: 1, depth: 1, shape: "round", capacity: 8 },
  ];
  expect(spacingViolations(tables, 1.5, 100).length).toBe(1); // gap 1m < 1.5m
  expect(spacingViolations(tables, 0.5, 100).length).toBe(0); // gap 1m ≥ .5m
});

it("flags used tables below their min capacity", () => {
  const under = underMinTables({ t1: 3, t2: 8 }, [{ id: "t1", minCapacity: 6 }, { id: "t2", minCapacity: 6 }]);
  expect(under).toEqual(["t1"]);
});
```

- [ ] **Step 2: Run to fail → implement → pass**

Create `src/lib/floorplan/spacing.ts` using `pixelDistance` from `./geometry`. Compute `halfExtent(table)` in metres = `((table.width ?? table.depth ?? DEFAULT_TABLE_METRES) )/2` using the larger of width/depth when both present (fallback `DEFAULT_TABLE_METRES = 1.5`). Return pairs (a<b by id) with gap `< minSpacingMetres`. `underMinTables` filters used tables (occ ≥ 1) with `minCapacity != null && occ < minCapacity`.

Run: `npm run test -- spacing` then `npm run test` then `npx tsc --noEmit`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/floorplan/spacing.ts src/lib/floorplan/spacing.test.ts
git commit -m "feat(floorplan): pure spacing + under-min occupancy checks"
```

---

### Task 4: Editor UI — catalog management + add-from-catalog + spacing/min warnings

**Files:**
- Create: `src/components/venue/TableTypeCatalog.tsx` (manage a venue's table types)
- Modify: the floor-plan editor page/components (`src/app/admin/floorplan/[id]/page.tsx`, `src/components/editor/*`) — add a table by picking a type (prefills capacity=maxSeats, width/depth, minCapacity=minSeats), a min-spacing input, and a warnings panel (spacing + under-min)
- Modify: `src/app/admin/page.tsx` or a venue page — link to the catalog for each venue

**Interfaces:**
- Consumes: `/api/venues/[id]/table-types` (GET/POST), `/api/table-types/[id]` (PATCH/DELETE), `/api/floorplans/[id]` (PATCH minSpacing), the tables PUT (now carrying width/depth/minCapacity), and the pure `spacingViolations`/`underMinTables`.
- Produces: (1) a catalog manager where the venue owner defines table types (name/shape/min/max/dimensions/quantity); (2) in the floor-plan editor, an "adicionar do catálogo" control that inserts a table prefilled from a chosen type; (3) a min-spacing field on the floor plan; (4) a live warnings panel listing tables too close together and used tables below their min.

- [ ] **Step 1: TableTypeCatalog** — `"use client"`: list a venue's table types with add (name, shape, minSeats, maxSeats, width, depth, quantity), inline edit, delete; wired to the table-type endpoints with res.ok error handling. Reachable from the venue/floor-plan admin.

- [ ] **Step 2: Add-from-catalog in the editor** — in the floor-plan editor, next to the existing "add table", add a "adicionar do catálogo" select of the venue's table types; choosing one inserts a new table prefilled: `capacity = maxSeats`, `minCapacity = minSeats`, `width/depth` from the type, `shape` from the type. Persist via the existing tables PUT (now carrying the extra fields).

- [ ] **Step 3: Min-spacing + warnings** — add a "espaçamento mínimo (m)" input on the floor plan (PATCH minSpacing). Compute `spacingViolations(tables, minSpacing, scale)` and `underMinTables(occupancy, tables)` (occupancy from the current plan/assignment if available, else skip under-min) and render a warnings panel: "Mesa X e Mesa Y demasiado próximas (0.8m < 1.5m)" and "Mesa X abaixo do mínimo (3/6)". Highlight the involved tables if practical.

- [ ] **Step 4: Verify by driving the app (webapp-testing skill)** (dev server on :3000; start if down)
   1. Create a couple of table types for a venue (e.g. Redonda 8 min6/max8, Rect 10 min8/max10).
   2. In the floor-plan editor, add a table from the catalog → confirm it's prefilled (capacity/dimensions), placeable, and persists.
   3. Set a min spacing; place two tables close together → confirm the "demasiado próximas" warning appears with the gap; move them apart → warning clears.
   Screenshot. Report what was verified vs not.

- [ ] **Step 5: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test`.

```bash
git add src/components "src/app/admin"
git commit -m "feat(venue): table-type catalog UI + add-from-catalog + spacing/min warnings"
```

---

## Definition of Done

- `npm run test` green; `npx tsc --noEmit` + `npm run build` clean.
- In the running app: a venue owner defines a catalog of table types (name, shape, min/max seats, dimensions, quantity); the floor-plan editor adds tables prefilled from the catalog; a floor plan has a minimum spacing; and the editor warns about tables too close together and used tables below their minimum occupancy.

## What comes next

- **Deferred (Plan 8b or later):** saved positioned **layout templates** by guest-count range (apply a named table arrangement to a floor plan).
- **Plan 9:** floor-plan walls/boundaries (visual guide + out-of-bounds warning) + per-table chair rendering (colored by attribute).
- **Plan 10:** PDF export with color coding + legend + per-table list.
