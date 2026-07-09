# Prioritized Multi-Group Membership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a guest belong to several groups in a **priority order** (primary first). The seating engine tries to seat the guest with their highest-priority group; if that group can't accommodate them, it falls back to the next-priority group — the couple sets the priority.

**Architecture:** Keep `Guest.groupId` as the **primary** group (all existing import/board/color code keeps working). Add an ordered list of **extra** groups (JSON column). The engine gains an ordered `groupIds` per guest and its group-cohesion score becomes a **priority-weighted per-guest reward** (being with a higher-priority group scores more), so the solver naturally prefers the primary and falls back to secondaries. A per-guest UI edits the extra groups + order. Testable logic (schema/engine/mapping/data/API) is TDD'd; UI is verified by driving the app.

**Tech Stack:** Next.js (App Router), Prisma/SQLite, the pure seating engine, Vitest.

## Global Constraints

- **Local-first only.** No cloud/network.
- **Builds on Plans 1-6.** One migration adds `Guest.extraGroups String?` (JSON array of groupIds, in priority order AFTER the primary `groupId`). Primary group stays `Guest.groupId` — do NOT break existing import/board/color/mapping that uses it.
- **Priority order** for a guest = `[groupId, ...JSON.parse(extraGroups ?? "[]")]` filtered to non-null, de-duplicated, first-seen order. Index 0 = highest priority.
- **Engine group score becomes a priority-weighted reward.** A guest earns the weight of the **highest-priority** group whose member they share a table with. `GROUP_WEIGHTS = [10, 5, 2]` (priority 0,1,2; index ≥3 → 2). Backward compatible: a guest with only a primary group behaves like "reward when seated with a group member."
- **Engine stays pure**; `place.ts` greedy still bundles by primary `groupId` (unchanged) — only the SCORE changes. **Existing score/solve tests that assert exact numbers will be updated** to the new group scoring (documented per task).
- **DB tests use the throwaway test DB; TDD for logic/data/API; UI verified by driving the app; tsc + build clean.**

---

### Task 1: Schema `Guest.extraGroups` + data-access

**Files:**
- Modify: `prisma/schema.prisma` (`extraGroups String?` on Guest) + migration
- Modify: `src/lib/db/guests.ts` (`setGuestGroups(guestId, primaryGroupId, extraGroupIds)`)
- Test: `src/lib/db/guests.test.ts`

**Interfaces:**
- `Guest.extraGroups String?` — JSON array of groupId strings (priority order after the primary). Null/absent = no extra groups.
- `setGuestGroups(guestId: string, primaryGroupId: string | null, extraGroupIds: string[]): Promise<Guest>` — sets `groupId = primaryGroupId` and `extraGroups = JSON.stringify(extraGroupIds)` (or null when empty) in one update.

- [ ] **Step 1: Add field + migrate**

Add to `model Guest`: `extraGroups String?`. Run `npx prisma migrate dev --name add_guest_extra_groups` (stop `next dev` first if it locks the Prisma DLL; restart isn't required).

- [ ] **Step 2: Write failing test**

Add to `src/lib/db/guests.test.ts`:

```ts
import { setGuestGroups } from "./guests";

it("sets a guest's primary + ordered extra groups", async () => {
  const w = await createWedding({ couple: "Multi" });
  const g = await prisma.guest.create({ data: { weddingId: w.id, name: "Ana" } });
  const updated = await setGuestGroups(g.id, "grpFam", ["grpFac", "grpTrab"]);
  expect(updated.groupId).toBe("grpFam");
  expect(JSON.parse(updated.extraGroups!)).toEqual(["grpFac", "grpTrab"]);
  const cleared = await setGuestGroups(g.id, "grpFam", []);
  expect(cleared.extraGroups).toBeNull();
});
```

- [ ] **Step 3: Run to fail → implement → pass**

Add to `src/lib/db/guests.ts`:

```ts
export function setGuestGroups(
  guestId: string,
  primaryGroupId: string | null,
  extraGroupIds: string[]
): Promise<Guest> {
  return prisma.guest.update({
    where: { id: guestId },
    data: {
      groupId: primaryGroupId,
      extraGroups: extraGroupIds.length ? JSON.stringify(extraGroupIds) : null,
    },
  });
}
```

Run: `npm run test -- guests` then `npm run test` then `npx tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/db/guests.ts src/lib/db/guests.test.ts
git commit -m "feat(guests): ordered extra-group memberships (extraGroups JSON)"
```

---

### Task 2: Engine — ordered `groupIds` + priority-weighted group reward

**Files:**
- Modify: `src/lib/seating/types.ts` (Guest gains optional `groupIds?: string[]`)
- Modify: `src/lib/seating/score.ts` (replace `groupSpread` penalty with `groupReward`)
- Modify: `src/lib/seating/score.test.ts` and `src/lib/seating/solve.test.ts` (update expected group-scoring numbers)
- Modify: `src/lib/seating/index.ts` if the exported surface changes

**Interfaces:**
- `Guest` gains optional `groupIds?: string[]` — ordered by priority (index 0 = primary). When present it OVERRIDES `groupId` for scoring; when absent, scoring uses `groupId ? [groupId] : []` (backward compatible).
- `GROUP_WEIGHTS = [10, 5, 2]` exported const; priority index ≥ 3 uses the last weight (2).
- `groupsOf(guest): string[]` — `guest.groupIds ?? (guest.groupId != null ? [guest.groupId] : [])`, de-duplicated, first-seen order.
- `groupReward(assignment, guests): number` — for each guest, the reward is the weight of the HIGHEST-priority group (lowest index in `groupsOf(g)`) for which some OTHER guest at the same table also lists that group in their `groupsOf`; 0 if none. Sum over guests.
- `scoreAssignment = satisfiedTogether*WEIGHTS.together + groupReward - fillSpread*WEIGHTS.balance`. (Group term is now ADDED, not subtracted. `WEIGHTS.together = 100`, `WEIGHTS.balance = 1`; the old `WEIGHTS.groupSpread` is removed.)

- [ ] **Step 1: Write the failing tests**

Replace the group-related assertions in `src/lib/seating/score.test.ts` with the new model and add a priority test:

```ts
import { groupReward, GROUP_WEIGHTS, scoreAssignment } from "./score";

it("groupReward rewards seating a guest with a same-group member", () => {
  const guests = [
    { id: "g1", name: "A", groupId: "fam" },
    { id: "g2", name: "B", groupId: "fam" },
  ];
  // both at t1 → each earns primary weight
  expect(groupReward({ g1: "t1", g2: "t1" }, guests)).toBe(GROUP_WEIGHTS[0] * 2);
  // split → neither has a same-group tablemate → 0
  expect(groupReward({ g1: "t1", g2: "t2" }, guests)).toBe(0);
});

it("groupReward honors priority order via groupIds", () => {
  // g1's primary is "fam" (with nobody), secondary "fac" (with g2)
  const guests = [
    { id: "g1", name: "A", groupId: "fam", groupIds: ["fam", "fac"] },
    { id: "g2", name: "B", groupId: "fac", groupIds: ["fac"] },
  ];
  // both at t1: g1 shares "fac" with g2 → secondary weight; g2 shares "fac" with g1 → primary weight
  expect(groupReward({ g1: "t1", g2: "t1" }, guests)).toBe(GROUP_WEIGHTS[1] + GROUP_WEIGHTS[0]);
});
```

Update `solve.test.ts`'s existing group-split expectations only if they assert exact scores (kinds/warnings are unchanged — group-split still fires when a group spans >1 table using primary groupId membership; keep that behavior).

- [ ] **Step 2: Run to fail**

Run: `npm run test -- score`
Expected: FAIL (groupReward/GROUP_WEIGHTS missing, old groupSpread gone).

- [ ] **Step 3: Implement**

In `src/lib/seating/score.ts`:
- Export `GROUP_WEIGHTS = [10, 5, 2] as const` and a helper `groupsOf(guest)`.
- Implement `groupReward(assignment, guests)`: build `tableOf` from assignment; for each guest, iterate `groupsOf(g)` in order, and for the first (highest-priority) group `gi` such that some other guest `h` with `assignment[h] === assignment[g]` has `gi` in `groupsOf(h)`, award `GROUP_WEIGHTS[Math.min(index, GROUP_WEIGHTS.length - 1)]`; else 0.
- Update `scoreAssignment` to `satisfiedTogether*WEIGHTS.together + groupReward(assignment, input.guests) - fillSpread*WEIGHTS.balance`. Remove `groupSpread` and `WEIGHTS.groupSpread`.
- Keep `satisfiedTogether` and `fillSpread` as-is.

Also update `src/lib/seating/solve.ts` group-split detection: it currently groups by `guest.groupId`. Keep it using the PRIMARY `groupId` (a group is "split" when its primary members span >1 table). Do NOT change the warning behavior. (Refinement in `refine.ts` already just maximizes `scoreAssignment`, so it automatically optimizes the new reward — no change needed there.)

- [ ] **Step 4: Run to pass + full suite + tsc**

Run: `npm run test -- score solve place refine` then `npm run test` then `npx tsc --noEmit`
Expected: green (update any other test that asserted the removed `groupSpread`/`WEIGHTS.groupSpread`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seating
git commit -m "feat(seating): priority-weighted multi-group reward (groupIds) replaces groupSpread"
```

---

### Task 3: Mapping + API for ordered groups

**Files:**
- Modify: `src/lib/plan/buildSeatingInput.ts` (`GuestRowInput` gains `extraGroups: string | null`; build `groupIds`)
- Modify: `src/lib/plan/buildSeatingInput.test.ts`
- Create: `src/app/api/guests/[id]/groups/route.ts` (PUT set primary + extra groups)
- Test: `src/lib/plan/buildSeatingInput.test.ts` (+ maybe a small route test)

**Interfaces:**
- `GuestRowInput` gains `extraGroups: string | null`. `buildSeatingInput` sets each engine guest's `groupIds = [groupId, ...JSON.parse(extraGroups ?? "[]")]` filtered non-null + de-duplicated (first-seen); still keeps `groupId` (primary) for `place.ts` bundling and warnings. Fixed-occupant logic unchanged.
- `PUT /api/guests/[id]/groups` body `{ primaryGroupId: string | null, extraGroupIds: string[] }` → `setGuestGroups`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/plan/buildSeatingInput.test.ts`:

```ts
it("builds ordered groupIds from primary + extraGroups JSON", () => {
  const input = buildSeatingInput(
    [{ id: "g1", name: "A", groupId: "fam", assignedTableId: null, locked: false, extraGroups: JSON.stringify(["fac", "trab"]) }],
    [],
    []
  );
  expect(input.guests[0].groupIds).toEqual(["fam", "fac", "trab"]);
});

it("groupIds is [groupId] when extraGroups is null", () => {
  const input = buildSeatingInput(
    [{ id: "g1", name: "A", groupId: "fam", assignedTableId: null, locked: false, extraGroups: null }],
    [],
    []
  );
  expect(input.guests[0].groupIds).toEqual(["fam"]);
});
```

(Update the other existing buildSeatingInput tests to include `extraGroups: null` on their guest rows so they compile.)

- [ ] **Step 2: Run to fail → implement → pass**

- Add `extraGroups: string | null` to `GuestRowInput`.
- In the movable-guest mapping, set `groupIds` = de-duped `[groupId, ...JSON.parse(extraGroups ?? "[]")]` with nulls removed; keep the existing `groupId`, `name`, `id`.
- Create `PUT /api/guests/[id]/groups` calling `setGuestGroups(id, primaryGroupId, extraGroupIds)`; validate `extraGroupIds` is a string array (400 otherwise).

Run: `npm run test -- buildSeatingInput` then `npm run test` then `npx tsc --noEmit`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/plan/buildSeatingInput.ts src/lib/plan/buildSeatingInput.test.ts "src/app/api/guests/[id]/groups"
git commit -m "feat(plan): map ordered groupIds into engine input + PUT guest groups endpoint"
```

---

### Task 4: UI — per-guest group priority editor

**Files:**
- Create: `src/components/guests/GuestGroupsEditor.tsx` (edit a guest's primary + ordered extra groups)
- Modify: `src/components/guests/GroupBoard.tsx` or the wedding page to open the editor per guest
- Modify: `src/components/guests/useGuestBoard.ts` (`setGuestGroups(guestId, primary, extras)` calling the PUT)

**Interfaces:**
- Consumes: `PUT /api/guests/[id]/groups`, the wedding's groups list.
- Produces: from the guest board, a guest can be given additional groups with an explicit priority order (primary + ordered extras). The board still shows the primary group column (unchanged); the editor sets extras/order.

- [ ] **Step 1: Editor component** — `GuestGroupsEditor.tsx` (`"use client"`): given a guest + the groups list, shows the primary group (a select) and an ordered list of extra groups with add / remove / move-up-down (priority). Save calls `setGuestGroups(guestId, primaryGroupId, extraGroupIds)`.

- [ ] **Step 2: Wire it** — add an "editar grupos" affordance on each guest card (or a small panel) that opens the editor; `useGuestBoard.setGuestGroups` PUTs and refreshes.

- [ ] **Step 3: Verify by driving the app (webapp-testing skill)** (dev server on :3000; start if down)
   1. Give a guest a primary + two extra groups in a chosen order; reload → order persists (`GET .../guests` shows extraGroups JSON).
   2. On the plan, make the primary group's table full so the guest can't sit with the primary; Generate → confirm the guest is seated with a SECONDARY group's members (priority fallback) rather than alone, and the plan still respects hard constraints. (This exercises the new reward.)
   Screenshot. Report what was verified vs not.

- [ ] **Step 4: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test`.

```bash
git add src/components/guests
git commit -m "feat(guests): per-guest group priority editor"
```

---

## Definition of Done

- `npm run test` green; `npx tsc --noEmit` + `npm run build` clean.
- In the running app: a guest can belong to multiple groups in a priority order; **Generate** seats them with their highest-priority group when possible and falls back to a lower-priority group's table when the primary can't fit — instead of leaving them isolated.

## What comes next

- **Plan 8:** venue table catalog (types, min/max, dimensions) + layout templates by guest-count + min spacing + edit table config before generating.
- **Plan 9:** floor-plan walls/boundaries (visual guide + out-of-bounds warning) + per-table chair rendering (colored by attribute).
- **Plan 10:** PDF export with color coding + legend + per-table list.
