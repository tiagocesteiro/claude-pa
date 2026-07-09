# Guest Attributes & Color Coding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture per-guest attributes (age group, gender, dietary/allergies) from the Excel import and manual add, then let the couple color-code guests on the plan by any chosen attribute with a legend — the differentiator for a printable, color-coded seating plan.

**Architecture:** A small schema addition (three nullable `Guest` fields) + parser/import/manual-add support; a pure color model that maps the distinct values of a chosen attribute to an accessible palette (+legend); and plan-view UI that paints guest chips by the selected attribute and shows a legend, plus attributes in the per-table list. Testable logic (schema/parser/import/color model/endpoints) is TDD'd; UI is verified by driving the app.

**Tech Stack:** Next.js (App Router), Prisma/SQLite, exceljs, the pure seating engine, Vitest.

## Global Constraints

- **Local-first only.** No cloud/network.
- **Builds on Plans 1-5.** This plan MAY add nullable `Guest` fields via one Prisma migration — the only schema change here.
- **Attributes are optional.** Every attribute is nullable; guests without them still work everywhere. Excel columns are optional; missing columns are fine.
- **Age group is normalized** to `"adult" | "child" | "senior"` (Portuguese inputs adulto/criança/idoso map to these, accent/case-insensitive); unknown values are ignored (null). Gender and dietary are stored as trimmed free text.
- **Color model is pure** (`src/lib/plan/colors.ts`): no framework/DOM; deterministic mapping from distinct attribute values → a fixed accessible palette, with a legend. Colors are stable for the same input.
- **Engine untouched.** Attributes do not affect seating; they are display/filter only.
- **DB tests use the throwaway test DB; TDD for logic/data/API; UI verified by driving the app; `npx tsc --noEmit` + `npm run build` stay clean.**

---

### Task 1: Schema attributes + migration

**Files:**
- Modify: `prisma/schema.prisma` (add three nullable fields to `Guest`)
- Test: (covered by later tasks; this task just migrates)

**Interfaces:**
- `Guest` gains: `ageGroup String?`, `gender String?`, `dietary String?`. All nullable, default null. Schema stays Postgres-portable.

- [ ] **Step 1: Add fields**

In `prisma/schema.prisma`, add to `model Guest`:

```prisma
  ageGroup        String?
  gender          String?
  dietary         String?
```

- [ ] **Step 2: Migrate**

```bash
cd "projects/wedding-seating"
npx prisma migrate dev --name add_guest_attributes
```

Expected: migration created + applied to `prisma/dev.db`, client regenerated. (If a running `next dev` locks the Prisma engine DLL during `prisma generate`, stop the dev server, re-run `npx prisma generate`, and note it.)

- [ ] **Step 3: Sanity — full suite still green (schema applied to test.db via globalSetup)**

Run: `npm run test` then `npx tsc --noEmit`
Expected: green, 0 errors (existing tests unaffected; new nullable columns present).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(guests): add nullable ageGroup/gender/dietary attributes"
```

---

### Task 2: Parse + import + manual-add attributes

**Files:**
- Modify: `src/lib/import/parseGuests.ts` (read optional attribute columns)
- Modify: `src/lib/import/importGuests.ts` (persist attributes)
- Modify: `src/lib/db/guests.ts` (`createGuest` accepts attributes)
- Modify: `src/app/api/weddings/[id]/guests/route.ts` (POST accepts attributes)
- Test: `src/lib/import/parseGuests.test.ts`, `src/lib/import/importGuests.test.ts`

**Interfaces:**
- `GuestRow` gains optional `ageGroup?: "adult" | "child" | "senior"`, `gender?: string`, `dietary?: string`.
- `parseGuestWorkbook` detects optional columns (accent/case-insensitive headers):
  - age group: `faixa`, `faixa etaria`, `idade`, `escalao` → normalize value `adulto→adult`, `crianca→child`, `idoso→senior` (accent/case-insensitive); unknown → omit.
  - gender: `genero`, `sexo` → trimmed free text (omit if empty).
  - dietary: `alergias`, `intolerancias`, `dieta`, `alimentar`, `restricoes` → trimmed free text (omit if empty).
- `importGuests` persists these onto each created guest.
- `createGuest(input)` gains optional `ageGroup?/gender?/dietary?`.
- `POST /api/weddings/[id]/guests` accepts optional `ageGroup/gender/dietary`.

- [ ] **Step 1: Write failing tests**

Add to `src/lib/import/parseGuests.test.ts`:

```ts
it("parses optional attribute columns (age group normalized; gender/dietary free text)", async () => {
  const buf = await makeWorkbook(
    [
      ["Ana", "Família", "Adulto", "F", "Vegetariana"],
      ["Zé Kid", "Família", "Criança", "M", ""],
      ["Avó", "Família", "Idoso", "", "Sem lactose"],
    ],
    ["nome", "grupo", "faixa", "género", "alergias"]
  );
  const rows = await parseGuestWorkbook(buf);
  expect(rows[0]).toEqual({ name: "Ana", group: "Família", ageGroup: "adult", gender: "F", dietary: "Vegetariana" });
  expect(rows[1]).toEqual({ name: "Zé Kid", group: "Família", ageGroup: "child", gender: "M" });
  expect(rows[2]).toEqual({ name: "Avó", group: "Família", ageGroup: "senior", dietary: "Sem lactose" });
});
```

Add to `src/lib/import/importGuests.test.ts`:

```ts
it("persists guest attributes on import", async () => {
  const w = await createWedding({ couple: "Attrs Import" });
  await importGuests(w.id, [
    { name: "Ana", group: "Fam", ageGroup: "adult", gender: "F", dietary: "Vegetariana" },
  ]);
  const guests = await listGuests(w.id);
  const ana = guests.find((g) => g.name === "Ana")!;
  expect(ana.ageGroup).toBe("adult");
  expect(ana.gender).toBe("F");
  expect(ana.dietary).toBe("Vegetariana");
});
```

- [ ] **Step 2: Run to fail**

Run: `npm run test -- parseGuests importGuests`
Expected: FAIL.

- [ ] **Step 3: Implement the parser**

In `src/lib/import/parseGuests.ts`:
- Extend `GuestRow` with the optional fields.
- Detect the extra columns in the header scan (reuse the existing `norm()` accent/case-insensitive helper). Add a small `normAge(value)` that maps `adulto→adult`, `crianca→child`, `idoso→senior` (via `norm`), else `undefined`.
- For each data row, read those columns via `cell.text`, trim, and set the fields only when non-empty (age group only when it normalizes to a known value).

- [ ] **Step 4: Implement import + createGuest + POST**

- `importGuests` (`src/lib/import/importGuests.ts`): include `ageGroup/gender/dietary` in the `prisma.guest.createMany` data mapping (default `null` when absent).
- `createGuest` (`src/lib/db/guests.ts`): accept and pass `ageGroup ?? null`, `gender ?? null`, `dietary ?? null`.
- `POST /api/weddings/[id]/guests`: read optional `ageGroup/gender/dietary` from the body and pass to `createGuest`.

- [ ] **Step 5: Run to pass + full suite + tsc**

Run: `npm run test -- parseGuests importGuests` then `npm run test` then `npx tsc --noEmit`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/import/parseGuests.ts src/lib/import/importGuests.ts src/lib/db/guests.ts "src/app/api/weddings/[id]/guests/route.ts" src/lib/import/parseGuests.test.ts src/lib/import/importGuests.test.ts
git commit -m "feat(import): parse + persist guest attributes (age/gender/dietary)"
```

---

### Task 3: Pure color model

**Files:**
- Create: `src/lib/plan/colors.ts`
- Test: `src/lib/plan/colors.test.ts`

**Interfaces:**
- `PALETTE: string[]` — a fixed accessible color list (8+ hex values).
- `AttributeKey = "ageGroup" | "gender" | "dietary"`.
- `type AttrGuest = { id: string; ageGroup: string | null; gender: string | null; dietary: string | null }`.
- `buildColorMap(guests: AttrGuest[], attr: AttributeKey): { legend: { value: string; color: string }[]; colorByGuest: Record<string, string> }` — collects the DISTINCT non-null values of `attr` (in first-seen order), assigns each a palette color (cycling), and returns a legend + a per-guest color map (guests with a null value are omitted from `colorByGuest`). Deterministic for the same input.

- [ ] **Step 1: Write the failing test**

Create `src/lib/plan/colors.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildColorMap, PALETTE } from "./colors";

const guests = [
  { id: "g1", ageGroup: "adult", gender: "F", dietary: null },
  { id: "g2", ageGroup: "child", gender: "M", dietary: "Vegan" },
  { id: "g3", ageGroup: "adult", gender: null, dietary: "Vegan" },
];

it("maps distinct attribute values to palette colors with a legend", () => {
  const { legend, colorByGuest } = buildColorMap(guests, "ageGroup");
  expect(legend).toEqual([
    { value: "adult", color: PALETTE[0] },
    { value: "child", color: PALETTE[1] },
  ]);
  expect(colorByGuest.g1).toBe(PALETTE[0]);
  expect(colorByGuest.g2).toBe(PALETTE[1]);
  expect(colorByGuest.g3).toBe(PALETTE[0]);
});

it("omits guests with a null value for the attribute", () => {
  const { colorByGuest } = buildColorMap(guests, "dietary");
  expect(colorByGuest.g1).toBeUndefined(); // dietary null
  expect(colorByGuest.g2).toBe(PALETTE[0]); // "Vegan" first-seen
  expect(colorByGuest.g3).toBe(PALETTE[0]);
});
```

- [ ] **Step 2: Run to fail**

Run: `npm run test -- colors`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

Create `src/lib/plan/colors.ts`:

```ts
export const PALETTE: string[] = [
  "#2563eb", // blue
  "#16a34a", // green
  "#d97706", // amber
  "#dc2626", // red
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#db2777", // pink
  "#65a30d", // lime
];

export type AttributeKey = "ageGroup" | "gender" | "dietary";

export interface AttrGuest {
  id: string;
  ageGroup: string | null;
  gender: string | null;
  dietary: string | null;
}

export function buildColorMap(
  guests: AttrGuest[],
  attr: AttributeKey
): { legend: { value: string; color: string }[]; colorByGuest: Record<string, string> } {
  const order: string[] = [];
  const colorOfValue = new Map<string, string>();
  for (const g of guests) {
    const v = g[attr];
    if (v == null || v === "") continue;
    if (!colorOfValue.has(v)) {
      colorOfValue.set(v, PALETTE[order.length % PALETTE.length]);
      order.push(v);
    }
  }
  const colorByGuest: Record<string, string> = {};
  for (const g of guests) {
    const v = g[attr];
    if (v != null && v !== "" && colorOfValue.has(v)) colorByGuest[g.id] = colorOfValue.get(v)!;
  }
  return { legend: order.map((value) => ({ value, color: colorOfValue.get(value)! })), colorByGuest };
}
```

- [ ] **Step 4: Run to pass**

Run: `npm run test -- colors`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plan/colors.ts src/lib/plan/colors.test.ts
git commit -m "feat(plan): pure color model for attribute coding + legend"
```

---

### Task 4: Plan UI — attribute filter, colored chips, legend, attributes in table list; add-guest attribute inputs

**Files:**
- Modify: `src/components/plan/usePlan.ts` (expose guest attributes; a selected color attribute + derived color map)
- Modify: `src/components/plan/PlanCanvas.tsx` (paint guest chips by `colorByGuest`)
- Modify: `src/app/admin/wedding/[id]/plan/page.tsx` (attribute filter selector + legend)
- Modify: `src/components/plan/TableList.tsx` (show each guest's attributes)
- Modify: `src/components/guests/AddGuestForm.tsx` (optional attribute inputs)
- Modify: `src/components/guests/useGuestBoard.ts` (`addGuest` passes attributes)

**Interfaces:**
- Consumes: `buildColorMap` (Task 3), the guest attributes now present on plan data.
- Produces: a plan where the couple picks a **color attribute** (`Nenhum` / Faixa etária / Género / Alimentar) → guest chips are tinted by `colorByGuest`, a **legend** shows value→color, and the per-table list shows each guest's attributes. The manual add-guest form gains optional faixa/género/alimentar inputs.

- [ ] **Step 1: usePlan** — ensure `PlanGuest` carries `ageGroup/gender/dietary` (data already returned by the plan/guests endpoints once the schema fields exist). Add state `colorAttr: AttributeKey | null` (default null) with a setter, and a derived `colorMap = colorAttr ? buildColorMap(guests, colorAttr) : { legend: [], colorByGuest: {} }`.

- [ ] **Step 2: PlanCanvas** — accept a `colorByGuest: Record<string,string>` prop; render each seated guest chip with a colored left border / background tint when the guest has a color; keep names legible (Plan 5). Do not disturb the shared `geoms`/displayScale alignment or the drag/lock behaviour.

- [ ] **Step 3: plan/page** — add a small control: "Pintar por: [Nenhum | Faixa etária | Género | Alimentar]" bound to `setColorAttr` (map labels to `null|"ageGroup"|"gender"|"dietary"`); render the `legend` (colored swatches + value) beside/under the canvas; pass `colorMap.colorByGuest` to `PlanCanvas`.

- [ ] **Step 4: TableList** — for each seated guest, show a compact attribute suffix (e.g. `Ana (adulto, F, vegetariana)`), omitting null parts. This makes the printable list informative.

- [ ] **Step 5: AddGuestForm** — add optional inputs: faixa etária (select adulto/criança/idoso/—), género (text), alimentar (text). `useGuestBoard.addGuest` passes them in the POST body. (Import remains the bulk path.)

- [ ] **Step 6: Verify by driving the app (webapp-testing skill)** (dev server on http://localhost:3000; start `npm run dev` if down)
   1. Import the sample (or a file with attribute columns) OR add a guest with attributes manually.
   2. On the plan, pick "Pintar por: Faixa etária" → confirm child vs adult chips get distinct colors and the legend shows the mapping. Switch to "Género" / "Alimentar" → colors + legend update.
   3. Confirm the per-table list shows attributes.
   Screenshot the colored plan + legend. Report what was verified vs not.

- [ ] **Step 7: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test` (all green).

```bash
git add src/components/plan "src/app/admin/wedding/[id]/plan" src/components/guests
git commit -m "feat(plan): color-code guests by attribute with legend + attribute inputs/list"
```

---

## Definition of Done

- `npm run test` green; `npx tsc --noEmit` + `npm run build` clean.
- In the running app: a couple can import (or manually enter) guest attributes (adulto/criança/idoso, género, alergias/intolerâncias), then **color the plan by any attribute** with a **legend**, and see attributes in the per-table list — the visual basis for a color-coded printable plan.

## What comes next

- **Plan 7:** multi-group membership (extra groups as tags/color inputs; primary group drives seating cohesion).
- **Plan 8:** venue table catalog (types, min/max, dimensions) + layout templates by guest-count + min spacing + edit table config before generating.
- **Plan 9:** floor-plan walls/boundaries (visual guide + out-of-bounds warning) + per-table chair rendering (colored by the selected attribute).
- **Plan 10:** PDF export with the color coding + legend + per-table list.
