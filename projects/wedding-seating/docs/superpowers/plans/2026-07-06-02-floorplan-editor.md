# Floor-Plan Editor (Admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin-facing floor-plan editor: create a venue, upload a real photo/scan of the room, calibrate its scale (pixels ↔ metres), place/resize/label tables on a react-konva canvas over the image, and persist everything to SQLite via Prisma.

**Architecture:** Pure geometry/calibration helpers and a Prisma data-access layer are built and tested first (they are deterministic and DB-integration testable). Next.js route handlers expose CRUD + local image upload. The react-konva canvas UI sits on top, consuming those APIs. Testable logic is TDD'd; the canvas UI is built to a clear component contract and verified by driving the real app (webapp-testing), since a Konva canvas does not unit-test cleanly.

**Tech Stack:** Next.js (App Router, route handlers), Prisma/SQLite, react-konva + konva, Vitest for logic/data/API tests, local filesystem for image storage.

## Global Constraints

- **Local-first only.** No Vercel/Supabase/network. Images are written to the local filesystem under `projects/wedding-seating/data/uploads/` (git-ignored). DB is the local SQLite file from Plan 1.
- **Builds on Plan 1.** The Prisma schema (`Venue`, `FloorPlan`, `Table`, …) and the seating engine already exist. Do NOT modify the schema in this plan except the additive migration in Task 1 if a field is missing; if a needed field exists, skip it.
- **Stored coordinates are image-natural pixels.** Table `x`/`y` and calibration are expressed in the image's natural pixel space, independent of on-screen zoom, so a saved layout renders identically at any viewport size.
- **Scale is pixels-per-metre**, stored on `FloorPlan.scale`, derived from a user-drawn reference line of known real length.
- **Table shapes:** `"round"` or `"rect"` (matches the Plan 1 schema `shape` field).
- **Pure helpers stay pure:** files under `src/lib/floorplan/` must not import Prisma/Next/React/fs.
- **DB tests use a throwaway SQLite file**, reset per run — never the dev DB.
- **TDD** for every logic/data/API task: failing test first, watch it fail, minimal implementation, watch it pass, commit.

---

### Task 1: Test DB harness + Prisma client singleton

**Files:**
- Create: `src/lib/db/client.ts`
- Create: `vitest.setup.ts`
- Modify: `vitest.config.ts` (add `setupFiles` + `env`)
- Create: `src/lib/db/client.test.ts`

**Interfaces:**
- Consumes: the Prisma client generated in Plan 1.
- Produces: `prisma` (a singleton `PrismaClient`) exported from `src/lib/db/client.ts`; a Vitest setup that points `DATABASE_URL` at a throwaway SQLite file and applies the schema before tests run, so data-layer tests (Tasks 3-4) run against a real, empty DB.

- [ ] **Step 1: Write the Prisma singleton**

Create `src/lib/db/client.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 2: Write the Vitest setup that provisions a test DB**

Create `vitest.setup.ts`:

```ts
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

// Use a dedicated throwaway SQLite file for tests.
const TEST_DB = resolve(process.cwd(), "prisma/test.db");
process.env.DATABASE_URL = `file:./test.db`;

if (existsSync(TEST_DB)) rmSync(TEST_DB);

// Apply the current schema to the empty test DB (no migration history needed).
execSync("npx prisma db push --skip-generate --accept-data-loss", {
  stdio: "ignore",
  env: { ...process.env, DATABASE_URL: "file:./test.db" },
});
```

- [ ] **Step 3: Wire the setup into Vitest**

Edit `vitest.config.ts` so the `test` block reads:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    fileParallelism: false,
  },
});
```

(`fileParallelism: false` keeps the shared test DB from being written by parallel workers.)

- [ ] **Step 4: Add test.db to .gitignore**

Append to `.gitignore`:

```
prisma/test.db
prisma/test.db-journal
data/uploads/
```

- [ ] **Step 5: Write the failing test**

Create `src/lib/db/client.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "./client";

describe("prisma client + test db", () => {
  it("connects and can round-trip a Venue", async () => {
    const v = await prisma.venue.create({ data: { name: "Quinta Teste" } });
    const found = await prisma.venue.findUnique({ where: { id: v.id } });
    expect(found?.name).toBe("Quinta Teste");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- client`
Expected: PASS. (First run also triggers `prisma db push` via the setup.)
If it fails with "table does not exist", the setup's `db push` did not run — verify `setupFiles` path and that `@prisma/client` is generated (`npx prisma generate`).

- [ ] **Step 7: Confirm the engine suite still passes**

Run: `npm run test`
Expected: all Plan 1 engine tests still PASS alongside the new DB test.

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/client.ts vitest.setup.ts vitest.config.ts .gitignore src/lib/db/client.test.ts
git commit -m "feat(db): prisma singleton + throwaway test-db harness"
```

---

### Task 2: Calibration & geometry helpers (pure)

**Files:**
- Create: `src/lib/floorplan/geometry.ts`
- Test: `src/lib/floorplan/geometry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by the UI and later validation):
  - `Point = { x: number; y: number }`
  - `pixelDistance(a: Point, b: Point): number` — Euclidean distance in pixels.
  - `scaleFromReference(a: Point, b: Point, realMetres: number): number` — pixels-per-metre; throws if `realMetres <= 0` or the two points coincide.
  - `metresToPixels(m: number, scale: number): number` and `pixelsToMetres(px: number, scale: number): number`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/floorplan/geometry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pixelDistance, scaleFromReference, metresToPixels, pixelsToMetres } from "./geometry";

it("pixelDistance is Euclidean", () => {
  expect(pixelDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
});

it("scaleFromReference returns pixels per metre", () => {
  // 100px line == 2 metres => 50 px/m
  expect(scaleFromReference({ x: 0, y: 0 }, { x: 100, y: 0 }, 2)).toBe(50);
});

it("scaleFromReference rejects non-positive length and coincident points", () => {
  expect(() => scaleFromReference({ x: 0, y: 0 }, { x: 100, y: 0 }, 0)).toThrow();
  expect(() => scaleFromReference({ x: 5, y: 5 }, { x: 5, y: 5 }, 2)).toThrow();
});

it("metre/pixel conversions round-trip", () => {
  expect(metresToPixels(3, 50)).toBe(150);
  expect(pixelsToMetres(150, 50)).toBe(3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- geometry`
Expected: FAIL — cannot find module `./geometry`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/floorplan/geometry.ts`:

```ts
export interface Point {
  x: number;
  y: number;
}

export function pixelDistance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function scaleFromReference(a: Point, b: Point, realMetres: number): number {
  if (realMetres <= 0) throw new Error("realMetres must be > 0");
  const px = pixelDistance(a, b);
  if (px === 0) throw new Error("reference points must not coincide");
  return px / realMetres;
}

export function metresToPixels(m: number, scale: number): number {
  return m * scale;
}

export function pixelsToMetres(px: number, scale: number): number {
  return px / scale;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- geometry`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/floorplan/geometry.ts src/lib/floorplan/geometry.test.ts
git commit -m "feat(floorplan): calibration + geometry helpers"
```

---

### Task 3: Venue & FloorPlan data-access

**Files:**
- Create: `src/lib/db/venues.ts`
- Create: `src/lib/db/floorplans.ts`
- Test: `src/lib/db/venues.test.ts`
- Test: `src/lib/db/floorplans.test.ts`

**Interfaces:**
- Consumes: `prisma` from `./client`.
- Produces:
  - `createVenue(input: { name: string; location?: string }): Promise<Venue>`
  - `listVenues(): Promise<Venue[]>` (newest first)
  - `getVenue(id: string): Promise<Venue | null>`
  - `createFloorPlan(input: { venueId: string; image: string; scale: number; width: number; depth: number }): Promise<FloorPlan>`
  - `getFloorPlan(id: string): Promise<FloorPlan | null>`
  - `updateFloorPlanScale(id: string, scale: number): Promise<FloorPlan>`
  - (`Venue`/`FloorPlan` are the Prisma-generated types.)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/db/venues.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { createVenue, listVenues, getVenue } from "./venues";
import { prisma } from "./client";

it("creates and fetches a venue", async () => {
  const v = await createVenue({ name: "Quinta A", location: "Sintra" });
  expect(v.id).toBeTruthy();
  const got = await getVenue(v.id);
  expect(got?.location).toBe("Sintra");
});

it("lists venues newest first", async () => {
  const a = await createVenue({ name: "First" });
  const b = await createVenue({ name: "Second" });
  const all = await listVenues();
  const idxA = all.findIndex((v) => v.id === a.id);
  const idxB = all.findIndex((v) => v.id === b.id);
  expect(idxB).toBeLessThan(idxA);
});

afterAll(async () => { await prisma.$disconnect(); });
```

Create `src/lib/db/floorplans.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { createFloorPlan, getFloorPlan, updateFloorPlanScale } from "./floorplans";
import { createVenue } from "./venues";
import { prisma } from "./client";

it("creates a floor plan under a venue and updates scale", async () => {
  const v = await createVenue({ name: "Quinta FP" });
  const fp = await createFloorPlan({
    venueId: v.id,
    image: "data/uploads/x.jpg",
    scale: 50,
    width: 20,
    depth: 15,
  });
  expect(fp.venueId).toBe(v.id);
  const updated = await updateFloorPlanScale(fp.id, 75);
  expect(updated.scale).toBe(75);
  const got = await getFloorPlan(fp.id);
  expect(got?.scale).toBe(75);
});

afterAll(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- venues floorplans`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Write the implementations**

Create `src/lib/db/venues.ts`:

```ts
import type { Venue } from "@prisma/client";
import { prisma } from "./client";

export function createVenue(input: { name: string; location?: string }): Promise<Venue> {
  return prisma.venue.create({ data: { name: input.name, location: input.location } });
}

export function listVenues(): Promise<Venue[]> {
  return prisma.venue.findMany({ orderBy: { createdAt: "desc" } });
}

export function getVenue(id: string): Promise<Venue | null> {
  return prisma.venue.findUnique({ where: { id } });
}
```

Create `src/lib/db/floorplans.ts`:

```ts
import type { FloorPlan } from "@prisma/client";
import { prisma } from "./client";

export function createFloorPlan(input: {
  venueId: string;
  image: string;
  scale: number;
  width: number;
  depth: number;
}): Promise<FloorPlan> {
  return prisma.floorPlan.create({ data: input });
}

export function getFloorPlan(id: string): Promise<FloorPlan | null> {
  return prisma.floorPlan.findUnique({ where: { id } });
}

export function updateFloorPlanScale(id: string, scale: number): Promise<FloorPlan> {
  return prisma.floorPlan.update({ where: { id }, data: { scale } });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- venues floorplans`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/venues.ts src/lib/db/floorplans.ts src/lib/db/venues.test.ts src/lib/db/floorplans.test.ts
git commit -m "feat(db): venue + floorplan data-access"
```

---

### Task 4: Table data-access (save/list layout)

**Files:**
- Create: `src/lib/db/tables.ts`
- Test: `src/lib/db/tables.test.ts`

**Interfaces:**
- Consumes: `prisma` from `./client`.
- Produces:
  - `TableInput = { shape: "round" | "rect"; capacity: number; x: number; y: number; fixed: boolean }`
  - `saveTables(floorPlanId: string, tables: TableInput[]): Promise<void>` — replaces the floor plan's tables atomically (delete-all then insert) so the editor can "Save layout" idempotently.
  - `listTables(floorPlanId: string): Promise<Table[]>` (`Table` is the Prisma type).

- [ ] **Step 1: Write the failing test**

Create `src/lib/db/tables.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { saveTables, listTables } from "./tables";
import { createFloorPlan } from "./floorplans";
import { createVenue } from "./venues";
import { prisma } from "./client";

it("saveTables replaces the whole layout idempotently", async () => {
  const v = await createVenue({ name: "Quinta T" });
  const fp = await createFloorPlan({ venueId: v.id, image: "x.jpg", scale: 50, width: 10, depth: 10 });

  await saveTables(fp.id, [
    { shape: "round", capacity: 8, x: 100, y: 100, fixed: false },
    { shape: "rect", capacity: 10, x: 200, y: 150, fixed: true },
  ]);
  expect((await listTables(fp.id)).length).toBe(2);

  // Saving again with one table must REPLACE, not append.
  await saveTables(fp.id, [{ shape: "round", capacity: 6, x: 50, y: 50, fixed: false }]);
  const after = await listTables(fp.id);
  expect(after.length).toBe(1);
  expect(after[0].capacity).toBe(6);
});

afterAll(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tables`
Expected: FAIL — cannot find module `./tables`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/db/tables.ts`:

```ts
import type { Table } from "@prisma/client";
import { prisma } from "./client";

export interface TableInput {
  shape: "round" | "rect";
  capacity: number;
  x: number;
  y: number;
  fixed: boolean;
}

export async function saveTables(floorPlanId: string, tables: TableInput[]): Promise<void> {
  await prisma.$transaction([
    prisma.table.deleteMany({ where: { floorPlanId } }),
    prisma.table.createMany({
      data: tables.map((t) => ({ ...t, floorPlanId })),
    }),
  ]);
}

export function listTables(floorPlanId: string): Promise<Table[]> {
  return prisma.table.findMany({ where: { floorPlanId } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tables`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/tables.ts src/lib/db/tables.test.ts
git commit -m "feat(db): table layout save/list (atomic replace)"
```

---

### Task 5: API route handlers (venues, floor plans, image upload, tables)

**Files:**
- Create: `src/app/api/venues/route.ts` (GET list, POST create)
- Create: `src/app/api/floorplans/route.ts` (POST create)
- Create: `src/app/api/floorplans/[id]/route.ts` (GET one, PATCH scale)
- Create: `src/app/api/floorplans/[id]/image/route.ts` (POST upload → saves file, returns path)
- Create: `src/app/api/floorplans/[id]/tables/route.ts` (GET list, PUT save layout)
- Create: `src/lib/upload.ts` (filesystem write helper)
- Test: `src/lib/upload.test.ts`
- Test: `src/app/api/venues/route.test.ts`

**Interfaces:**
- Consumes: the data-access layer (Tasks 3-4) and geometry (Task 2).
- Produces: JSON HTTP endpoints the canvas UI (Task 6) calls. `saveUploadedImage(floorPlanId, file)` writes to `data/uploads/<floorPlanId>/<filename>` and returns the repo-relative path stored on the floor plan.

- [ ] **Step 1: Write the failing test for the upload helper**

Create `src/lib/upload.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { saveUploadedImage } from "./upload";

it("writes an uploaded file under data/uploads/<id> and returns its relative path", async () => {
  const bytes = new Uint8Array([137, 80, 78, 71]); // PNG magic
  const rel = await saveUploadedImage("fp123", "room.png", bytes);
  expect(rel).toBe("data/uploads/fp123/room.png");
  expect(existsSync(resolve(process.cwd(), rel))).toBe(true);
});

afterAll(() => {
  rmSync(resolve(process.cwd(), "data/uploads/fp123"), { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- upload`
Expected: FAIL — cannot find module `./upload`.

- [ ] **Step 3: Write the upload helper**

Create `src/lib/upload.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const UPLOAD_ROOT = "data/uploads";

export async function saveUploadedImage(
  floorPlanId: string,
  filename: string,
  bytes: Uint8Array
): Promise<string> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const relDir = join(UPLOAD_ROOT, floorPlanId);
  const absDir = resolve(process.cwd(), relDir);
  await mkdir(absDir, { recursive: true });
  await writeFile(resolve(absDir, safeName), bytes);
  return join(relDir, safeName).split("\\").join("/");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- upload`
Expected: PASS.

- [ ] **Step 5: Write the venues route + its test**

Create `src/app/api/venues/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createVenue, listVenues } from "@/lib/db/venues";

export async function GET() {
  return NextResponse.json(await listVenues());
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const venue = await createVenue({ name: body.name, location: body.location });
  return NextResponse.json(venue, { status: 201 });
}
```

Create `src/app/api/venues/route.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { GET, POST } from "./route";
import { prisma } from "@/lib/db/client";

it("POST creates a venue and GET lists it", async () => {
  const res = await POST(new Request("http://x/api/venues", {
    method: "POST",
    body: JSON.stringify({ name: "API Quinta", location: "Cascais" }),
  }));
  expect(res.status).toBe(201);
  const created = await res.json();
  expect(created.name).toBe("API Quinta");

  const list = await (await GET()).json();
  expect(list.some((v: { id: string }) => v.id === created.id)).toBe(true);
});

it("POST rejects a missing name", async () => {
  const res = await POST(new Request("http://x/api/venues", { method: "POST", body: "{}" }));
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 6: Write the remaining routes (no new test logic — same patterns)**

Create `src/app/api/floorplans/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createFloorPlan } from "@/lib/db/floorplans";

export async function POST(req: Request) {
  const b = await req.json();
  if (!b?.venueId) return NextResponse.json({ error: "venueId required" }, { status: 400 });
  const fp = await createFloorPlan({
    venueId: b.venueId,
    image: b.image ?? "",
    scale: b.scale ?? 0,
    width: b.width ?? 0,
    depth: b.depth ?? 0,
  });
  return NextResponse.json(fp, { status: 201 });
}
```

Create `src/app/api/floorplans/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getFloorPlan, updateFloorPlanScale } from "@/lib/db/floorplans";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fp = await getFloorPlan(id);
  return fp ? NextResponse.json(fp) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  if (typeof b?.scale !== "number") return NextResponse.json({ error: "scale required" }, { status: 400 });
  return NextResponse.json(await updateFloorPlanScale(id, b.scale));
}
```

Create `src/app/api/floorplans/[id]/image/route.ts`:

```ts
import { NextResponse } from "next/server";
import { saveUploadedImage } from "@/lib/upload";
import { prisma } from "@/lib/db/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const rel = await saveUploadedImage(id, file.name, bytes);
  await prisma.floorPlan.update({ where: { id }, data: { image: rel } });
  return NextResponse.json({ image: rel });
}
```

Create `src/app/api/floorplans/[id]/tables/route.ts`:

```ts
import { NextResponse } from "next/server";
import { saveTables, listTables, type TableInput } from "@/lib/db/tables";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await listTables(id));
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as { tables: TableInput[] };
  if (!Array.isArray(body?.tables)) return NextResponse.json({ error: "tables[] required" }, { status: 400 });
  await saveTables(id, body.tables);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Run the API/upload tests**

Run: `npm run test -- upload venues`
Expected: PASS. Then `npm run test` — full suite green.

- [ ] **Step 8: Commit**

```bash
git add src/lib/upload.ts src/lib/upload.test.ts src/app/api
git commit -m "feat(api): venues, floorplans, image upload, table layout endpoints"
```

---

### Task 6: React-konva floor-plan editor UI

**Files:**
- Create: `src/app/admin/page.tsx` (venue list + create, links into editor)
- Create: `src/app/admin/floorplan/[id]/page.tsx` (editor route, loads floor plan + tables)
- Create: `src/components/editor/FloorPlanCanvas.tsx` (react-konva Stage: background image + table shapes)
- Create: `src/components/editor/CalibrationTool.tsx` (draw reference line, enter metres → sets scale)
- Create: `src/components/editor/TableInspector.tsx` (edit selected table: shape, capacity, fixed, delete)
- Create: `src/components/editor/useEditorState.ts` (client state hook: tables, selection, dirty flag)
- Create: `src/lib/floorplan/editorState.ts` (PURE reducer logic for the hook — this part IS unit-tested)
- Test: `src/lib/floorplan/editorState.test.ts`

**Interfaces:**
- Consumes: geometry (Task 2), the API routes (Task 5).
- Produces: a working admin editor. The pure reducer in `editorState.ts` owns all table mutations so they can be tested without React/Konva.

**Note on testing:** Konva renders to a canvas and does not unit-test meaningfully. Therefore: the **pure reducer** (`editorState.ts`) is TDD'd (Steps 1-3); the **canvas/React UI** is built to the component contract (Steps 4-6) and verified by driving the real app with the webapp-testing skill (Step 7). Do not fabricate Konva unit tests.

- [ ] **Step 1: Write the failing reducer test**

Create `src/lib/floorplan/editorState.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { editorReducer, initialEditorState, type EditorState } from "./editorState";

const base: EditorState = initialEditorState();

it("adds a table with defaults and marks state dirty", () => {
  const s = editorReducer(base, { type: "add-table", at: { x: 10, y: 20 } });
  expect(s.tables.length).toBe(1);
  expect(s.tables[0]).toMatchObject({ shape: "round", capacity: 8, x: 10, y: 20, fixed: false });
  expect(s.dirty).toBe(true);
});

it("moves a table by id", () => {
  const added = editorReducer(base, { type: "add-table", at: { x: 0, y: 0 } });
  const id = added.tables[0].id;
  const moved = editorReducer(added, { type: "move-table", id, to: { x: 99, y: 88 } });
  expect(moved.tables[0]).toMatchObject({ x: 99, y: 88 });
});

it("updates and deletes a table", () => {
  const added = editorReducer(base, { type: "add-table", at: { x: 0, y: 0 } });
  const id = added.tables[0].id;
  const upd = editorReducer(added, { type: "update-table", id, patch: { capacity: 10, fixed: true } });
  expect(upd.tables[0]).toMatchObject({ capacity: 10, fixed: true });
  const del = editorReducer(upd, { type: "delete-table", id });
  expect(del.tables.length).toBe(0);
});

it("loads a layout and clears dirty", () => {
  const dirty = editorReducer(base, { type: "add-table", at: { x: 1, y: 1 } });
  const loaded = editorReducer(dirty, {
    type: "load",
    tables: [{ id: "t1", shape: "rect", capacity: 6, x: 5, y: 5, fixed: false }],
  });
  expect(loaded.tables.length).toBe(1);
  expect(loaded.dirty).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- editorState`
Expected: FAIL — cannot find module `./editorState`.

- [ ] **Step 3: Write the pure reducer**

Create `src/lib/floorplan/editorState.ts`:

```ts
import type { Point } from "./geometry";

export interface EditorTable {
  id: string;
  shape: "round" | "rect";
  capacity: number;
  x: number;
  y: number;
  fixed: boolean;
}

export interface EditorState {
  tables: EditorTable[];
  selectedId: string | null;
  dirty: boolean;
}

export type EditorAction =
  | { type: "add-table"; at: Point }
  | { type: "move-table"; id: string; to: Point }
  | { type: "update-table"; id: string; patch: Partial<Omit<EditorTable, "id">> }
  | { type: "delete-table"; id: string }
  | { type: "select"; id: string | null }
  | { type: "load"; tables: EditorTable[] };

export function initialEditorState(): EditorState {
  return { tables: [], selectedId: null, dirty: false };
}

let counter = 0;
function newId(): string {
  counter += 1;
  return `tmp-${Date.now()}-${counter}`;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "add-table":
      return {
        ...state,
        dirty: true,
        tables: [
          ...state.tables,
          { id: newId(), shape: "round", capacity: 8, x: action.at.x, y: action.at.y, fixed: false },
        ],
      };
    case "move-table":
      return {
        ...state,
        dirty: true,
        tables: state.tables.map((t) => (t.id === action.id ? { ...t, x: action.to.x, y: action.to.y } : t)),
      };
    case "update-table":
      return {
        ...state,
        dirty: true,
        tables: state.tables.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
      };
    case "delete-table":
      return {
        ...state,
        dirty: true,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        tables: state.tables.filter((t) => t.id !== action.id),
      };
    case "select":
      return { ...state, selectedId: action.id };
    case "load":
      return { tables: action.tables, selectedId: null, dirty: false };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- editorState`
Expected: PASS — 4 tests.

- [ ] **Step 5: Install canvas deps and build the components**

```bash
npm install konva react-konva
```

Build the components to this contract (client components — add `"use client"` at the top of each; keep each file focused):

- **`useEditorState.ts`** — thin React wrapper: `const [state, dispatch] = useReducer(editorReducer, undefined, initialEditorState)`; exposes helpers `addTable`, `moveTable`, `updateTable`, `deleteTable`, `select`, `load`, plus `save()` which `PUT`s `state.tables` (stripping `tmp-` ids) to `/api/floorplans/[id]/tables` and dispatches `load` with the server response.
- **`FloorPlanCanvas.tsx`** — a react-konva `<Stage>`/`<Layer>` that renders the background `<KonvaImage>` (from the floor plan's `image` path, served statically — see Step 6) and one shape per table (`<Circle>` for round, `<Rect>` for rect), each `draggable`, calling `moveTable(id, {x,y})` on `dragend` and `select(id)` on click. Table capacity is drawn as a `<Text>` label centred on the shape. Clicking empty stage with the "add table" tool active calls `addTable(pointerPosition)`.
- **`CalibrationTool.tsx`** — lets the user click two points on the image and enter the real length in metres; calls `scaleFromReference` (Task 2) and `PATCH`es `/api/floorplans/[id]` with the resulting scale. Shows the current px/m.
- **`TableInspector.tsx`** — when a table is selected, shows controls to change `shape`, `capacity` (number input), toggle `fixed`, and a Delete button, wired to `updateTable`/`deleteTable`.
- **`admin/page.tsx`** — lists venues (`GET /api/venues`), a form to create one (`POST`), and for each venue a link to create/open a floor plan.
- **`admin/floorplan/[id]/page.tsx`** — loads the floor plan (`GET /api/floorplans/[id]`) and its tables (`GET /api/floorplans/[id]/tables`), calls `load(tables)`, and lays out the canvas + calibration + inspector + a "Save layout" button (enabled when `state.dirty`).

- [ ] **Step 6: Serve uploaded images**

Uploaded images live under `data/uploads/` (outside `public/`). Add a static file route so the canvas can load them:

Create `src/app/api/uploads/[...path]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolve, normalize } from "node:path";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const rel = normalize(path.join("/")).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = resolve(process.cwd(), "data/uploads", rel);
  try {
    const buf = await readFile(abs);
    const ext = abs.split(".").pop()?.toLowerCase();
    const type = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": type } });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
```

The canvas loads a floor plan image from `/api/uploads/<floorPlanId>/<filename>` (derived from the stored `image` path by stripping the `data/uploads/` prefix).

- [ ] **Step 7: Verify by driving the real app (webapp-testing skill)**

Run the dev server and exercise the full flow. Use the webapp-testing skill (Playwright) to:
1. `npm run dev`, open `/admin`.
2. Create a venue; open/create a floor plan for it.
3. Upload a sample room image (use any local PNG/JPG); confirm it renders on the canvas.
4. Calibrate: draw a reference line, enter a known length, confirm px/m updates and persists (reload → scale retained).
5. Add 3 tables, drag them, set one to `rect`, set one `fixed`, set capacities; click "Save layout".
6. Reload the page; confirm the tables reload in the same positions with the same properties (proves `load` + persistence round-trip).

Capture a screenshot of the populated canvas as evidence. Record any defects and fix before completing.

- [ ] **Step 8: Commit**

```bash
git add src/lib/floorplan/editorState.ts src/lib/floorplan/editorState.test.ts src/components/editor src/app/admin src/app/api/uploads package.json package-lock.json
git commit -m "feat(editor): react-konva floor-plan editor (calibration, table placement, persistence)"
```

---

## Definition of Done

- `npm run test` passes: geometry, editor reducer, DB layer (venues/floorplans/tables), upload, and API tests, alongside all Plan 1 engine tests.
- An admin can, in the running local app: create a venue → upload a real room image → calibrate scale → place/move/edit/delete tables → save → reload and see the exact layout restored.
- Uploaded images are stored locally and served back to the canvas; nothing leaves the machine.

## What comes next (future plans)

- **Plan 3:** Guest import (Excel) + grouping UI (drag-to-group / pre-filled column).
- **Plan 4:** Plan view + manual editing — render the seating result on this floor plan, drag guests between tables, live re-validation via the Plan 1 engine.
- **Plan 5:** PDF export (html2canvas + jsPDF) of the floor-plan view + per-table guest list.
- **Carried follow-up from Plan 1:** make the engine's `separate` checks fixed-occupant-aware once guest/seat data flows through this UI.
