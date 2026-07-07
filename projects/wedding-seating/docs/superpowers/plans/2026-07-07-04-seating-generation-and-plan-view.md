# Seating Generation & Plan View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect everything built so far — map a wedding's guests/groups/constraints plus a floor plan's tables into the Plan 1 engine, generate the seating automatically, render it on the floor plan, and let the couple drag guests between tables with live constraint re-validation. This is the product's core "magic".

**Architecture:** A pure mapping function turns DB rows (guests, tables, constraints) into the engine's `SeatingInput`; the engine's hard-constraint check is upgraded to be fixed-occupant-aware (the carried Plan 1 follow-up, now exercised for real). A generate API runs the solver and persists each guest's `assignedTableId`; the plan-view UI renders tables + their guests on the floor plan, offers a Generate button and an unassigned tray, and computes live violation highlights by importing the engine's pure validators client-side. Testable logic (engine fix, mapping, persistence, API) is TDD'd; the drag UI is verified by driving the app.

**Tech Stack:** Next.js (App Router, route handlers), Prisma/SQLite, the existing pure seating engine (`src/lib/seating/*`), react-konva (reused floor-plan rendering), native HTML5 DnD, Vitest.

## Global Constraints

- **Local-first only.** No cloud/network. Uses the local SQLite DB and the throwaway test DB harness from Plan 2.
- **Builds on Plans 1-3.** The engine (`src/lib/seating/`), the floor-plan editor/tables (Plan 2), and guests/groups/constraints (Plan 3) already exist. Do NOT modify the Prisma schema — assignment is stored in the existing `Guest.assignedTableId` field.
- **Assignment is persisted in `Guest.assignedTableId`** (tableId string, or null = unseated).
- **Fixed tables:** a table with `fixed = true` that currently has guests assigned to it (via `assignedTableId`) treats those guests as **pre-seated (`fixedGuestIds`)** — the engine never moves them and never re-seats them; all other guests are the movable pool. A fixed table with no current occupants behaves like a normal available table.
- **Engine stays pure** (`src/lib/seating/*`: no Prisma/Next/React/fs). The mapping layer (`src/lib/plan/*`) is also pure (takes plain rows in, returns `SeatingInput`).
- **`separate` is HARD and must be fixed-occupant-aware:** a movable guest required apart from a fixed occupant of a table must not be seated at that table, and a violation must be reported if it occurs.
- **Live re-validation reuses the engine's pure validators client-side** (`separationViolations`, `tablesOverCapacity`, `occupantsByTable`) — no duplicated validation logic.
- **DB tests use the throwaway test DB; TDD for every logic/data/API task.** UI verified by driving the running app.

---

### Task 1: Make the engine's separation check fixed-occupant-aware

**Files:**
- Modify: `src/lib/seating/constraints.ts`
- Modify: `src/lib/seating/place.ts` (pass tables into the separation check)
- Modify: `src/lib/seating/solve.ts` (pass tables into the separation check)
- Modify/Add tests: `src/lib/seating/constraints.test.ts`, `src/lib/seating/solve.test.ts`

**Interfaces:**
- Changes `separationViolations` to accept an optional tables argument so fixed occupants are visible:
  - `tableOfGuest(guestId: string, assignment: Assignment, tables: SeatTable[]): string | undefined` — the tableId a guest sits at, from `assignment` first, else scanning `tables[].fixedGuestIds`.
  - `separationViolations(assignment: Assignment, constraints: SeatingConstraint[], tables?: SeatTable[]): SeatingConstraint[]` — a `separate` pair is violated when both guests resolve (via `tableOfGuest`) to the same table. With `tables` omitted (default `[]`), behaviour is identical to today (assignment-only), so existing callers/tests are unaffected.
  - `isHardValid` now calls `separationViolations(assignment, input.constraints, input.tables)`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/seating/constraints.test.ts`:

```ts
import { tableOfGuest } from "./constraints";
// ... existing imports (separationViolations, isHardValid, types) ...

it("resolves a guest's table from fixedGuestIds when not in the assignment", () => {
  const tables: SeatTable[] = [{ id: "head", capacity: 4, fixed: true, fixedGuestIds: ["bride"] }];
  expect(tableOfGuest("bride", {}, tables)).toBe("head");
  expect(tableOfGuest("x", { x: "head" }, tables)).toBe("head");
  expect(tableOfGuest("nobody", {}, tables)).toBeUndefined();
});

it("flags a separate pair between a movable guest and a fixed occupant of the same table", () => {
  const tables: SeatTable[] = [{ id: "head", capacity: 4, fixed: true, fixedGuestIds: ["bride"] }];
  const constraints: SeatingConstraint[] = [{ type: "separate", a: "g1", b: "bride" }];
  // g1 assigned to the head table where bride is a fixed occupant → violation
  expect(separationViolations({ g1: "head" }, constraints, tables).length).toBe(1);
  // g1 elsewhere → no violation
  expect(separationViolations({ g1: "t2" }, constraints, tables).length).toBe(0);
});

it("isHardValid sees fixed-occupant separation violations", () => {
  const input: SeatingInput = {
    guests: [{ id: "g1", name: "A", groupId: null }],
    tables: [{ id: "head", capacity: 4, fixed: true, fixedGuestIds: ["bride"] }],
    constraints: [{ type: "separate", a: "g1", b: "bride" }],
  };
  expect(isHardValid({ g1: "head" }, input)).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- constraints`
Expected: FAIL — `tableOfGuest` not exported / fixed-occupant violation not detected.

- [ ] **Step 3: Update the implementation**

In `src/lib/seating/constraints.ts`, add `tableOfGuest` and rewrite `separationViolations`; update `isHardValid`:

```ts
export function tableOfGuest(
  guestId: string,
  assignment: Assignment,
  tables: SeatTable[]
): string | undefined {
  if (assignment[guestId] !== undefined) return assignment[guestId];
  for (const t of tables) {
    if (t.fixedGuestIds.includes(guestId)) return t.id;
  }
  return undefined;
}

export function separationViolations(
  assignment: Assignment,
  constraints: SeatingConstraint[],
  tables: SeatTable[] = []
): SeatingConstraint[] {
  return constraints.filter((c) => {
    if (c.type !== "separate") return false;
    const ta = tableOfGuest(c.a, assignment, tables);
    const tb = tableOfGuest(c.b, assignment, tables);
    return ta !== undefined && ta === tb;
  });
}

export function isHardValid(assignment: Assignment, input: SeatingInput): boolean {
  return (
    tablesOverCapacity(assignment, input.tables).length === 0 &&
    separationViolations(assignment, input.constraints, input.tables).length === 0
  );
}
```

- [ ] **Step 4: Thread tables into the other callers**

In `src/lib/seating/place.ts`, update `wouldViolateSeparation` to pass `input.tables` to both `separationViolations` calls:

```ts
function wouldViolateSeparation(
  guestId: string,
  tableId: string,
  assignment: Assignment,
  input: SeatingInput
): boolean {
  const trial: Assignment = { ...assignment, [guestId]: tableId };
  return (
    separationViolations(trial, input.constraints, input.tables).length >
    separationViolations(assignment, input.constraints, input.tables).length
  );
}
```

In `src/lib/seating/solve.ts`, update `collectWarnings` to pass tables:

```ts
for (const c of separationViolations(assignment, input.constraints, input.tables)) {
  // ... unchanged warning push ...
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- constraints solve place`
Expected: PASS — new fixed-occupant tests green, all prior engine tests still green.

- [ ] **Step 6: Full suite + typecheck**

Run: `npm run test` then `npx tsc --noEmit`
Expected: all green, 0 type errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/seating/constraints.ts src/lib/seating/place.ts src/lib/seating/solve.ts src/lib/seating/constraints.test.ts src/lib/seating/solve.test.ts
git commit -m "fix(seating): make separate-constraint checks fixed-occupant-aware"
```

---

### Task 2: Map wedding + floor plan → SeatingInput (pure)

**Files:**
- Create: `src/lib/plan/buildSeatingInput.ts`
- Test: `src/lib/plan/buildSeatingInput.test.ts`

**Interfaces:**
- Consumes: engine types from `@/lib/seating`.
- Produces:
  - Row shapes (structural subsets of the Prisma rows, so the function is pure and DB-agnostic):
    - `GuestRowInput = { id: string; name: string; groupId: string | null; assignedTableId: string | null }`
    - `TableRowInput = { id: string; capacity: number; fixed: boolean }`
    - `ConstraintRowInput = { type: string; guestAId: string; guestBId: string }`
  - `buildSeatingInput(guests: GuestRowInput[], tables: TableRowInput[], constraints: ConstraintRowInput[]): SeatingInput` — maps rows to the engine input. Guests currently assigned to a **fixed** table become that table's `fixedGuestIds` and are removed from the movable `guests` list; all other guests are movable. Constraint `type` is passed through as `"together"|"separate"`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/plan/buildSeatingInput.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildSeatingInput } from "./buildSeatingInput";

it("maps guests, tables and constraints to SeatingInput", () => {
  const input = buildSeatingInput(
    [
      { id: "g1", name: "Ana", groupId: "fam", assignedTableId: null },
      { id: "g2", name: "Bruno", groupId: "fam", assignedTableId: null },
    ],
    [{ id: "t1", capacity: 8, fixed: false }],
    [{ type: "separate", guestAId: "g1", guestBId: "g2" }]
  );
  expect(input.guests).toEqual([
    { id: "g1", name: "Ana", groupId: "fam" },
    { id: "g2", name: "Bruno", groupId: "fam" },
  ]);
  expect(input.tables).toEqual([{ id: "t1", capacity: 8, fixed: false, fixedGuestIds: [] }]);
  expect(input.constraints).toEqual([{ type: "separate", a: "g1", b: "g2" }]);
});

it("treats guests at a FIXED table as fixed occupants and removes them from the movable pool", () => {
  const input = buildSeatingInput(
    [
      { id: "bride", name: "Noiva", groupId: null, assignedTableId: "head" },
      { id: "groom", name: "Noivo", groupId: null, assignedTableId: "head" },
      { id: "g1", name: "Ana", groupId: null, assignedTableId: null },
    ],
    [
      { id: "head", capacity: 4, fixed: true },
      { id: "t1", capacity: 8, fixed: false },
    ],
    []
  );
  const head = input.tables.find((t) => t.id === "head")!;
  expect(head.fixedGuestIds.sort()).toEqual(["bride", "groom"]);
  // fixed occupants are NOT in the movable pool
  expect(input.guests.map((g) => g.id)).toEqual(["g1"]);
});

it("a fixed table with no occupants exposes empty fixedGuestIds and keeps all guests movable", () => {
  const input = buildSeatingInput(
    [{ id: "g1", name: "Ana", groupId: null, assignedTableId: null }],
    [{ id: "head", capacity: 4, fixed: true }],
    []
  );
  expect(input.tables[0].fixedGuestIds).toEqual([]);
  expect(input.guests.map((g) => g.id)).toEqual(["g1"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- buildSeatingInput`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

Create `src/lib/plan/buildSeatingInput.ts`:

```ts
import type { SeatingInput, ConstraintType } from "@/lib/seating";

export interface GuestRowInput {
  id: string;
  name: string;
  groupId: string | null;
  assignedTableId: string | null;
}
export interface TableRowInput {
  id: string;
  capacity: number;
  fixed: boolean;
}
export interface ConstraintRowInput {
  type: string;
  guestAId: string;
  guestBId: string;
}

export function buildSeatingInput(
  guests: GuestRowInput[],
  tables: TableRowInput[],
  constraints: ConstraintRowInput[]
): SeatingInput {
  const fixedTableIds = new Set(tables.filter((t) => t.fixed).map((t) => t.id));

  const fixedByTable = new Map<string, string[]>();
  for (const g of guests) {
    if (g.assignedTableId && fixedTableIds.has(g.assignedTableId)) {
      const list = fixedByTable.get(g.assignedTableId) ?? [];
      list.push(g.id);
      fixedByTable.set(g.assignedTableId, list);
    }
  }

  const engineTables = tables.map((t) => ({
    id: t.id,
    capacity: t.capacity,
    fixed: t.fixed,
    fixedGuestIds: fixedByTable.get(t.id) ?? [],
  }));

  const engineGuests = guests
    .filter((g) => !(g.assignedTableId && fixedTableIds.has(g.assignedTableId)))
    .map((g) => ({ id: g.id, name: g.name, groupId: g.groupId }));

  const engineConstraints = constraints.map((c) => ({
    type: c.type as ConstraintType,
    a: c.guestAId,
    b: c.guestBId,
  }));

  return { guests: engineGuests, tables: engineTables, constraints: engineConstraints };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- buildSeatingInput`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plan/buildSeatingInput.ts src/lib/plan/buildSeatingInput.test.ts
git commit -m "feat(plan): pure mapping from wedding+floorplan rows to engine SeatingInput"
```

---

### Task 3: Assignment persistence data-access

**Files:**
- Create: `src/lib/db/assignment.ts`
- Test: `src/lib/db/assignment.test.ts`

**Interfaces:**
- Consumes: `prisma` from `./client`.
- Produces:
  - `saveAssignment(assignments: { guestId: string; tableId: string | null }[]): Promise<void>` — updates each guest's `assignedTableId` in one transaction.
  - `clearAssignment(weddingId: string): Promise<void>` — sets `assignedTableId = null` for all guests of the wedding.
  - (`listGuests` from Plan 3 already returns the current assignment via `assignedTableId`.)

- [ ] **Step 1: Write the failing test**

Create `src/lib/db/assignment.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { saveAssignment, clearAssignment } from "./assignment";
import { createWedding } from "./weddings";
import { listGuests } from "./guests";
import { prisma } from "./client";

it("saves and clears guest→table assignments", async () => {
  const w = await createWedding({ couple: "Assign Test" });
  const g1 = await prisma.guest.create({ data: { weddingId: w.id, name: "A" } });
  const g2 = await prisma.guest.create({ data: { weddingId: w.id, name: "B" } });

  await saveAssignment([
    { guestId: g1.id, tableId: "t1" },
    { guestId: g2.id, tableId: "t2" },
  ]);
  let guests = await listGuests(w.id);
  expect(guests.find((g) => g.id === g1.id)?.assignedTableId).toBe("t1");
  expect(guests.find((g) => g.id === g2.id)?.assignedTableId).toBe("t2");

  await clearAssignment(w.id);
  guests = await listGuests(w.id);
  expect(guests.every((g) => g.assignedTableId === null)).toBe(true);
});

afterAll(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- assignment`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

Create `src/lib/db/assignment.ts`:

```ts
import { prisma } from "./client";

export async function saveAssignment(
  assignments: { guestId: string; tableId: string | null }[]
): Promise<void> {
  await prisma.$transaction(
    assignments.map((a) =>
      prisma.guest.update({ where: { id: a.guestId }, data: { assignedTableId: a.tableId } })
    )
  );
}

export async function clearAssignment(weddingId: string): Promise<void> {
  await prisma.guest.updateMany({ where: { weddingId }, data: { assignedTableId: null } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- assignment`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/assignment.ts src/lib/db/assignment.test.ts
git commit -m "feat(db): guest→table assignment persistence"
```

---

### Task 4: Generate + plan-data API routes

**Files:**
- Create: `src/app/api/weddings/[id]/generate/route.ts` (POST → run engine, persist, return result)
- Create: `src/app/api/weddings/[id]/plan/route.ts` (GET → guests+tables+constraints+current assignment for a floor plan)
- Create: `src/app/api/floorplans/route.ts` — extend with GET (list all floor plans with venue name) so the plan page can pick one. (POST already exists from Plan 2; keep it.)
- Test: `src/app/api/weddings/[id]/generate/route.test.ts`

**Interfaces:**
- Consumes: `buildSeatingInput` (Task 2), `solveSeating` (engine), `saveAssignment` (Task 3), data-access (`listGuests`, `listConstraints`, `listTables`, `getFloorPlan`).
- Produces:
  - `POST /api/weddings/[id]/generate` with body `{ floorPlanId }` → loads guests/constraints (wedding) + tables (floor plan), maps, runs `solveSeating`, persists movable guests' `assignedTableId`, and returns `{ assignment, score, warnings }`.
  - `GET /api/weddings/[id]/plan?floorPlanId=...` → `{ guests, tables, constraints }` (current state for rendering).

- [ ] **Step 1: Write the failing test**

Create `src/app/api/weddings/[id]/generate/route.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { POST } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { listGuests } from "@/lib/db/guests";
import { prisma } from "@/lib/db/client";

async function seedFloorPlan() {
  const venue = await prisma.venue.create({ data: { name: "V" } });
  const fp = await prisma.floorPlan.create({
    data: { venueId: venue.id, image: "x", scale: 50, width: 10, depth: 10 },
  });
  await prisma.table.createMany({
    data: [
      { floorPlanId: fp.id, shape: "round", capacity: 2, x: 0, y: 0, fixed: false },
      { floorPlanId: fp.id, shape: "round", capacity: 2, x: 1, y: 1, fixed: false },
    ],
  });
  return fp.id;
}

it("generates and persists an assignment for all guests", async () => {
  const w = await createWedding({ couple: "Gen Test" });
  await prisma.guest.createMany({
    data: [
      { weddingId: w.id, name: "A" },
      { weddingId: w.id, name: "B" },
      { weddingId: w.id, name: "C" },
      { weddingId: w.id, name: "D" },
    ],
  });
  const floorPlanId = await seedFloorPlan();

  const res = await POST(
    new Request("http://x/generate", { method: "POST", body: JSON.stringify({ floorPlanId }) }),
    { params: Promise.resolve({ id: w.id }) }
  );
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(typeof body.score).toBe("number");
  expect(Array.isArray(body.warnings)).toBe(true);

  // every guest now has a table (4 guests, 2 tables x capacity 2 = fits exactly)
  const guests = await listGuests(w.id);
  expect(guests.every((g) => g.assignedTableId !== null)).toBe(true);
});

it("400s when floorPlanId is missing", async () => {
  const w = await createWedding({ couple: "Gen 400" });
  const res = await POST(new Request("http://x/generate", { method: "POST", body: "{}" }), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- "generate/route"`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the generate route**

Create `src/app/api/weddings/[id]/generate/route.ts`:

```ts
import { NextResponse } from "next/server";
import { listGuests } from "@/lib/db/guests";
import { listConstraints } from "@/lib/db/constraints";
import { listTables } from "@/lib/db/tables";
import { getFloorPlan } from "@/lib/db/floorplans";
import { saveAssignment } from "@/lib/db/assignment";
import { buildSeatingInput } from "@/lib/plan/buildSeatingInput";
import { solveSeating } from "@/lib/seating";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!b?.floorPlanId) return NextResponse.json({ error: "floorPlanId required" }, { status: 400 });

  const fp = await getFloorPlan(b.floorPlanId);
  if (!fp) return NextResponse.json({ error: "floor plan not found" }, { status: 404 });

  const [guests, constraints, tables] = await Promise.all([
    listGuests(id),
    listConstraints(id),
    listTables(b.floorPlanId),
  ]);

  const input = buildSeatingInput(guests, tables, constraints);
  const result = solveSeating(input);

  // Persist: movable guests get their solver table; fixed occupants keep their assignment.
  const movableIds = new Set(input.guests.map((g) => g.id));
  const updates = guests
    .filter((g) => movableIds.has(g.id))
    .map((g) => ({ guestId: g.id, tableId: result.assignment[g.id] ?? null }));
  await saveAssignment(updates);

  return NextResponse.json(result);
}
```

- [ ] **Step 4: Write the plan-data route and the floorplans GET**

Create `src/app/api/weddings/[id]/plan/route.ts`:

```ts
import { NextResponse } from "next/server";
import { listGuests } from "@/lib/db/guests";
import { listConstraints } from "@/lib/db/constraints";
import { listTables } from "@/lib/db/tables";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const floorPlanId = new URL(req.url).searchParams.get("floorPlanId");
  const [guests, constraints, tables] = await Promise.all([
    listGuests(id),
    listConstraints(id),
    floorPlanId ? listTables(floorPlanId) : Promise.resolve([]),
  ]);
  return NextResponse.json({ guests, constraints, tables });
}
```

Add a GET to `src/app/api/floorplans/route.ts` (keep the existing POST):

```ts
import { prisma } from "@/lib/db/client";

export async function GET() {
  const plans = await prisma.floorPlan.findMany({
    orderBy: { createdAt: "desc" },
    include: { venue: { select: { name: true } } },
  });
  return NextResponse.json(plans);
}
```

- [ ] **Step 5: Run tests + gates**

Run: `npm run test -- "generate/route"` then `npm run test` then `npx tsc --noEmit` then `npm run build`
Expected: PASS / 0 errors / clean build.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/weddings/[id]/generate" "src/app/api/weddings/[id]/plan" src/app/api/floorplans/route.ts
git commit -m "feat(api): seating generate + plan-data + floorplans list endpoints"
```

---

### Task 5: Plan view — render seating on the floor plan + Generate

**Files:**
- Create: `src/app/admin/wedding/[id]/plan/page.tsx` (plan workspace: floor-plan picker + canvas + Generate + warnings + unassigned tray)
- Create: `src/components/plan/PlanCanvas.tsx` (react-konva: background image + tables, each labelled with its guests / occupancy)
- Create: `src/components/plan/usePlan.ts` (loads plan data for a wedding+floorPlan, exposes `generate()`, `assignment` state, and live `violations`)
- Create: `src/lib/plan/validate.ts` (pure: build an `Assignment` from guest rows + compute violation summaries by reusing the engine validators)
- Test: `src/lib/plan/validate.test.ts`
- Modify: `src/app/admin/wedding/[id]/page.tsx` (add a link "Ver plano de mesas" → `/admin/wedding/[id]/plan`)

**Interfaces:**
- Consumes: the APIs (Task 4), the engine validators, `buildSeatingInput`.
- Produces: `assignmentFromGuests(guests): Assignment` and `planViolations(guests, tables, constraints)` (returns `{ overCapacity: tableIds[], separated: pairs[] }`) — pure, TDD'd; used for live highlighting. The canvas + Generate flow is verified in-app.

- [ ] **Step 1: Write the failing test for the pure validator**

Create `src/lib/plan/validate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { assignmentFromGuests, planViolations } from "./validate";

const tables = [
  { id: "t1", capacity: 2, fixed: false },
  { id: "t2", capacity: 2, fixed: false },
];

it("builds an assignment map from assigned guests only", () => {
  const a = assignmentFromGuests([
    { id: "g1", name: "A", groupId: null, assignedTableId: "t1" },
    { id: "g2", name: "B", groupId: null, assignedTableId: null },
  ]);
  expect(a).toEqual({ g1: "t1" });
});

it("detects over-capacity and separated-together violations", () => {
  const guests = [
    { id: "g1", name: "A", groupId: null, assignedTableId: "t1" },
    { id: "g2", name: "B", groupId: null, assignedTableId: "t1" },
    { id: "g3", name: "C", groupId: null, assignedTableId: "t1" }, // 3 at cap-2 table
  ];
  const v = planViolations(guests, tables, [{ type: "separate", guestAId: "g1", guestBId: "g2" }]);
  expect(v.overCapacity).toContain("t1");
  expect(v.separated.length).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- validate`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the pure validator**

Create `src/lib/plan/validate.ts`:

```ts
import type { Assignment } from "@/lib/seating";
import { tablesOverCapacity, separationViolations } from "@/lib/seating";
import { buildSeatingInput, type GuestRowInput, type TableRowInput, type ConstraintRowInput } from "./buildSeatingInput";

export function assignmentFromGuests(guests: GuestRowInput[]): Assignment {
  const a: Assignment = {};
  for (const g of guests) {
    if (g.assignedTableId) a[g.id] = g.assignedTableId;
  }
  return a;
}

export interface PlanViolations {
  overCapacity: string[];
  separated: { a: string; b: string }[];
}

export function planViolations(
  guests: GuestRowInput[],
  tables: TableRowInput[],
  constraints: ConstraintRowInput[]
): PlanViolations {
  const input = buildSeatingInput(guests, tables, constraints);
  const assignment = assignmentFromGuests(guests);
  return {
    overCapacity: tablesOverCapacity(assignment, input.tables).map((t) => t.id),
    separated: separationViolations(assignment, input.constraints, input.tables).map((c) => ({
      a: c.a,
      b: c.b,
    })),
  };
}
```

(Ensure `tablesOverCapacity` and `separationViolations` are exported from `@/lib/seating` — they already are via the barrel.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- validate`
Expected: PASS.

- [ ] **Step 5: Build the plan view UI**

Build to this contract (client components, `"use client"`):
- **`usePlan.ts`** — given `weddingId` + selected `floorPlanId`: `GET /api/weddings/[id]/plan?floorPlanId=...` → `{ guests, tables, constraints }`; exposes `generate()` (`POST .../generate`, then re-fetch), `assign(guestId, tableId|null)` (deferred to Task 6), and a derived `violations = planViolations(guests, tables, constraints)` recomputed on each state change.
- **`PlanCanvas.tsx`** — reuse the Plan 2 image + display-scale pattern (natural-pixel coords, `next/dynamic` `{ssr:false}`): render the floor-plan background and each table shape; label each table with its occupancy (`n/capacity`) and list the seated guests' names; highlight tables in `violations.overCapacity` in red.
- **`plan/page.tsx`** — a floor-plan picker (`GET /api/floorplans`, showing "venue — plan"), a **Generate** button, the `PlanCanvas`, a warnings panel (render the engine `warnings` from the last generate + the live `violations`), and an **unassigned tray** listing guests with `assignedTableId === null`.
- In `admin/wedding/[id]/page.tsx`, add a link to `/admin/wedding/[id]/plan`.

- [ ] **Step 6: Verify by driving the app (webapp-testing skill)**

Using a wedding that has imported guests (+ a couple of constraints) and a floor plan with several tables:
1. Open the plan page, pick the floor plan.
2. Click **Generate** — confirm guests get placed on tables (occupancy labels update), the score/warnings show, and the unassigned tray is empty when capacity suffices.
3. Reload — the assignment persists (guests keep their tables).
4. If you add a `separate` constraint that the generation can't satisfy given tight capacity, confirm a warning appears.
Capture a screenshot of the generated plan. Report what was verified vs not.

- [ ] **Step 7: Commit**

```bash
git add src/lib/plan/validate.ts src/lib/plan/validate.test.ts src/components/plan "src/app/admin/wedding/[id]/plan" "src/app/admin/wedding/[id]/page.tsx"
git commit -m "feat(plan): plan view — generate seating + render on floor plan + live warnings"
```

---

### Task 6: Manual drag-to-table + live re-validation + save

**Files:**
- Modify: `src/components/plan/PlanCanvas.tsx` (drag a guest onto a table)
- Modify: `src/components/plan/usePlan.ts` (`assign` + optimistic state + persist)
- Create: `src/components/plan/UnassignedTray.tsx` (draggable guest cards for unseated guests)
- Modify: `src/app/admin/wedding/[id]/plan/page.tsx` (wire the tray + a "Guardar" affordance if not auto-saving)

**Interfaces:**
- Consumes: `PATCH /api/guests/[id]` (Plan 3, sets `assignedTableId`? — note: Plan 3's guest PATCH sets `groupId`. Add table assignment via a dedicated call). Use `saveAssignment` through a small endpoint: add `PUT /api/weddings/[id]/assignment` accepting `{ assignments: {guestId, tableId|null}[] }`.
- Produces: dragging a guest card (from the tray or another table) onto a table updates `assignedTableId`, persists, and live-recomputes `violations` so the couple sees over-capacity/separation issues immediately.

- [ ] **Step 1: Add the assignment PUT endpoint (TDD)**

Create `src/app/api/weddings/[id]/assignment/route.ts`:

```ts
import { NextResponse } from "next/server";
import { saveAssignment } from "@/lib/db/assignment";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await params; // wedding id not needed beyond scoping; guests are updated by id
  const b = await req.json().catch(() => ({}));
  if (!Array.isArray(b?.assignments)) {
    return NextResponse.json({ error: "assignments[] required" }, { status: 400 });
  }
  await saveAssignment(b.assignments);
  return NextResponse.json({ ok: true });
}
```

Create `src/app/api/weddings/[id]/assignment/route.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { PUT } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { listGuests } from "@/lib/db/guests";
import { prisma } from "@/lib/db/client";

it("persists a manual assignment", async () => {
  const w = await createWedding({ couple: "Manual" });
  const g = await prisma.guest.create({ data: { weddingId: w.id, name: "A" } });
  const res = await PUT(
    new Request("http://x/assignment", {
      method: "PUT",
      body: JSON.stringify({ assignments: [{ guestId: g.id, tableId: "t9" }] }),
    }),
    { params: Promise.resolve({ id: w.id }) }
  );
  expect(res.status).toBe(200);
  expect((await listGuests(w.id)).find((x) => x.id === g.id)?.assignedTableId).toBe("t9");
});

afterAll(async () => { await prisma.$disconnect(); });
```

Run: `npm run test -- "assignment/route"` (fail → implement → pass).

- [ ] **Step 2: Build the tray + drag onto tables**

- `UnassignedTray.tsx` (`"use client"`): lists guests with `assignedTableId === null` as `draggable` cards (`dataTransfer.setData("guestId", g.id)`).
- In `PlanCanvas.tsx`: make each table shape a drop target. Because Konva shapes don't receive HTML drag events, implement drop by overlaying an absolutely-positioned HTML layer of transparent drop zones aligned to each table's on-screen (display-scaled) position, OR handle drop on the Stage container and hit-test the pointer against table positions. Simpler approach: render an HTML overlay `<div>` per table (positioned with the same display-scale math as the shapes) that is the drop target; on drop → `assign(guestId, tableId)`.
- `assign(guestId, tableId|null)` in `usePlan.ts`: optimistic local update of the guest's `assignedTableId`, `PUT /api/weddings/[id]/assignment` with the single change, and recompute `violations`. Dragging a seated guest back to the tray assigns `null`.

- [ ] **Step 3: Live re-validation**

`violations` (from `planViolations`) recomputes on every `assign`; `PlanCanvas` highlights over-capacity tables in red and the warnings panel lists separated pairs currently sharing a table (resolve names). This gives immediate feedback while dragging.

- [ ] **Step 4: Verify by driving the app (webapp-testing skill)**

1. On a generated plan, drag a guest from one table to another; confirm the occupancy labels update and the change persists after reload.
2. Drag guests onto one table beyond its capacity; confirm the table highlights red (over-capacity) live.
3. Create a `separate` pair, then drag both onto the same table; confirm the separation warning appears live.
4. Drag a guest to the unassigned tray; confirm it becomes unseated and persists.
Capture a screenshot showing a live violation highlight. Report what was verified vs not.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/weddings/[id]/assignment" src/components/plan "src/app/admin/wedding/[id]/plan"
git commit -m "feat(plan): manual drag-to-table with live re-validation + persistence"
```

---

## Definition of Done

- `npm run test` passes: engine fixed-occupant fix, mapping, assignment persistence, plan validators, and the generate/assignment API tests, alongside all Plan 1-3 tests. `npx tsc --noEmit` and `npm run build` are clean.
- In the running local app, a couple can: open a wedding's plan, pick a floor plan, click **Generate** to auto-seat all guests respecting groups/capacity/separations, see the result on the real floor plan with warnings, then drag guests between tables (and to/from an unassigned tray) with over-capacity and separation issues highlighted live — and it all persists.
- The carried Plan 1 follow-up (fixed-occupant-aware `separate`) is closed and tested.

## What comes next (future plan)

- **Plan 5:** PDF export (html2canvas + jsPDF) of the plan view + a per-table guest list, for printing / sending to the venue.
- **Remaining follow-ups:** `GET /api/weddings/[id]` single-record route; add a Constraint→Guest FK (or cleanup) once guest deletion exists; table glyph sizing by capacity; per-seat (not just per-table) placement.
