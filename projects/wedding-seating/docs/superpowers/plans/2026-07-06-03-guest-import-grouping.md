# Guest Import & Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a couple create a wedding, import their guest list from an Excel file (with an optional pre-filled group column), organise guests into groups via a drag UI, and define seating constraints (must-sit-together / must-sit-apart) — producing exactly the data the Plan 1 seating engine consumes.

**Architecture:** A pure Excel parser (exceljs) and a Prisma data-access layer (weddings, groups, guests, constraints) plus an `importGuests` service are built and tested first. Next.js route handlers expose wedding creation, xlsx import, and CRUD for groups/guests/constraints. Two client UIs sit on top: a guest-import + drag-to-group screen, and a constraints editor. Testable logic is TDD'd; the drag/DnD UI is verified by driving the running app.

**Tech Stack:** Next.js (App Router, route handlers), Prisma/SQLite, exceljs (xlsx parsing), Vitest, React (drag-to-group with native HTML5 DnD — no extra lib).

## Global Constraints

- **Local-first only.** No cloud/network. Uploaded xlsx is parsed in-process and discarded (only parsed rows are persisted); nothing is written outside the local DB.
- **Builds on Plans 1-2.** Schema (`Wedding`, `Group`, `Guest`, `Constraint`) and the DB test harness (`globalSetup` throwaway `prisma/test.db`, `@/*` alias in vitest) already exist. Do NOT modify the schema.
- **Excel template columns:** `nome` (required) and `grupo` (optional). Header matching is accent- and case-insensitive and also accepts `name`/`group`. Rows with an empty name are skipped.
- **Constraint types:** `"together"` and `"separate"` (matches the schema `type` field and the engine). A constraint links two guest ids within the same wedding.
- **Pure parser stays pure:** `src/lib/import/*` must not import Prisma/Next/React (exceljs is fine — it is a pure lib).
- **DB tests use the throwaway test DB**, never dev.db.
- **TDD** for every logic/data/API task.

---

### Task 1: Excel guest parser (pure)

**Files:**
- Create: `src/lib/import/parseGuests.ts`
- Test: `src/lib/import/parseGuests.test.ts`

**Interfaces:**
- Consumes: exceljs.
- Produces:
  - `GuestRow = { name: string; group?: string }`
  - `parseGuestWorkbook(data: ArrayBuffer | Buffer): Promise<GuestRow[]>` — reads the first worksheet, locates the `nome`/`grupo` columns from the header row (accent/case-insensitive, `name`/`group` accepted), returns one `GuestRow` per data row with a non-empty trimmed name; `group` is included only when non-empty. Returns `[]` if no name column is found.

- [ ] **Step 1: Install exceljs**

```bash
cd "projects/wedding-seating"
npm install exceljs
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/import/parseGuests.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { parseGuestWorkbook } from "./parseGuests";

async function makeWorkbook(rows: (string | undefined)[][], headers: string[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Convidados");
  ws.addRow(headers);
  for (const r of rows) ws.addRow(r);
  return (await wb.xlsx.writeBuffer()) as Buffer;
}

it("parses name + group columns (accent/case-insensitive headers)", async () => {
  const buf = await makeWorkbook(
    [
      ["Ana Silva", "Família"],
      ["Bruno Costa", "Faculdade"],
    ],
    ["Nome", "Grupo"]
  );
  const rows = await parseGuestWorkbook(buf);
  expect(rows).toEqual([
    { name: "Ana Silva", group: "Família" },
    { name: "Bruno Costa", group: "Faculdade" },
  ]);
});

it("trims whitespace and skips rows with empty name", async () => {
  const buf = await makeWorkbook(
    [
      ["  Carla  ", "  Amigos  "],
      ["", "Ignored"],
      ["   ", "AlsoIgnored"],
    ],
    ["nome", "grupo"]
  );
  const rows = await parseGuestWorkbook(buf);
  expect(rows).toEqual([{ name: "Carla", group: "Amigos" }]);
});

it("omits group when the column is missing or empty", async () => {
  const buf = await makeWorkbook([["Diogo", ""], ["Eva", undefined]], ["name", "group"]);
  const rows = await parseGuestWorkbook(buf);
  expect(rows).toEqual([{ name: "Diogo" }, { name: "Eva" }]);
});

it("returns [] when there is no name column", async () => {
  const buf = await makeWorkbook([["x", "y"]], ["foo", "bar"]);
  expect(await parseGuestWorkbook(buf)).toEqual([]);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- parseGuests`
Expected: FAIL — cannot find module `./parseGuests`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/import/parseGuests.ts`:

```ts
import ExcelJS from "exceljs";

export interface GuestRow {
  name: string;
  group?: string;
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export async function parseGuestWorkbook(data: ArrayBuffer | Buffer): Promise<GuestRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as Buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  let nameCol = -1;
  let groupCol = -1;
  ws.getRow(1).eachCell((cell, col) => {
    const h = norm(String(cell.value ?? ""));
    if (h === "nome" || h === "name") nameCol = col;
    else if (h === "grupo" || h === "group") groupCol = col;
  });
  if (nameCol === -1) return [];

  const rows: GuestRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = String(row.getCell(nameCol).value ?? "").trim();
    if (!name) continue;
    const group = groupCol !== -1 ? String(row.getCell(groupCol).value ?? "").trim() : "";
    rows.push(group ? { name, group } : { name });
  }
  return rows;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- parseGuests`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/import/parseGuests.ts src/lib/import/parseGuests.test.ts package.json package-lock.json
git commit -m "feat(import): pure Excel guest-list parser (exceljs)"
```

---

### Task 2: Wedding, Group & Guest data-access

**Files:**
- Create: `src/lib/db/weddings.ts`
- Create: `src/lib/db/groups.ts`
- Create: `src/lib/db/guests.ts`
- Test: `src/lib/db/weddings.test.ts`
- Test: `src/lib/db/guests.test.ts`

**Interfaces:**
- Consumes: `prisma` from `./client`.
- Produces:
  - weddings: `createWedding(input: { couple: string; date?: Date; floorPlanId?: string }): Promise<Wedding>`, `getWedding(id): Promise<Wedding | null>`, `listWeddings(): Promise<Wedding[]>` (newest first).
  - groups: `createGroup(input: { weddingId: string; name: string; color?: string }): Promise<Group>`, `listGroups(weddingId): Promise<Group[]>`, `renameGroup(id, name): Promise<Group>`, `deleteGroup(id): Promise<void>`.
  - guests: `listGuests(weddingId): Promise<Guest[]>`, `assignGuestGroup(guestId, groupId: string | null): Promise<Guest>`.
  - (`Wedding`/`Group`/`Guest` are Prisma types.)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/db/weddings.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { createWedding, getWedding } from "./weddings";
import { createGroup, listGroups, renameGroup, deleteGroup } from "./groups";
import { prisma } from "./client";

it("creates a wedding and manages its groups", async () => {
  const w = await createWedding({ couple: "Ana & Bruno" });
  expect((await getWedding(w.id))?.couple).toBe("Ana & Bruno");

  const g = await createGroup({ weddingId: w.id, name: "Família" });
  const renamed = await renameGroup(g.id, "Família da Noiva");
  expect(renamed.name).toBe("Família da Noiva");
  expect((await listGroups(w.id)).length).toBe(1);

  await deleteGroup(g.id);
  expect((await listGroups(w.id)).length).toBe(0);
});

afterAll(async () => { await prisma.$disconnect(); });
```

Create `src/lib/db/guests.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { createWedding } from "./weddings";
import { createGroup } from "./groups";
import { listGuests, assignGuestGroup } from "./guests";
import { prisma } from "./client";

it("lists guests and reassigns a guest's group", async () => {
  const w = await createWedding({ couple: "Carla & Diogo" });
  const g = await createGroup({ weddingId: w.id, name: "Amigos" });
  const guest = await prisma.guest.create({ data: { weddingId: w.id, name: "Eva" } });

  const assigned = await assignGuestGroup(guest.id, g.id);
  expect(assigned.groupId).toBe(g.id);

  const cleared = await assignGuestGroup(guest.id, null);
  expect(cleared.groupId).toBeNull();

  const all = await listGuests(w.id);
  expect(all.some((x) => x.id === guest.id)).toBe(true);
});

afterAll(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- weddings guests`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Write the implementations**

Create `src/lib/db/weddings.ts`:

```ts
import type { Wedding } from "@prisma/client";
import { prisma } from "./client";

export function createWedding(input: { couple: string; date?: Date; floorPlanId?: string }): Promise<Wedding> {
  return prisma.wedding.create({ data: input });
}

export function getWedding(id: string): Promise<Wedding | null> {
  return prisma.wedding.findUnique({ where: { id } });
}

export function listWeddings(): Promise<Wedding[]> {
  return prisma.wedding.findMany({ orderBy: { createdAt: "desc" } });
}
```

Create `src/lib/db/groups.ts`:

```ts
import type { Group } from "@prisma/client";
import { prisma } from "./client";

export function createGroup(input: { weddingId: string; name: string; color?: string }): Promise<Group> {
  return prisma.group.create({ data: input });
}

export function listGroups(weddingId: string): Promise<Group[]> {
  return prisma.group.findMany({ where: { weddingId } });
}

export function renameGroup(id: string, name: string): Promise<Group> {
  return prisma.group.update({ where: { id }, data: { name } });
}

export async function deleteGroup(id: string): Promise<void> {
  await prisma.group.delete({ where: { id } });
}
```

Create `src/lib/db/guests.ts`:

```ts
import type { Guest } from "@prisma/client";
import { prisma } from "./client";

export function listGuests(weddingId: string): Promise<Guest[]> {
  return prisma.guest.findMany({ where: { weddingId } });
}

export function assignGuestGroup(guestId: string, groupId: string | null): Promise<Guest> {
  return prisma.guest.update({ where: { id: guestId }, data: { groupId } });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- weddings guests`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/weddings.ts src/lib/db/groups.ts src/lib/db/guests.ts src/lib/db/weddings.test.ts src/lib/db/guests.test.ts
git commit -m "feat(db): wedding, group, guest data-access"
```

---

### Task 3: importGuests service + Constraint data-access

**Files:**
- Create: `src/lib/import/importGuests.ts`
- Create: `src/lib/db/constraints.ts`
- Test: `src/lib/import/importGuests.test.ts`
- Test: `src/lib/db/constraints.test.ts`

**Interfaces:**
- Consumes: `prisma` from `../db/client`; `GuestRow` from `./parseGuests`.
- Produces:
  - `importGuests(weddingId: string, rows: GuestRow[]): Promise<{ guests: number; groups: number }>` — for each distinct non-empty group name, reuse an existing group of that name in the wedding or create it; then create all guests linked to their group (or null). Returns counts of guests created and groups newly created.
  - constraints: `createConstraint(input: { weddingId: string; type: "together" | "separate"; guestAId: string; guestBId: string }): Promise<Constraint>`, `listConstraints(weddingId): Promise<Constraint[]>`, `deleteConstraint(id): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/import/importGuests.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { importGuests } from "./importGuests";
import { createWedding } from "../db/weddings";
import { listGroups } from "../db/groups";
import { listGuests } from "../db/guests";
import { prisma } from "../db/client";

it("creates groups from distinct names and links guests", async () => {
  const w = await createWedding({ couple: "Import Test" });
  const res = await importGuests(w.id, [
    { name: "Ana", group: "Família" },
    { name: "Bruno", group: "Família" },
    { name: "Carla", group: "Faculdade" },
    { name: "Diogo" },
  ]);
  expect(res).toEqual({ guests: 4, groups: 2 });

  const groups = await listGroups(w.id);
  expect(groups.map((g) => g.name).sort()).toEqual(["Faculdade", "Família"]);

  const guests = await listGuests(w.id);
  const familia = groups.find((g) => g.name === "Família")!;
  expect(guests.filter((x) => x.groupId === familia.id).length).toBe(2);
  expect(guests.find((x) => x.name === "Diogo")?.groupId).toBeNull();
});

it("reuses an existing group of the same name on a second import", async () => {
  const w = await createWedding({ couple: "Reuse Test" });
  await importGuests(w.id, [{ name: "A", group: "X" }]);
  const res = await importGuests(w.id, [{ name: "B", group: "X" }]);
  expect(res.groups).toBe(0); // X already existed → no new group
  expect((await listGroups(w.id)).filter((g) => g.name === "X").length).toBe(1);
});

afterAll(async () => { await prisma.$disconnect(); });
```

Create `src/lib/db/constraints.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { createConstraint, listConstraints, deleteConstraint } from "./constraints";
import { createWedding } from "./weddings";
import { prisma } from "./client";

it("creates, lists and deletes constraints", async () => {
  const w = await createWedding({ couple: "Constraint Test" });
  const a = await prisma.guest.create({ data: { weddingId: w.id, name: "A" } });
  const b = await prisma.guest.create({ data: { weddingId: w.id, name: "B" } });

  const c = await createConstraint({ weddingId: w.id, type: "separate", guestAId: a.id, guestBId: b.id });
  expect((await listConstraints(w.id)).length).toBe(1);

  await deleteConstraint(c.id);
  expect((await listConstraints(w.id)).length).toBe(0);
});

afterAll(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- importGuests constraints`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Write the implementations**

Create `src/lib/db/constraints.ts`:

```ts
import type { Constraint } from "@prisma/client";
import { prisma } from "./client";

export function createConstraint(input: {
  weddingId: string;
  type: "together" | "separate";
  guestAId: string;
  guestBId: string;
}): Promise<Constraint> {
  return prisma.constraint.create({ data: input });
}

export function listConstraints(weddingId: string): Promise<Constraint[]> {
  return prisma.constraint.findMany({ where: { weddingId } });
}

export async function deleteConstraint(id: string): Promise<void> {
  await prisma.constraint.delete({ where: { id } });
}
```

Create `src/lib/import/importGuests.ts`:

```ts
import { prisma } from "../db/client";
import type { GuestRow } from "./parseGuests";

export async function importGuests(
  weddingId: string,
  rows: GuestRow[]
): Promise<{ guests: number; groups: number }> {
  const names = [...new Set(rows.map((r) => r.group).filter((g): g is string => !!g))];

  const groupIdByName = new Map<string, string>();
  let created = 0;
  for (const name of names) {
    const existing = await prisma.group.findFirst({ where: { weddingId, name } });
    if (existing) {
      groupIdByName.set(name, existing.id);
    } else {
      const g = await prisma.group.create({ data: { weddingId, name } });
      groupIdByName.set(name, g.id);
      created += 1;
    }
  }

  await prisma.guest.createMany({
    data: rows.map((r) => ({
      weddingId,
      name: r.name,
      groupId: r.group ? groupIdByName.get(r.group)! : null,
    })),
  });

  return { guests: rows.length, groups: created };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- importGuests constraints`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/importGuests.ts src/lib/db/constraints.ts src/lib/import/importGuests.test.ts src/lib/db/constraints.test.ts
git commit -m "feat(import): importGuests service + constraint data-access"
```

---

### Task 4: API route handlers (weddings, import, guests, groups, constraints)

**Files:**
- Create: `src/app/api/weddings/route.ts` (GET list, POST create)
- Create: `src/app/api/weddings/[id]/import/route.ts` (POST xlsx → parse + import)
- Create: `src/app/api/weddings/[id]/guests/route.ts` (GET list)
- Create: `src/app/api/weddings/[id]/groups/route.ts` (GET list, POST create)
- Create: `src/app/api/groups/[id]/route.ts` (PATCH rename, DELETE)
- Create: `src/app/api/guests/[id]/route.ts` (PATCH group assignment)
- Create: `src/app/api/weddings/[id]/constraints/route.ts` (GET list, POST create)
- Create: `src/app/api/constraints/[id]/route.ts` (DELETE)
- Test: `src/app/api/weddings/route.test.ts`
- Test: `src/app/api/weddings/[id]/import/route.test.ts`

**Interfaces:**
- Consumes: data-access (Tasks 2-3), `parseGuestWorkbook` (Task 1), `importGuests` (Task 3).
- Produces: JSON endpoints the UIs (Tasks 5-6) call. Import accepts a `multipart/form-data` upload with a `file` field.

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/weddings/route.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import { GET, POST } from "./route";
import { prisma } from "@/lib/db/client";

it("POST creates a wedding, GET lists it", async () => {
  const res = await POST(new Request("http://x/api/weddings", {
    method: "POST",
    body: JSON.stringify({ couple: "Ana & Bruno" }),
  }));
  expect(res.status).toBe(201);
  const created = await res.json();
  expect(created.couple).toBe("Ana & Bruno");
  const list = await (await GET()).json();
  expect(list.some((w: { id: string }) => w.id === created.id)).toBe(true);
});

it("POST rejects missing couple", async () => {
  const res = await POST(new Request("http://x/api/weddings", { method: "POST", body: "{}" }));
  expect(res.status).toBe(400);
});

afterAll(async () => { await prisma.$disconnect(); });
```

Create `src/app/api/weddings/[id]/import/route.test.ts`:

```ts
import { describe, it, expect, afterAll } from "vitest";
import ExcelJS from "exceljs";
import { POST } from "./route";
import { createWedding } from "@/lib/db/weddings";
import { listGuests } from "@/lib/db/guests";
import { prisma } from "@/lib/db/client";

it("imports guests from an uploaded xlsx", async () => {
  const w = await createWedding({ couple: "Upload Import" });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("g");
  ws.addRow(["nome", "grupo"]);
  ws.addRow(["Ana", "Família"]);
  ws.addRow(["Bruno", "Família"]);
  const buf = (await wb.xlsx.writeBuffer()) as Buffer;

  const form = new FormData();
  form.set("file", new File([buf], "guests.xlsx"));

  const res = await POST(new Request("http://x/import", { method: "POST", body: form }), {
    params: Promise.resolve({ id: w.id }),
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual({ guests: 2, groups: 1 });
  expect((await listGuests(w.id)).length).toBe(2);
});

afterAll(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- "weddings/route" "import/route"`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Write the route handlers**

Create `src/app/api/weddings/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createWedding, listWeddings } from "@/lib/db/weddings";

export async function GET() {
  return NextResponse.json(await listWeddings());
}

export async function POST(req: Request) {
  const b = await req.json();
  if (!b?.couple || typeof b.couple !== "string") {
    return NextResponse.json({ error: "couple is required" }, { status: 400 });
  }
  const wedding = await createWedding({
    couple: b.couple,
    date: b.date ? new Date(b.date) : undefined,
  });
  return NextResponse.json(wedding, { status: 201 });
}
```

Create `src/app/api/weddings/[id]/import/route.ts`:

```ts
import { NextResponse } from "next/server";
import { parseGuestWorkbook } from "@/lib/import/parseGuests";
import { importGuests } from "@/lib/import/importGuests";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  const rows = await parseGuestWorkbook(await file.arrayBuffer());
  const result = await importGuests(id, rows);
  return NextResponse.json(result);
}
```

Create `src/app/api/weddings/[id]/guests/route.ts`:

```ts
import { NextResponse } from "next/server";
import { listGuests } from "@/lib/db/guests";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await listGuests(id));
}
```

Create `src/app/api/weddings/[id]/groups/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createGroup, listGroups } from "@/lib/db/groups";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await listGroups(id));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  if (!b?.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  return NextResponse.json(await createGroup({ weddingId: id, name: b.name, color: b.color }), { status: 201 });
}
```

Create `src/app/api/groups/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { renameGroup, deleteGroup } from "@/lib/db/groups";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  if (!b?.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  return NextResponse.json(await renameGroup(id, b.name));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteGroup(id);
  return NextResponse.json({ ok: true });
}
```

Create `src/app/api/guests/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { assignGuestGroup } from "@/lib/db/guests";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  // groupId may be a string or explicitly null to unassign
  if (!("groupId" in b)) return NextResponse.json({ error: "groupId required" }, { status: 400 });
  return NextResponse.json(await assignGuestGroup(id, b.groupId));
}
```

Create `src/app/api/weddings/[id]/constraints/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createConstraint, listConstraints } from "@/lib/db/constraints";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await listConstraints(id));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  if ((b?.type !== "together" && b?.type !== "separate") || !b?.guestAId || !b?.guestBId) {
    return NextResponse.json({ error: "type (together|separate), guestAId, guestBId required" }, { status: 400 });
  }
  if (b.guestAId === b.guestBId) {
    return NextResponse.json({ error: "a constraint needs two different guests" }, { status: 400 });
  }
  return NextResponse.json(
    await createConstraint({ weddingId: id, type: b.type, guestAId: b.guestAId, guestBId: b.guestBId }),
    { status: 201 }
  );
}
```

Create `src/app/api/constraints/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { deleteConstraint } from "@/lib/db/constraints";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteConstraint(id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run test -- "weddings/route" "import/route"`
Expected: PASS. Then `npm run test` — full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/weddings src/app/api/groups src/app/api/guests src/app/api/constraints
git commit -m "feat(api): wedding, xlsx import, guests, groups, constraints endpoints"
```

---

### Task 5: Guest import + drag-to-group UI

**Files:**
- Create: `src/app/admin/wedding/[id]/page.tsx` (wedding workspace: import panel + guest board)
- Create: `src/components/guests/ImportPanel.tsx` (xlsx file input → POST import → refresh)
- Create: `src/components/guests/GroupBoard.tsx` (columns of groups + an "ungrouped" column; drag guests between them; create/rename/delete group)
- Create: `src/components/guests/useGuestBoard.ts` (client state: guests, groups; actions call the API and refresh)
- Modify: `src/app/admin/page.tsx` (add a "Weddings" section: list + create wedding, link to `/admin/wedding/[id]`)

**Interfaces:**
- Consumes: the API routes (Task 4).
- Produces: a working screen where a couple imports their list and organises groups. Drag-and-drop uses native HTML5 DnD (`draggable`, `onDragStart`/`onDrop`) — no extra library.

**Note on testing:** Native DnD is not unit-tested here; verify by driving the app (Step 4). All business logic already lives in the tested API/data layer.

- [ ] **Step 1: Build the wedding list entry point**

In `src/app/admin/page.tsx`, add a "Weddings" section that `GET`s `/api/weddings`, has a form to `POST` a new wedding (couple name), and links each wedding to `/admin/wedding/[id]`. Keep the existing venues/floor-plan section intact.

- [ ] **Step 2: Build the import panel**

`ImportPanel.tsx` (`"use client"`): an `<input type="file" accept=".xlsx">`; on submit, build `FormData` with `file` and `POST` to `/api/weddings/[id]/import`; show the `{ guests, groups }` result and call an `onImported` callback so the board refreshes. Include a one-line hint: template columns are `nome` and `grupo` (grupo optional).

- [ ] **Step 3: Build the group board with drag-to-group**

`useGuestBoard.ts` (`"use client"`): loads guests (`GET /api/weddings/[id]/guests`) and groups (`GET /api/weddings/[id]/groups`); exposes `assign(guestId, groupId|null)` (`PATCH /api/guests/[id]`), `addGroup(name)` (`POST`), `renameGroup(id,name)` (`PATCH /api/groups/[id]`), `removeGroup(id)` (`DELETE`), and a `refresh()`. Each mutation calls the API then refreshes.

`GroupBoard.tsx` (`"use client"`): renders one column per group plus an "Sem grupo" (ungrouped, `groupId === null`) column. Each guest is a `draggable` card carrying its id (`e.dataTransfer.setData("id", guest.id)`); each column is a drop target (`onDragOver` preventDefault, `onDrop` → `assign(id, columnGroupId)`). Controls to add a group (text input), rename (inline), and delete (moves its guests to ungrouped first — call `assign(..., null)` for each, then `removeGroup`). `page.tsx` composes `ImportPanel` + `GroupBoard`.

- [ ] **Step 4: Verify by driving the app (webapp-testing skill)**

1. `npm run dev`; open `/admin`; create a wedding; open `/admin/wedding/[id]`.
2. Import an xlsx (columns `nome`,`grupo`; some rows with a group, some without). Confirm the result count and that groups appear as columns with guests, and grouped guests land in the right column, ungrouped in "Sem grupo".
3. Drag a guest from one column to another; reload; confirm the reassignment persisted (`GET /api/weddings/[id]/guests`).
4. Create a new group, rename it, delete a group (its guests fall back to ungrouped).
Capture a screenshot of the populated board. Report what was verified vs not.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin src/components/guests
git commit -m "feat(guests): xlsx import + drag-to-group board UI"
```

---

### Task 6: Constraints editor UI

**Files:**
- Create: `src/components/guests/ConstraintsPanel.tsx` (add/list/delete together|separate pairs)
- Modify: `src/app/admin/wedding/[id]/page.tsx` (mount the constraints panel under the board)

**Interfaces:**
- Consumes: `/api/weddings/[id]/constraints` (GET/POST), `/api/constraints/[id]` (DELETE), and the guest list.
- Produces: a panel to define seating constraints between two guests.

**Note on testing:** Verified by driving the app (Step 3); the constraint logic and validation already live in the tested API layer.

- [ ] **Step 1: Build the constraints panel**

`ConstraintsPanel.tsx` (`"use client"`): two guest `<select>`s (populated from the wedding's guests), a type toggle (`together` / `separate`), and an "Add" button that `POST`s to `/api/weddings/[id]/constraints`; below, a list of existing constraints rendered as "GuestA — [não pode ficar com | tem de ficar com] — GuestB" (resolve names from the guest list), each with a delete button (`DELETE /api/constraints/[id]`). Refresh the list after add/delete. The panel disables "Add" when the two selected guests are the same.

- [ ] **Step 2: Mount it**

In `src/app/admin/wedding/[id]/page.tsx`, render `ConstraintsPanel` below the `GroupBoard`, sharing the same guest list.

- [ ] **Step 3: Verify by driving the app (webapp-testing skill)**

1. On a wedding that has imported guests, add a `separate` constraint between two guests and a `together` constraint between two others.
2. Confirm both render in the list with the right wording and the correct names.
3. Delete one; confirm it disappears and `GET /api/weddings/[id]/constraints` reflects it.
4. Confirm "Add" is disabled when the same guest is selected twice.
Capture a screenshot. Report what was verified vs not.

- [ ] **Step 4: Commit**

```bash
git add src/components/guests/ConstraintsPanel.tsx src/app/admin/wedding
git commit -m "feat(guests): constraints editor (together/separate pairs)"
```

---

## Definition of Done

- `npm run test` passes: Excel parser, importGuests service, DB layer (weddings/groups/guests/constraints), and API tests, alongside all Plan 1-2 tests. `npm run build` is clean.
- In the running local app, a couple can: create a wedding → import an Excel guest list (with or without a group column) → organise guests into groups by dragging → define together/separate constraints between guests. All of it persists and reloads.
- The produced data (`guests` with `groupId`, `groups`, `constraints`) is exactly the shape the Plan 1 engine's `SeatingInput` needs (mapping happens in Plan 4).

## What comes next (future plans)

- **Plan 4:** Plan view + manual editing — map this wedding's guests/groups/constraints + a floor plan's tables into the Plan 1 engine, render the result on the floor plan, drag guests between tables with live re-validation. This is where the carried Plan 1 follow-up (make `separate` checks fixed-occupant-aware) gets addressed.
- **Plan 5:** PDF export of the final plan.
- **Minor (from Plan 2):** add `GET /api/venues/[id]/floorplans` + capture FloorPlan width/depth; tighten numeric validation on direct API writes.
