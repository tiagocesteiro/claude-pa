# Usability & Legibility Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the tool pleasant and legible to actually use, from user testing feedback: readable guest/table info, friendly warnings (group names not IDs), a per-table list, easy couples, manual guest add, persistent lock (guest/table) that Generate respects, and easy guest swaps.

**Architecture:** A small schema addition (`Guest.locked`) plus data-access/endpoints for manual add + lock; an engine `Warning` enrichment so the UI can render group/guest **names** instead of internal IDs; the generate mapping honours locks (locked guests become fixed occupants); and plan-view UI improvements (legible chips, per-table list, swap, lock toggles). Testable logic (schema/data/engine/mapping/endpoints) is TDD'd; UI is verified by driving the app.

**Tech Stack:** Next.js (App Router), Prisma/SQLite, the pure seating engine, react-konva + native DnD, Vitest.

## Global Constraints

- **Local-first only.** No cloud/network.
- **Builds on Plans 1-4.** Reuse existing engine, mapping (`buildSeatingInput`), plan view, and data-access. This plan MAY add one schema field (`Guest.locked`) via a Prisma migration — the only schema change allowed here.
- **Lock is persistent.** A locked guest and a `fixed` table are respected by **Generate** (never moved/re-seated) and survive reload. "Lock a guest" = `Guest.locked = true`; "lock a table" = `Table.fixed = true`.
- **Warnings show human names, not IDs.** The engine `Warning` carries structured `groupId`/`guestIds`; the UI resolves them to names.
- **Couples** are created as a `together` constraint via a "Casal" button in the guest UI (two selected guests).
- **Engine + mapping stay pure.** DB tests use the throwaway test DB. TDD for every logic/data/API task; UI verified by driving the app. `npx tsc --noEmit` and `npm run build` must stay clean.

---

### Task 1: Schema `Guest.locked` + manual-add + lock data-access & endpoints

**Files:**
- Modify: `prisma/schema.prisma` (add `locked Boolean @default(false)` to `Guest`)
- Modify: `src/lib/db/guests.ts` (add `createGuest`, `setGuestLocked`)
- Create/Modify: `src/app/api/weddings/[id]/guests/route.ts` (add POST create) — file exists with GET; add POST
- Modify: `src/app/api/guests/[id]/route.ts` (PATCH also accepts optional `locked`)
- Create: `src/app/api/tables/[id]/route.ts` (PATCH `fixed`)
- Test: `src/lib/db/guests.test.ts` (extend), `src/app/api/weddings/[id]/guests/route.test.ts`

**Interfaces:**
- `createGuest(input: { weddingId: string; name: string; groupId?: string | null }): Promise<Guest>`
- `setGuestLocked(guestId: string, locked: boolean): Promise<Guest>`
- `POST /api/weddings/[id]/guests` body `{ name, groupId? }` → 201 guest; 400 if no name.
- `PATCH /api/guests/[id]` body may include `groupId` (existing) and/or `locked` (new boolean).
- `PATCH /api/tables/[id]` body `{ fixed: boolean }` → updates the table.

- [ ] **Step 1: Add the schema field + migrate**

In `prisma/schema.prisma`, add to `model Guest`:

```prisma
  locked          Boolean  @default(false)
```

Run:

```bash
cd "projects/wedding-seating"
npx prisma migrate dev --name add_guest_locked
```

Expected: migration created + applied to `prisma/dev.db`, client regenerated.

- [ ] **Step 2: Write failing tests**

Extend `src/lib/db/guests.test.ts`:

```ts
import { createGuest, setGuestLocked } from "./guests";

it("creates a guest manually and toggles its lock", async () => {
  const w = await createWedding({ couple: "Manual Add" });
  const g = await createGuest({ weddingId: w.id, name: "Zé Manual" });
  expect(g.name).toBe("Zé Manual");
  expect(g.locked).toBe(false);
  const locked = await setGuestLocked(g.id, true);
  expect(locked.locked).toBe(true);
});
```

Create `src/app/api/weddings/[id]/guests/route.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { GET, POST } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { prisma } from "@/lib/db/client";

it("POST creates a guest; GET lists it", async () => {
  const w = await createWedding({ couple: "Guest POST" });
  const res = await POST(
    new Request("http://x/guests", { method: "POST", body: JSON.stringify({ name: "Nova Pessoa" }) }),
    { params: Promise.resolve({ id: w.id }) }
  );
  expect(res.status).toBe(201);
  const list = await (await GET(new Request("http://x/guests"), { params: Promise.resolve({ id: w.id }) })).json();
  expect(list.some((g: { name: string }) => g.name === "Nova Pessoa")).toBe(true);
});

it("POST rejects missing name", async () => {
  const w = await createWedding({ couple: "Guest 400" });
  const res = await POST(new Request("http://x/guests", { method: "POST", body: "{}" }), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -- guests`
Expected: FAIL — `createGuest`/`setGuestLocked`/`POST` missing.

- [ ] **Step 4: Implement data-access**

Append to `src/lib/db/guests.ts`:

```ts
export function createGuest(input: { weddingId: string; name: string; groupId?: string | null }): Promise<Guest> {
  return prisma.guest.create({
    data: { weddingId: input.weddingId, name: input.name, groupId: input.groupId ?? null },
  });
}

export function setGuestLocked(guestId: string, locked: boolean): Promise<Guest> {
  return prisma.guest.update({ where: { id: guestId }, data: { locked } });
}
```

- [ ] **Step 5: Implement endpoints**

In `src/app/api/weddings/[id]/guests/route.ts`, keep GET and add:

```ts
import { createGuest } from "@/lib/db/guests";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!b?.name || typeof b.name !== "string") {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const guest = await createGuest({ weddingId: id, name: b.name, groupId: b.groupId ?? null });
  return NextResponse.json(guest, { status: 201 });
}
```

Update `src/app/api/guests/[id]/route.ts` PATCH to also handle `locked` (keep the existing groupId behaviour):

```ts
import { assignGuestGroup, setGuestLocked } from "@/lib/db/guests";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  let updated;
  if ("groupId" in b) updated = await assignGuestGroup(id, b.groupId);
  if (typeof b.locked === "boolean") updated = await setGuestLocked(id, b.locked);
  if (!updated) return NextResponse.json({ error: "groupId or locked required" }, { status: 400 });
  return NextResponse.json(updated);
}
```

Create `src/app/api/tables/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (typeof b?.fixed !== "boolean") return NextResponse.json({ error: "fixed (boolean) required" }, { status: 400 });
  const table = await prisma.table.update({ where: { id }, data: { fixed: b.fixed } });
  return NextResponse.json(table);
}
```

- [ ] **Step 6: Run tests + gates**

Run: `npm run test` then `npx tsc --noEmit`
Expected: green, 0 errors.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/db/guests.ts "src/app/api/weddings/[id]/guests" "src/app/api/guests/[id]" "src/app/api/tables" src/lib/db/guests.test.ts
git commit -m "feat(guests): Guest.locked + manual add + lock/table-fixed endpoints"
```

---

### Task 2: Enrich engine `Warning` with structured names

**Files:**
- Modify: `src/lib/seating/types.ts` (add optional fields to `Warning`)
- Modify: `src/lib/seating/solve.ts` (`collectWarnings` sets them)
- Modify: `src/lib/seating/solve.test.ts` (assert the new fields)

**Interfaces:**
- `Warning = { kind: WarningKind; message: string; groupId?: string; guestIds?: [string, string] }` — `group-split` sets `groupId`; `together-split`/`separate-unsatisfiable` set `guestIds` (the two guest ids). Existing `kind`/`message` unchanged so nothing else breaks.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/seating/solve.test.ts`:

```ts
it("group-split warning carries the groupId; together-split carries guestIds", () => {
  const groupSplit: SeatingInput = {
    guests: [
      { id: "g1", name: "A", groupId: "fam" },
      { id: "g2", name: "B", groupId: "fam" },
    ],
    tables: [
      { id: "t1", capacity: 1, fixed: false, fixedGuestIds: [] },
      { id: "t2", capacity: 1, fixed: false, fixedGuestIds: [] },
    ],
    constraints: [{ type: "together", a: "g1", b: "g2" }],
  };
  const res = solveSeating(groupSplit);
  const gs = res.warnings.find((w) => w.kind === "group-split");
  expect(gs?.groupId).toBe("fam");
  const ts = res.warnings.find((w) => w.kind === "together-split");
  expect(ts?.guestIds?.sort()).toEqual(["g1", "g2"]);
});
```

- [ ] **Step 2: Run to fail**

Run: `npm run test -- solve`
Expected: FAIL — `groupId`/`guestIds` undefined on warnings.

- [ ] **Step 3: Implement**

In `src/lib/seating/types.ts`, extend `Warning`:

```ts
export interface Warning {
  kind: WarningKind;
  message: string;
  groupId?: string;
  guestIds?: [string, string];
}
```

In `src/lib/seating/solve.ts` `collectWarnings`, add the structured fields where each warning is pushed:
- `together-split` and `separate-unsatisfiable`: add `guestIds: [c.a, c.b]`.
- `group-split`: add `groupId` (the group's id).

(Keep the existing `message` strings.)

- [ ] **Step 4: Run to pass + full suite + tsc**

Run: `npm run test -- solve` then `npm run test` then `npx tsc --noEmit`
Expected: green, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seating/types.ts src/lib/seating/solve.ts src/lib/seating/solve.test.ts
git commit -m "feat(seating): enrich warnings with groupId/guestIds for name resolution"
```

---

### Task 3: Generate mapping honours locked guests

**Files:**
- Modify: `src/lib/plan/buildSeatingInput.ts` (`GuestRowInput` gains `locked`; locked guests with a table become fixed occupants)
- Modify: `src/lib/plan/buildSeatingInput.test.ts`
- Modify: `src/lib/plan/validate.ts` (exclude locked-at-any-table from the movable assignment consistently — mirror the fixed logic)

**Interfaces:**
- `GuestRowInput` gains `locked: boolean`.
- In `buildSeatingInput`, a guest is a **fixed occupant of a table** when it has an `assignedTableId` AND (`the table is fixed` OR `the guest is locked`). Such guests populate `fixedGuestIds` and are removed from the movable pool. Everything else unchanged.
- `planViolations` keeps excluding fixed-occupant guests (now: fixed-table OR locked) from the assignment map to avoid double-counting.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/plan/buildSeatingInput.test.ts`:

```ts
it("treats a LOCKED guest at a non-fixed table as a fixed occupant", () => {
  const input = buildSeatingInput(
    [
      { id: "g1", name: "A", groupId: null, assignedTableId: "t1", locked: true },
      { id: "g2", name: "B", groupId: null, assignedTableId: null, locked: false },
    ],
    [{ id: "t1", capacity: 8, fixed: false }],
    []
  );
  expect(input.tables[0].fixedGuestIds).toEqual(["g1"]);
  expect(input.guests.map((g) => g.id)).toEqual(["g2"]); // g1 pinned, not movable
});
```

(Update the other existing `buildSeatingInput` tests to include `locked: false` on their guest rows so they still compile/pass.)

- [ ] **Step 2: Run to fail**

Run: `npm run test -- buildSeatingInput`
Expected: FAIL (type error / g1 still movable).

- [ ] **Step 3: Implement**

In `src/lib/plan/buildSeatingInput.ts`:
- Add `locked: boolean` to `GuestRowInput`.
- Change the fixed-occupant test: a guest is fixed when `g.assignedTableId && (fixedTableIds.has(g.assignedTableId) || g.locked)`.

Update `src/lib/plan/validate.ts` `planViolations` to build the movable assignment excluding guests that are fixed occupants under the SAME rule (locked-with-table OR at a fixed table), so occupancy isn't double-counted.

- [ ] **Step 4: Run to pass + full suite + tsc**

Run: `npm run test -- buildSeatingInput validate` then `npm run test` then `npx tsc --noEmit`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plan/buildSeatingInput.ts src/lib/plan/buildSeatingInput.test.ts src/lib/plan/validate.ts
git commit -m "feat(plan): Generate respects locked guests as fixed occupants"
```

---

### Task 4: Guest management UI — manual add + "Casal" button

**Files:**
- Modify: `src/app/admin/wedding/[id]/page.tsx` and/or `src/components/guests/*` (add a manual-add form + a "Casal" action)
- Create: `src/components/guests/AddGuestForm.tsx`
- Create/Modify: a couples affordance (e.g. in `ConstraintsPanel.tsx` or a new `CoupleButton` in the guest list)
- Modify: `src/components/guests/useGuestBoard.ts` (add `addGuest(name, groupId?)`)

**Interfaces:**
- Consumes: `POST /api/weddings/[id]/guests`, `POST /api/weddings/[id]/constraints`.
- Produces: a form to add a guest by name (optional group) that refreshes the board; and a way to pick two guests and mark them a couple → creates a `together` constraint, then refreshes the constraints list.

- [ ] **Step 1: Manual add** — `AddGuestForm.tsx` (`"use client"`): a name input (+ optional group select from the wedding's groups) and an "Adicionar convidado" button → `POST /api/weddings/[id]/guests` → on success call `onAdded()`/refresh. `useGuestBoard.addGuest` wraps the POST + refresh. Mount it above/beside the GroupBoard. Surface errors like the other panels (check `res.ok`).

- [ ] **Step 2: Couple button** — in the guest UI, allow selecting two guests (e.g. two `<select>`s, or a "marcar casal" mode) and a "São casal" button that `POST`s a `together` constraint for the pair, then refreshes the constraints list. Disable when the two are the same. Reuse `ConstraintsPanel`'s pattern; you may add the button INTO `ConstraintsPanel` as a shortcut that pre-sets type=together, or a dedicated small control. Show a confirmation/among the constraints list.

- [ ] **Step 3: Verify by driving the app (webapp-testing skill)** (dev server may be on http://localhost:3000)
   1. Add a guest manually → appears in the board (in the chosen group or "Sem grupo"); persists on reload.
   2. Mark two guests a couple → a `together` constraint appears in the list with correct names; persists.
   Screenshot. Report what was verified vs not.

- [ ] **Step 4: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test` (all green).

```bash
git add src/components/guests "src/app/admin/wedding/[id]/page.tsx"
git commit -m "feat(guests): manual add guest + mark-couple shortcut"
```

---

### Task 5: Plan legibility — readable tables, per-table list, named warnings

**Files:**
- Modify: `src/components/plan/PlanCanvas.tsx` (clearer occupancy + guest chips)
- Create: `src/components/plan/TableList.tsx` (per-table list below the plan: table name/number, occupancy, guest names)
- Modify: `src/app/admin/wedding/[id]/plan/page.tsx` (mount TableList; resolve warning names)
- Modify: `src/components/plan/usePlan.ts` (fetch groups for name resolution; expose them)

**Interfaces:**
- Consumes: the plan data + `GET /api/weddings/[id]/groups` for group-name resolution; the enriched engine `Warning` (Task 2).
- Produces: a legible plan (occupancy `n/capacity`, clear guest name chips, over-capacity red) and a `TableList` under the canvas showing each table with its seated guests by name. Warnings render **names**: `group-split` → group name (via groups list + `warning.groupId`); `together-split`/`separate-unsatisfiable` → guest names (via `warning.guestIds`).

- [ ] **Step 1: Warning name resolution** — in `plan/page.tsx`, given the groups list and the wedding's guests, render each engine warning using names: for `group-split` show the group's `name` (look up `warning.groupId`); for guest-pair warnings show both guest names (look up `warning.guestIds`). Fall back to the raw `message` if a lookup misses.

- [ ] **Step 2: TableList** — `TableList.tsx` (`"use client"`): a simple, printable list/table under the canvas; one row per table (a stable label like "Mesa 1", or the table id short) with `occupancy/capacity` and the comma-separated guest names seated there; an "unassigned" row listing unseated guests. This directly answers "quero uma tabela com as mesas e os seus convidados".

- [ ] **Step 3: Canvas legibility** — improve `PlanCanvas` so occupancy and names are clearly readable (larger chips/text, clear `n/capacity`, over-capacity tables red). Keep the natural-pixel/displayScale rendering.

- [ ] **Step 4: Verify by driving the app** — after Generate: confirm each table shows a readable occupancy + names; the TableList below matches; a `group-split` warning now shows the **group name** (not an ID); a separation warning shows guest names. Screenshot. Report.

- [ ] **Step 5: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test`.

```bash
git add src/components/plan "src/app/admin/wedding/[id]/plan"
git commit -m "feat(plan): legible tables + per-table list + named warnings"
```

---

### Task 6: Plan interactions — lock (guest/table) + easy swap

**Files:**
- Modify: `src/components/plan/PlanCanvas.tsx` + `src/components/plan/UnassignedTray.tsx` (lock toggles; swap on guest-onto-guest drop)
- Modify: `src/components/plan/usePlan.ts` (`toggleGuestLock`, `toggleTableFixed`, `swap`)

**Interfaces:**
- Consumes: `PATCH /api/guests/[id]` (`{locked}`), `PATCH /api/tables/[id]` (`{fixed}`), `PUT /api/weddings/[id]/assignment` (for swaps).
- Produces:
  - A **lock toggle** on each seated guest chip (🔒) → `PATCH {locked}`; locked guests render with a lock badge and are excluded from Generate (Task 3). A **lock toggle** on each table → `PATCH {fixed}`; fixed tables render distinctly.
  - **Swap**: dragging guest A onto guest B (a guest chip is also a drop target) exchanges their `assignedTableId` via one `PUT` with both updates; live violations recompute. (Dragging onto empty table space keeps the existing move behaviour.)

- [ ] **Step 1: Lock toggles** — add a small lock button to each seated-guest chip and to each table; wire to `toggleGuestLock`/`toggleTableFixed` in `usePlan` (optimistic + PATCH + refresh/recompute). Render locked guests + fixed tables with a clear visual (lock icon / distinct border). Confirm a locked guest keeps its seat through **Generate** (Task 3 makes the engine respect it).

- [ ] **Step 2: Swap** — make guest chips drop targets: on dropping guest A onto guest B, `swap(A,B)` sets A→B.table and B→A.table via a single `PUT /assignment` with both entries, optimistic update, recompute violations. Dropping onto empty table area retains the move-to-table behaviour from Plan 4.

- [ ] **Step 3: Verify by driving the app**
   1. Lock a seated guest, run Generate, confirm they stay put while others re-seat. Lock a table, Generate, confirm its occupants stay.
   2. Swap two guests on different tables (drag A onto B); confirm they exchange tables and it persists on reload.
   Screenshot the lock badges + a completed swap. Report.

- [ ] **Step 4: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test`.

```bash
git add src/components/plan
git commit -m "feat(plan): persistent lock (guest/table) + easy guest swap"
```

---

## Definition of Done

- `npm run test` green; `npx tsc --noEmit` + `npm run build` clean.
- In the running app: guest/group names are clearly visible; warnings read with **names** ("Grupo Família Noiva dividido por 2 mesas"), not IDs; there's a **per-table list** under the plan; the couple can **add a guest by hand**, **mark two guests a couple**, **lock** a guest or table so **Generate** leaves them, and **swap** two guests by dragging one onto the other — all persisted.

## What comes next

- **Plan 6:** PDF export with color-coded guests.
- **Later batches (from feedback):** guest attributes (adulto/criança/idoso, alergias, género) + color filters; multi-group membership; venue table catalog (types, min/max, dimensions) + layout templates + min spacing; wall/boundary masking; per-seat (chair) rendering.
