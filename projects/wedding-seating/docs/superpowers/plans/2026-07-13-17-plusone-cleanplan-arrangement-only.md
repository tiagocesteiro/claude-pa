# Plus-One Pairing, Dots-Only Plan, Arrangement-Only Couple View — Implementation Plan

**Goal:** Three refinements from the owner:
1. **Plus-one column** in the guest table: a dropdown of all guests; picking guest B for guest A pairs them **symmetrically** ("cross reference") and removes both from every other guest's plus-one dropdown (each guest can be paired at most once).
2. **Vista do casal** shows only the **table arrangement** (no seated guests) for every moment, including the dinner.
3. **Sitting plan** (Plano de mesas): each table shows only the **colored dots** (chairs) per guest by default; the guest **names** appear only when you click that table.

**Builds on:** Plans 1-16. Additive schema (self-relation on Guest). Seating engine unchanged.

## Global Constraints
- Local-first, additive migration. `tsc`/`build`/`test` stay green. UI verified by driving the app.
- cwd hygiene: `cd "d:/Claude - PA/projects/wedding-seating"`. Stop `next dev` before migrate (Windows DLL lock).
- Don't change the seating engine, RSVP, or the couple-vs-venue split from Plan 16.

---

### Task 1: Plus-one (symmetric guest pairing)

**Schema:** `Guest` += `plusOneId String? @unique` + a self-relation:
```
plusOneId String?  @unique
plusOne   Guest?   @relation("PlusOne", fields: [plusOneId], references: [id], onDelete: SetNull)
plusOneOf Guest?   @relation("PlusOne")
```
(Model a symmetric 1:1; the `@unique` on `plusOneId` + the back-relation gives a clean pairing. If Prisma's self 1:1 is fiddly, an acceptable alternative is a plain nullable `plusOneId String?` with NO relation and the symmetry enforced entirely in `setPlusOne` — pick whichever compiles cleanly and document it.) Migration `add_guest_plus_one`.

**Data-access (`src/lib/db/guests.ts`):** `setPlusOne(guestId, partnerId | null)`, run in a `$transaction`, SYMMETRIC:
- Clearing (`partnerId === null`): find guestId's current partner; set both guestId.plusOneId and that partner.plusOneId to null.
- Pairing: reject if `partnerId === guestId` (400 upstream). First **unpair** any existing partner of BOTH guestId and partnerId (so re-pairing frees the old partners), then set guestId.plusOneId = partnerId AND partnerId.plusOneId = guestId. Both belong to the same wedding (validate).

**API:** `PUT /api/guests/[id]/plus-one` body `{ partnerId: string | null }` → validate partner (if non-null) exists, is in the same wedding, and ≠ id (else 400) → `setPlusOne`. Return ok. (Keeps it off the overloaded PATCH.)

**UI (`GuestTable.tsx` + `useGuestBoard.ts`):**
- `Guest` type += `plusOneId: string | null`. Hook: `setPlusOne(guestId, partnerId|null)` → PUT then refresh.
- New **"Plus one"** column: 
  - If the guest has a `plusOneId`, show the partner's name + a small **"(cross reference)"** tag, plus a way to clear it (× / "remover").
  - Else a `<select>` whose options are guests eligible = all guests **except** self, except guests that already have a `plusOneId` set (paired), and except the current guest if paired. Picking one → `setPlusOne(guest.id, partnerId)`.
- After pairing, both rows show each other and both vanish from every other row's select (derive eligibility from the live `guests` array each render).

**TDD:** `setPlusOne` symmetric set + clear + re-pair-frees-old + reject self/cross-wedding; the PUT route (valid pairs, null clears, 400s). Gates: tsc/test/build.

**Commit:** `feat(guests): symmetric plus-one pairing column (cross reference)`.

---

### Task 2: Vista do casal = arrangement only (no seated guests)

**File:** `src/components/wedding/CoupleView.tsx`.
- The **dinner** section must render the arrangement WITHOUT seated guests: render its tables with `guests: []` (dots/chairs empty, no name chips), exactly like the non-dinner moments. Use the dinner's tables + layout (from `/api/weddings/[id]/plan` — keep the tables + layout, just map every table's `guests` to `[]`), or the dinner moment's template tables if that's simpler and equivalent. Keep the placeholder when no dinner arrangement exists.
- Net effect: every moment in Vista do casal shows only the table layout (no lugares). `PlanCanvas readOnly` already prevents interaction.

**Verify:** Vista do casal → dinner shows tables with empty chairs (no guest chips/names); other moments unchanged. Screenshot.

**Commit:** `feat(wedding): couple view shows table arrangement only (no seats)`.

---

### Task 3: Sitting plan — dots by default, names on table click

**File:** `src/components/plan/PlanCanvas.tsx` (and, if cleaner, lift a `selectedTableId` into the plan page — but internal state in PlanCanvas is fine since it's presentational).
- Add internal `selectedTableId` state. **Guest name chips render only for the selected table**; all other tables render only their colored dots (existing chair layer) + the occupancy label. Default (nothing selected) = no name chips anywhere, just dots.
- **Clicking a table selects it** (toggles): wire an `onClick` on that table's HTML drop-overlay div (it's already `pointerEvents:auto` when interactive) — clicking toggles `selectedTableId`. Clicking the same table again (or empty stage) deselects (hides names).
- Keep everything else: the drop-overlay still accepts dropped unassigned guests onto ANY table (assign works whether or not selected); fix/lock buttons stay; the selected table's chips remain draggable + swap-able + lock-toggle. Occupancy label ("Mesa 1 3/8") stays visible on all tables so you can still read counts without expanding.
- This applies to the interactive seating plan. In `readOnly` mode there are no chips anyway (and Task 2 renders no guests), so behavior there is unchanged.
- Preserve the geoms/drop-overlay alignment (chips positioned under the selected table exactly as today).

**Verify by driving the app:** Plano de mesas with seated guests → tables show colored dots, no names; click a table → its guests' names appear as chips (draggable — drag one to another table still works, lock toggle works); click again → names hide; dropping an unassigned guest onto a non-selected table still seats them. Screenshot both states.

**Commit:** `feat(plan): tables show guest dots only; names appear on table click`.

---

## Definition of Done
- `npm run test` green; `npx tsc --noEmit` + `npm run build` clean.
- Guest table has a symmetric plus-one column (paired guests cross-referenced + removed from others' options). Vista do casal shows arrangements only. The sitting plan shows dots by default and reveals a table's names on click, with seating drag/lock/swap intact.

## What comes next
- Optionally: plus-one implies a `together` seating preference; RSVP-aware Generate; PDF export.
