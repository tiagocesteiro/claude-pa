# Foundation & Seating Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the local Next.js + Prisma/SQLite project and build the seating-disposition engine as pure, headless, fully-tested TypeScript — the highest-risk core, provable with zero UI.

**Architecture:** A local-first Next.js (TypeScript) app with a Prisma/SQLite data layer. The seating engine is a set of pure functions under `src/lib/seating/` with no framework or DB dependencies: domain types → hard-constraint validation → scoring → greedy placement → local-search refinement → solver orchestration. Every unit is tested in isolation with Vitest.

**Tech Stack:** Next.js (App Router, TypeScript), Prisma ORM over SQLite, Vitest for tests. No Vercel, no cloud, no auth in this plan.

## Global Constraints

- **Local-first only.** No Vercel, no Supabase, no network calls. App runs via `next dev`; DB is a local SQLite file.
- **Data layer:** Prisma over SQLite. Schema must migrate to Postgres later by changing only the datasource provider — avoid SQLite-only column types.
- **Seating engine is pure.** Files under `src/lib/seating/` must not import Prisma, Next.js, React, `fs`, or any I/O. They take plain data in and return plain data out, so they are trivially testable.
- **`separate` constraints are HARD** (never violated). **`together` constraints and group cohesion are PREFERENCES** maximized via score, per spec §5. A split `together` pair produces a warning, not a failure.
- **Determinism.** The solver must be deterministic (same input → same output). Refinement uses deterministic hill-climbing, not random annealing, so tests are reproducible.
- **All work happens inside** `projects/wedding-seating/`. All paths below are relative to that directory.
- **TDD.** Write the failing test first, watch it fail, implement minimally, watch it pass, commit.

---

### Task 1: Project foundation (Next.js + Prisma + SQLite + Vitest)

**Files:**
- Create: `projects/wedding-seating/package.json` (via scaffolding)
- Create: `projects/wedding-seating/prisma/schema.prisma`
- Create: `projects/wedding-seating/vitest.config.ts`
- Create: `projects/wedding-seating/src/lib/smoke.test.ts`
- Create: `projects/wedding-seating/.env` (SQLite URL)
- Create: `projects/wedding-seating/.gitignore`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a working repo where `npm run test` executes Vitest, and `npx prisma migrate dev` creates the SQLite DB from the schema below.

- [ ] **Step 1: Scaffold the Next.js app**

From the repo root, run (accept TypeScript, App Router, no Tailwind requirement — Tailwind optional, say No if prompted; use `src/` directory: Yes; import alias default `@/*`):

```bash
cd "projects/wedding-seating"
npx create-next-app@latest . --ts --app --src-dir --no-tailwind --eslint --import-alias "@/*" --use-npm
```

Expected: a Next.js project scaffolds in the current directory (`package.json`, `src/app/`, `tsconfig.json`).

- [ ] **Step 2: Install Prisma and Vitest**

```bash
npm install -D prisma vitest @vitest/coverage-v8
npm install @prisma/client
npx prisma init --datasource-provider sqlite
```

Expected: `prisma/schema.prisma` and `.env` created; `.env` contains `DATABASE_URL="file:./dev.db"`.

- [ ] **Step 3: Write the Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Venue {
  id        String     @id @default(cuid())
  name      String
  location  String?
  photos    String?    // JSON array of file paths
  floorPlans FloorPlan[]
  createdAt DateTime   @default(now())
}

model FloorPlan {
  id        String   @id @default(cuid())
  venueId   String
  venue     Venue    @relation(fields: [venueId], references: [id], onDelete: Cascade)
  image     String   // local file path
  scale     Float    // pixels per metre
  width     Float    // metres
  depth     Float    // metres
  tables    Table[]
  weddings  Wedding[]
  createdAt DateTime @default(now())
}

model Table {
  id          String   @id @default(cuid())
  floorPlanId String
  floorPlan   FloorPlan @relation(fields: [floorPlanId], references: [id], onDelete: Cascade)
  shape       String   // "round" | "rect"
  capacity    Int
  x           Float
  y           Float
  fixed       Boolean  @default(false)
}

model Wedding {
  id            String    @id @default(cuid())
  couple        String
  date          DateTime?
  floorPlanId   String?
  floorPlan     FloorPlan? @relation(fields: [floorPlanId], references: [id])
  guests        Guest[]
  groups        Group[]
  constraints   Constraint[]
  createdAt     DateTime  @default(now())
}

model Group {
  id        String  @id @default(cuid())
  weddingId String
  wedding   Wedding @relation(fields: [weddingId], references: [id], onDelete: Cascade)
  name      String
  color     String?
  guests    Guest[]
}

model Guest {
  id             String  @id @default(cuid())
  weddingId      String
  wedding        Wedding @relation(fields: [weddingId], references: [id], onDelete: Cascade)
  name           String
  groupId        String?
  group          Group?  @relation(fields: [groupId], references: [id])
  assignedTableId String?
}

model Constraint {
  id         String  @id @default(cuid())
  weddingId  String
  wedding    Wedding @relation(fields: [weddingId], references: [id], onDelete: Cascade)
  type       String  // "together" | "separate"
  guestAId   String
  guestBId   String
}
```

- [ ] **Step 4: Run the migration**

```bash
npx prisma migrate dev --name init
```

Expected: creates `prisma/dev.db` and `prisma/migrations/…_init/`, and generates the Prisma client without error.

- [ ] **Step 5: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

Add to `package.json` `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Write the smoke test**

Create `src/lib/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Run the smoke test**

Run: `npm run test`
Expected: PASS — 1 test passed.

- [ ] **Step 8: Ensure local artefacts are ignored**

Append to `.gitignore` (create if missing):

```
# local db
prisma/dev.db
prisma/dev.db-journal
# next / node
.next/
node_modules/
```

- [ ] **Step 9: Commit**

```bash
git add projects/wedding-seating
git commit -m "feat(wedding-seating): scaffold local Next.js + Prisma/SQLite + Vitest foundation"
```

---

### Task 2: Domain types for the seating engine

**Files:**
- Create: `src/lib/seating/types.ts`
- Test: `src/lib/seating/types.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (relied on by Tasks 3-7):
  - `Guest = { id: string; name: string; groupId: string | null }`
  - `SeatTable = { id: string; capacity: number; fixed: boolean; fixedGuestIds: string[] }`
  - `ConstraintType = "together" | "separate"`
  - `SeatingConstraint = { type: ConstraintType; a: string; b: string }` (`a`/`b` are guest ids)
  - `SeatingInput = { guests: Guest[]; tables: SeatTable[]; constraints: SeatingConstraint[] }`
  - `Assignment = Record<string, string>` (guestId → tableId)
  - `WarningKind = "group-split" | "together-split" | "separate-unsatisfiable" | "insufficient-capacity"`
  - `Warning = { kind: WarningKind; message: string }`
  - `SeatingResult = { assignment: Assignment; score: number; warnings: Warning[] }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/seating/types.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { SeatingInput, SeatingResult } from "./types";

describe("types", () => {
  it("accepts a well-formed SeatingInput and SeatingResult", () => {
    const input: SeatingInput = {
      guests: [{ id: "g1", name: "Ana", groupId: "grp1" }],
      tables: [{ id: "t1", capacity: 8, fixed: false, fixedGuestIds: [] }],
      constraints: [{ type: "separate", a: "g1", b: "g2" }],
    };
    const result: SeatingResult = { assignment: { g1: "t1" }, score: 0, warnings: [] };
    expect(input.guests.length).toBe(1);
    expect(result.assignment.g1).toBe("t1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- types`
Expected: FAIL — cannot find module `./types`.

- [ ] **Step 3: Write the types**

Create `src/lib/seating/types.ts`:

```ts
export interface Guest {
  id: string;
  name: string;
  groupId: string | null;
}

export interface SeatTable {
  id: string;
  capacity: number;
  fixed: boolean;
  fixedGuestIds: string[];
}

export type ConstraintType = "together" | "separate";

export interface SeatingConstraint {
  type: ConstraintType;
  a: string; // guest id
  b: string; // guest id
}

export interface SeatingInput {
  guests: Guest[];
  tables: SeatTable[];
  constraints: SeatingConstraint[];
}

export type Assignment = Record<string, string>; // guestId -> tableId

export type WarningKind =
  | "group-split"
  | "together-split"
  | "separate-unsatisfiable"
  | "insufficient-capacity";

export interface Warning {
  kind: WarningKind;
  message: string;
}

export interface SeatingResult {
  assignment: Assignment;
  score: number;
  warnings: Warning[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- types`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seating/types.ts src/lib/seating/types.test.ts
git commit -m "feat(seating): add domain types"
```

---

### Task 3: Hard-constraint validation

**Files:**
- Create: `src/lib/seating/constraints.ts`
- Test: `src/lib/seating/constraints.test.ts`

**Interfaces:**
- Consumes: `Assignment`, `SeatingInput`, `SeatTable`, `SeatingConstraint` from `./types`.
- Produces (relied on by Tasks 5-7):
  - `tablesOverCapacity(assignment: Assignment, tables: SeatTable[]): SeatTable[]` — tables whose occupant count (solver-placed + `fixedGuestIds`) exceeds `capacity`.
  - `separationViolations(assignment: Assignment, constraints: SeatingConstraint[]): SeatingConstraint[]` — `separate` constraints whose two guests share a table.
  - `isHardValid(assignment: Assignment, input: SeatingInput): boolean` — true iff no over-capacity tables and no separation violations.
  - `occupantsByTable(assignment: Assignment, tables: SeatTable[]): Record<string, string[]>` — tableId → all guest ids at it (solver-placed + fixed).

- [ ] **Step 1: Write the failing test**

Create `src/lib/seating/constraints.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  tablesOverCapacity,
  separationViolations,
  isHardValid,
  occupantsByTable,
} from "./constraints";
import type { SeatingInput, SeatTable, SeatingConstraint, Assignment } from "./types";

const tables: SeatTable[] = [
  { id: "t1", capacity: 2, fixed: false, fixedGuestIds: [] },
  { id: "t2", capacity: 2, fixed: true, fixedGuestIds: ["gf"] },
];

it("counts fixed guests toward occupancy", () => {
  const occ = occupantsByTable({ g1: "t2" }, tables);
  expect(occ.t2.sort()).toEqual(["g1", "gf"]);
});

it("flags tables over capacity including fixed guests", () => {
  // t2 has fixed gf + placed g1 + g2 = 3 > capacity 2
  const over = tablesOverCapacity({ g1: "t2", g2: "t2" }, tables);
  expect(over.map((t) => t.id)).toEqual(["t2"]);
});

it("detects separation violations", () => {
  const constraints: SeatingConstraint[] = [{ type: "separate", a: "g1", b: "g2" }];
  const viol = separationViolations({ g1: "t1", g2: "t1" }, constraints);
  expect(viol.length).toBe(1);
});

it("ignores separated guests at different tables", () => {
  const constraints: SeatingConstraint[] = [{ type: "separate", a: "g1", b: "g2" }];
  const viol = separationViolations({ g1: "t1", g2: "t2" }, constraints);
  expect(viol.length).toBe(0);
});

it("isHardValid is false when a separation is violated", () => {
  const input: SeatingInput = {
    guests: [],
    tables,
    constraints: [{ type: "separate", a: "g1", b: "g2" }],
  };
  const assignment: Assignment = { g1: "t1", g2: "t1" };
  expect(isHardValid(assignment, input)).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- constraints`
Expected: FAIL — cannot find module `./constraints`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/seating/constraints.ts`:

```ts
import type { Assignment, SeatingConstraint, SeatingInput, SeatTable } from "./types";

export function occupantsByTable(
  assignment: Assignment,
  tables: SeatTable[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const t of tables) {
    result[t.id] = [...t.fixedGuestIds];
  }
  for (const [guestId, tableId] of Object.entries(assignment)) {
    if (!result[tableId]) result[tableId] = [];
    result[tableId].push(guestId);
  }
  return result;
}

export function tablesOverCapacity(
  assignment: Assignment,
  tables: SeatTable[]
): SeatTable[] {
  const occ = occupantsByTable(assignment, tables);
  return tables.filter((t) => (occ[t.id]?.length ?? 0) > t.capacity);
}

export function separationViolations(
  assignment: Assignment,
  constraints: SeatingConstraint[]
): SeatingConstraint[] {
  return constraints.filter(
    (c) =>
      c.type === "separate" &&
      assignment[c.a] !== undefined &&
      assignment[c.a] === assignment[c.b]
  );
}

export function isHardValid(assignment: Assignment, input: SeatingInput): boolean {
  return (
    tablesOverCapacity(assignment, input.tables).length === 0 &&
    separationViolations(assignment, input.constraints).length === 0
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- constraints`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seating/constraints.ts src/lib/seating/constraints.test.ts
git commit -m "feat(seating): hard-constraint validation (capacity, separation, fixed tables)"
```

---

### Task 4: Scoring

**Files:**
- Create: `src/lib/seating/score.ts`
- Test: `src/lib/seating/score.test.ts`

**Interfaces:**
- Consumes: `Assignment`, `SeatingInput`, `Guest`, `SeatTable` from `./types`; `occupantsByTable` from `./constraints`.
- Produces (relied on by Tasks 6-7):
  - `WEIGHTS = { together: 100, groupSpread: 10, balance: 1 }` (exported const).
  - `groupSpread(assignment, guests): number` — sum over groups of `(distinctTablesUsed - 1)`; groups with 0 placed guests contribute 0.
  - `satisfiedTogether(assignment, constraints): number` — count of `together` constraints whose both guests share a table.
  - `fillSpread(assignment, tables): number` — `maxFill - minFill` across tables that have ≥1 occupant (fixed counted); 0 if fewer than 2 occupied tables.
  - `scoreAssignment(assignment: Assignment, input: SeatingInput): number` — `together*W.together - groupSpread*W.groupSpread - fillSpread*W.balance`. Higher is better.

- [ ] **Step 1: Write the failing test**

Create `src/lib/seating/score.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { groupSpread, satisfiedTogether, fillSpread, scoreAssignment, WEIGHTS } from "./score";
import type { Guest, SeatTable, SeatingInput } from "./types";

const guests: Guest[] = [
  { id: "g1", name: "A", groupId: "grp1" },
  { id: "g2", name: "B", groupId: "grp1" },
  { id: "g3", name: "C", groupId: "grp1" },
];

it("groupSpread is 0 when a group is fully together", () => {
  expect(groupSpread({ g1: "t1", g2: "t1", g3: "t1" }, guests)).toBe(0);
});

it("groupSpread counts extra tables a group spans", () => {
  // grp1 spans t1 and t2 -> distinctTables 2 -> spread 1
  expect(groupSpread({ g1: "t1", g2: "t1", g3: "t2" }, guests)).toBe(1);
});

it("satisfiedTogether counts pairs sharing a table", () => {
  const n = satisfiedTogether({ g1: "t1", g2: "t1" }, [{ type: "together", a: "g1", b: "g2" }]);
  expect(n).toBe(1);
});

it("scoreAssignment rewards togetherness and penalises spread", () => {
  const input: SeatingInput = {
    guests,
    tables: [
      { id: "t1", capacity: 8, fixed: false, fixedGuestIds: [] },
      { id: "t2", capacity: 8, fixed: false, fixedGuestIds: [] },
    ],
    constraints: [{ type: "together", a: "g1", b: "g2" }],
  };
  const together = scoreAssignment({ g1: "t1", g2: "t1", g3: "t1" }, input);
  const split = scoreAssignment({ g1: "t1", g2: "t1", g3: "t2" }, input);
  expect(together).toBeGreaterThan(split);
  // together: 1*100 - 0 - 0 = 100 ; split: 1*100 - 1*10 - fillSpread(2-1=1)*1 = 89
  expect(together).toBe(100);
  expect(split).toBe(89);
  expect(WEIGHTS.together).toBe(100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- score`
Expected: FAIL — cannot find module `./score`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/seating/score.ts`:

```ts
import type { Assignment, Guest, SeatingConstraint, SeatingInput, SeatTable } from "./types";
import { occupantsByTable } from "./constraints";

export const WEIGHTS = { together: 100, groupSpread: 10, balance: 1 } as const;

export function groupSpread(assignment: Assignment, guests: Guest[]): number {
  const tablesByGroup = new Map<string, Set<string>>();
  for (const g of guests) {
    if (g.groupId == null) continue;
    const tableId = assignment[g.id];
    if (tableId === undefined) continue;
    if (!tablesByGroup.has(g.groupId)) tablesByGroup.set(g.groupId, new Set());
    tablesByGroup.get(g.groupId)!.add(tableId);
  }
  let spread = 0;
  for (const set of tablesByGroup.values()) {
    spread += set.size - 1;
  }
  return spread;
}

export function satisfiedTogether(
  assignment: Assignment,
  constraints: SeatingConstraint[]
): number {
  return constraints.filter(
    (c) =>
      c.type === "together" &&
      assignment[c.a] !== undefined &&
      assignment[c.a] === assignment[c.b]
  ).length;
}

export function fillSpread(assignment: Assignment, tables: SeatTable[]): number {
  const occ = occupantsByTable(assignment, tables);
  const fills = Object.values(occ)
    .map((ids) => ids.length)
    .filter((n) => n > 0);
  if (fills.length < 2) return 0;
  return Math.max(...fills) - Math.min(...fills);
}

export function scoreAssignment(assignment: Assignment, input: SeatingInput): number {
  return (
    satisfiedTogether(assignment, input.constraints) * WEIGHTS.together -
    groupSpread(assignment, input.guests) * WEIGHTS.groupSpread -
    fillSpread(assignment, input.tables) * WEIGHTS.balance
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- score`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seating/score.ts src/lib/seating/score.test.ts
git commit -m "feat(seating): scoring (group cohesion, together pairs, fill balance)"
```

---

### Task 5: Greedy initial placement

**Files:**
- Create: `src/lib/seating/place.ts`
- Test: `src/lib/seating/place.test.ts`

**Interfaces:**
- Consumes: `SeatingInput`, `Assignment`, `Guest`, `SeatTable` from `./types`; `occupantsByTable`, `separationViolations` from `./constraints`.
- Produces (relied on by Task 7):
  - `placeGreedy(input: SeatingInput): Assignment` — deterministic initial placement. Fixed tables keep their `fixedGuestIds` (never re-placed). Guests are grouped by `groupId` (ungrouped guests each form a singleton pseudo-group keyed by their own id). Groups are placed largest-first, ties broken by group key ascending, into the table with the most remaining capacity that introduces no separation violation; a group too big for any single remaining table is split across tables (largest remaining capacity first). Returns only solver-placed guests (not fixed ones).

- [ ] **Step 1: Write the failing test**

Create `src/lib/seating/place.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { placeGreedy } from "./place";
import { tablesOverCapacity, separationViolations } from "./constraints";
import type { SeatingInput } from "./types";

it("keeps a group together when it fits", () => {
  const input: SeatingInput = {
    guests: [
      { id: "g1", name: "A", groupId: "grp1" },
      { id: "g2", name: "B", groupId: "grp1" },
      { id: "g3", name: "C", groupId: "grp1" },
    ],
    tables: [
      { id: "t1", capacity: 4, fixed: false, fixedGuestIds: [] },
      { id: "t2", capacity: 4, fixed: false, fixedGuestIds: [] },
    ],
    constraints: [],
  };
  const a = placeGreedy(input);
  expect(a.g1).toBe(a.g2);
  expect(a.g2).toBe(a.g3);
});

it("never over-fills a table", () => {
  const input: SeatingInput = {
    guests: Array.from({ length: 5 }, (_, i) => ({
      id: `g${i}`,
      name: `G${i}`,
      groupId: null,
    })),
    tables: [{ id: "t1", capacity: 3, fixed: false, fixedGuestIds: [] }, { id: "t2", capacity: 3, fixed: false, fixedGuestIds: [] }],
    constraints: [],
  };
  const a = placeGreedy(input);
  expect(tablesOverCapacity(a, input.tables).length).toBe(0);
});

it("respects fixed-table remaining capacity", () => {
  const input: SeatingInput = {
    guests: [
      { id: "g1", name: "A", groupId: null },
      { id: "g2", name: "B", groupId: null },
    ],
    tables: [{ id: "t1", capacity: 2, fixed: true, fixedGuestIds: ["gf"] }, { id: "t2", capacity: 2, fixed: false, fixedGuestIds: [] }],
    constraints: [],
  };
  const a = placeGreedy(input);
  // t1 has 1 free seat (capacity 2 - 1 fixed); both g1,g2 cannot both go to t1
  expect(tablesOverCapacity(a, input.tables).length).toBe(0);
});

it("does not create separation violations when avoidable", () => {
  const input: SeatingInput = {
    guests: [
      { id: "g1", name: "A", groupId: null },
      { id: "g2", name: "B", groupId: null },
    ],
    tables: [{ id: "t1", capacity: 4, fixed: false, fixedGuestIds: [] }, { id: "t2", capacity: 4, fixed: false, fixedGuestIds: [] }],
    constraints: [{ type: "separate", a: "g1", b: "g2" }],
  };
  const a = placeGreedy(input);
  expect(separationViolations(a, input.constraints).length).toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- place`
Expected: FAIL — cannot find module `./place`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/seating/place.ts`:

```ts
import type { Assignment, Guest, SeatingInput, SeatTable } from "./types";
import { occupantsByTable, separationViolations } from "./constraints";

interface GroupBundle {
  key: string;
  guestIds: string[];
}

function bundleGroups(guests: Guest[]): GroupBundle[] {
  const byGroup = new Map<string, string[]>();
  for (const g of guests) {
    const key = g.groupId ?? `__solo__${g.id}`;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(g.id);
  }
  return [...byGroup.entries()]
    .map(([key, guestIds]) => ({ key, guestIds }))
    .sort((a, b) =>
      b.guestIds.length - a.guestIds.length || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
    );
}

function remainingCapacity(
  table: SeatTable,
  assignment: Assignment,
  tables: SeatTable[]
): number {
  const occ = occupantsByTable(assignment, tables);
  return table.capacity - (occ[table.id]?.length ?? 0);
}

function wouldViolateSeparation(
  guestId: string,
  tableId: string,
  assignment: Assignment,
  input: SeatingInput
): boolean {
  const trial: Assignment = { ...assignment, [guestId]: tableId };
  return separationViolations(trial, input.constraints).length >
    separationViolations(assignment, input.constraints).length;
}

function placeGuest(
  guestId: string,
  assignment: Assignment,
  input: SeatingInput
): boolean {
  const candidates = [...input.tables]
    .filter((t) => remainingCapacity(t, assignment, input.tables) > 0)
    .filter((t) => !wouldViolateSeparation(guestId, t.id, assignment, input))
    .sort(
      (a, b) =>
        remainingCapacity(b, assignment, input.tables) -
          remainingCapacity(a, assignment, input.tables) ||
        (a.id < b.id ? -1 : 1)
    );
  if (candidates.length === 0) return false;
  assignment[guestId] = candidates[0].id;
  return true;
}

export function placeGreedy(input: SeatingInput): Assignment {
  const assignment: Assignment = {};
  const bundles = bundleGroups(input.guests);
  for (const bundle of bundles) {
    // Try to seat the whole bundle at one table that fits.
    const fitting = [...input.tables]
      .filter(
        (t) =>
          remainingCapacity(t, assignment, input.tables) >= bundle.guestIds.length
      )
      .filter((t) =>
        bundle.guestIds.every(
          (gid) => !wouldViolateSeparation(gid, t.id, assignment, input)
        )
      )
      .sort(
        (a, b) =>
          remainingCapacity(a, assignment, input.tables) -
            remainingCapacity(b, assignment, input.tables) ||
          (a.id < b.id ? -1 : 1)
      );
    if (fitting.length > 0) {
      for (const gid of bundle.guestIds) assignment[gid] = fitting[0].id;
      continue;
    }
    // Otherwise place guests individually (splits the group).
    for (const gid of bundle.guestIds) {
      placeGuest(gid, assignment, input);
    }
  }
  return assignment;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- place`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seating/place.ts src/lib/seating/place.test.ts
git commit -m "feat(seating): greedy initial placement (group-aware, capacity- and separation-safe)"
```

---

### Task 6: Local-search refinement

**Files:**
- Create: `src/lib/seating/refine.ts`
- Test: `src/lib/seating/refine.test.ts`

**Interfaces:**
- Consumes: `Assignment`, `SeatingInput` from `./types`; `scoreAssignment` from `./score`; `isHardValid` from `./constraints`.
- Produces (relied on by Task 7):
  - `refine(assignment: Assignment, input: SeatingInput, maxPasses?: number): Assignment` — deterministic hill-climbing. Repeatedly scans all guest→other-table moves and all guest↔guest swaps (in stable id order); applies the single best change that strictly increases `scoreAssignment` and keeps `isHardValid` true. Stops when a full pass yields no improvement or after `maxPasses` (default 20). Never returns a lower-scoring or hard-invalid assignment than it received.

- [ ] **Step 1: Write the failing test**

Create `src/lib/seating/refine.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { refine } from "./refine";
import { scoreAssignment } from "./score";
import { isHardValid } from "./constraints";
import type { SeatingInput, Assignment } from "./types";

const input: SeatingInput = {
  guests: [
    { id: "g1", name: "A", groupId: "grp1" },
    { id: "g2", name: "B", groupId: "grp1" },
  ],
  tables: [
    { id: "t1", capacity: 4, fixed: false, fixedGuestIds: [] },
    { id: "t2", capacity: 4, fixed: false, fixedGuestIds: [] },
  ],
  constraints: [],
};

it("improves a deliberately split group by moving one guest", () => {
  const start: Assignment = { g1: "t1", g2: "t2" }; // group split
  const before = scoreAssignment(start, input);
  const after = refine(start, input);
  expect(scoreAssignment(after, input)).toBeGreaterThan(before);
  expect(after.g1).toBe(after.g2); // now together
});

it("never breaks hard validity", () => {
  const start: Assignment = { g1: "t1", g2: "t2" };
  const out = refine(start, input);
  expect(isHardValid(out, input)).toBe(true);
});

it("leaves an already-optimal assignment unchanged in score", () => {
  const start: Assignment = { g1: "t1", g2: "t1" };
  const before = scoreAssignment(start, input);
  const out = refine(start, input);
  expect(scoreAssignment(out, input)).toBe(before);
});

it("does not mutate the input assignment object", () => {
  const start: Assignment = { g1: "t1", g2: "t2" };
  refine(start, input);
  expect(start).toEqual({ g1: "t1", g2: "t2" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- refine`
Expected: FAIL — cannot find module `./refine`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/seating/refine.ts`:

```ts
import type { Assignment, SeatingInput } from "./types";
import { scoreAssignment } from "./score";
import { isHardValid } from "./constraints";

function bestMove(
  current: Assignment,
  input: SeatingInput
): { next: Assignment; score: number } | null {
  const baseScore = scoreAssignment(current, input);
  let best: { next: Assignment; score: number } | null = null;

  const guestIds = Object.keys(current).sort();
  const tableIds = input.tables.map((t) => t.id).sort();

  const consider = (next: Assignment) => {
    if (!isHardValid(next, input)) return;
    const s = scoreAssignment(next, input);
    if (s > baseScore && (best === null || s > best.score)) {
      best = { next, score: s };
    }
  };

  // Moves: send one guest to a different table.
  for (const gid of guestIds) {
    for (const tid of tableIds) {
      if (current[gid] === tid) continue;
      consider({ ...current, [gid]: tid });
    }
  }
  // Swaps: exchange the tables of two guests.
  for (let i = 0; i < guestIds.length; i++) {
    for (let j = i + 1; j < guestIds.length; j++) {
      const a = guestIds[i];
      const b = guestIds[j];
      if (current[a] === current[b]) continue;
      consider({ ...current, [a]: current[b], [b]: current[a] });
    }
  }
  return best;
}

export function refine(
  assignment: Assignment,
  input: SeatingInput,
  maxPasses = 20
): Assignment {
  let current: Assignment = { ...assignment };
  for (let pass = 0; pass < maxPasses; pass++) {
    const improvement = bestMove(current, input);
    if (!improvement) break;
    current = improvement.next;
  }
  return current;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- refine`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seating/refine.ts src/lib/seating/refine.test.ts
git commit -m "feat(seating): deterministic hill-climbing refinement"
```

---

### Task 7: Solver orchestration and warnings

**Files:**
- Create: `src/lib/seating/solve.ts`
- Create: `src/lib/seating/index.ts` (public barrel export)
- Test: `src/lib/seating/solve.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces (public API for later plans / UI / API routes):
  - `solveSeating(input: SeatingInput): SeatingResult` — runs `placeGreedy` → `refine`, computes `score` via `scoreAssignment`, and collects warnings:
    - `insufficient-capacity` when total guests > total remaining capacity (sum of `capacity - fixedGuestIds.length`).
    - `separate-unsatisfiable` for any `separate` pair still sharing a table in the final assignment.
    - `together-split` for any `together` pair not sharing a table.
    - `group-split` for any group spanning more than one table.
    - Any guest that could not be placed is simply omitted from `assignment` (and implies the `insufficient-capacity` warning).
  - `index.ts` re-exports `solveSeating`, all types, and the scoring/constraint helpers.

- [ ] **Step 1: Write the failing test**

Create `src/lib/seating/solve.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { solveSeating } from "./solve";
import { isHardValid } from "./constraints";
import type { SeatingInput } from "./types";

it("seats a simple wedding with all hard constraints satisfied", () => {
  const input: SeatingInput = {
    guests: [
      { id: "g1", name: "A", groupId: "fam" },
      { id: "g2", name: "B", groupId: "fam" },
      { id: "g3", name: "C", groupId: "friends" },
      { id: "g4", name: "D", groupId: "friends" },
    ],
    tables: [
      { id: "t1", capacity: 2, fixed: false, fixedGuestIds: [] },
      { id: "t2", capacity: 2, fixed: false, fixedGuestIds: [] },
    ],
    constraints: [{ type: "separate", a: "g1", b: "g3" }],
  };
  const result = solveSeating(input);
  expect(isHardValid(result.assignment, input)).toBe(true);
  expect(Object.keys(result.assignment).length).toBe(4);
});

it("warns on insufficient capacity", () => {
  const input: SeatingInput = {
    guests: [
      { id: "g1", name: "A", groupId: null },
      { id: "g2", name: "B", groupId: null },
      { id: "g3", name: "C", groupId: null },
    ],
    tables: [{ id: "t1", capacity: 2, fixed: false, fixedGuestIds: [] }],
    constraints: [],
  };
  const result = solveSeating(input);
  expect(result.warnings.some((w) => w.kind === "insufficient-capacity")).toBe(true);
});

it("warns when a together pair cannot share a table", () => {
  const input: SeatingInput = {
    guests: [
      { id: "g1", name: "A", groupId: null },
      { id: "g2", name: "B", groupId: null },
    ],
    tables: [
      { id: "t1", capacity: 1, fixed: false, fixedGuestIds: [] },
      { id: "t2", capacity: 1, fixed: false, fixedGuestIds: [] },
    ],
    constraints: [{ type: "together", a: "g1", b: "g2" }],
  };
  const result = solveSeating(input);
  expect(result.warnings.some((w) => w.kind === "together-split")).toBe(true);
});

it("respects fixed tables without moving pre-seated guests", () => {
  const input: SeatingInput = {
    guests: [{ id: "g1", name: "A", groupId: null }],
    tables: [
      { id: "head", capacity: 4, fixed: true, fixedGuestIds: ["bride", "groom"] },
      { id: "t2", capacity: 4, fixed: false, fixedGuestIds: [] },
    ],
    constraints: [],
  };
  const result = solveSeating(input);
  // pre-seated guests are not part of the solver assignment
  expect(result.assignment["bride"]).toBeUndefined();
  expect(isHardValid(result.assignment, input)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- solve`
Expected: FAIL — cannot find module `./solve`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/seating/solve.ts`:

```ts
import type { Assignment, SeatingInput, SeatingResult, Warning } from "./types";
import { placeGreedy } from "./place";
import { refine } from "./refine";
import { scoreAssignment } from "./score";
import { separationViolations } from "./constraints";

function totalRemainingCapacity(input: SeatingInput): number {
  return input.tables.reduce(
    (sum, t) => sum + (t.capacity - t.fixedGuestIds.length),
    0
  );
}

function collectWarnings(assignment: Assignment, input: SeatingInput): Warning[] {
  const warnings: Warning[] = [];

  const placed = Object.keys(assignment).length;
  if (input.guests.length > totalRemainingCapacity(input)) {
    warnings.push({
      kind: "insufficient-capacity",
      message: `Not enough seats: ${input.guests.length} guests but ${totalRemainingCapacity(
        input
      )} free places. ${input.guests.length - placed} guest(s) unseated.`,
    });
  }

  for (const c of separationViolations(assignment, input.constraints)) {
    warnings.push({
      kind: "separate-unsatisfiable",
      message: `Could not separate ${c.a} and ${c.b}; they share a table.`,
    });
  }

  for (const c of input.constraints) {
    if (c.type !== "together") continue;
    if (
      assignment[c.a] === undefined ||
      assignment[c.b] === undefined ||
      assignment[c.a] !== assignment[c.b]
    ) {
      warnings.push({
        kind: "together-split",
        message: `Wanted ${c.a} and ${c.b} together, but they are apart.`,
      });
    }
  }

  const tablesByGroup = new Map<string, Set<string>>();
  for (const g of input.guests) {
    if (g.groupId == null) continue;
    const tid = assignment[g.id];
    if (tid === undefined) continue;
    if (!tablesByGroup.has(g.groupId)) tablesByGroup.set(g.groupId, new Set());
    tablesByGroup.get(g.groupId)!.add(tid);
  }
  for (const [groupId, set] of tablesByGroup) {
    if (set.size > 1) {
      warnings.push({
        kind: "group-split",
        message: `Group ${groupId} is split across ${set.size} tables.`,
      });
    }
  }

  return warnings;
}

export function solveSeating(input: SeatingInput): SeatingResult {
  const initial = placeGreedy(input);
  const assignment = refine(initial, input);
  return {
    assignment,
    score: scoreAssignment(assignment, input),
    warnings: collectWarnings(assignment, input),
  };
}
```

- [ ] **Step 4: Create the barrel export**

Create `src/lib/seating/index.ts`:

```ts
export * from "./types";
export * from "./constraints";
export * from "./score";
export { placeGreedy } from "./place";
export { refine } from "./refine";
export { solveSeating } from "./solve";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- solve`
Expected: PASS — 4 tests.

- [ ] **Step 6: Run the full suite**

Run: `npm run test`
Expected: PASS — all tests across the engine (types, constraints, score, place, refine, solve) plus smoke.

- [ ] **Step 7: Commit**

```bash
git add src/lib/seating/solve.ts src/lib/seating/index.ts src/lib/seating/solve.test.ts
git commit -m "feat(seating): solver orchestration + warnings; public barrel export"
```

---

## Definition of Done

- `npm run test` passes with the full engine suite green.
- `npx prisma migrate dev` produces a working local SQLite DB from the schema.
- `solveSeating(input)` returns a hard-valid assignment for feasible inputs and clear warnings for infeasible ones, deterministically.
- No UI, no network, no cloud — everything runs locally.

## What comes next (future plans, not this one)

- **Plan 2:** Floor-plan editor (admin) — react-konva canvas, image upload, scale calibration, table placement, persisted via Prisma.
- **Plan 3:** Guest import + grouping — Excel parsing, editable table, drag-to-group UI.
- **Plan 4:** Plan view + manual editing — render tables on the floor plan, drag guests, real-time re-validation using this engine.
- **Plan 5:** PDF export — html2canvas + jsPDF of the floor-plan view + per-table guest list.
