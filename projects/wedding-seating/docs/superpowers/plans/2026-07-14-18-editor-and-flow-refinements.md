# Editor & Flow Refinements (batch) — Implementation Plan

Big batch of owner feedback after testing. Grouped into waves; small unambiguous polish first, schema changes next, big features last. Builds on Plans 1-17.

## Global Constraints
- Local-first, additive migrations only. `tsc`/`build`/`test` stay green. UI verified by driving the app.
- cwd `cd "d:/Claude - PA/projects/wedding-seating"`; stop `next dev` before migrate (Windows DLL lock).
- Don't regress the seating engine, RSVP, plus-one, delete features, couple-vs-venue split.

---

## WAVE 1 — UI polish (no schema)

### Task 1: Seating-plan + couple-overview + tab renames
- Rename wedding tabs: **"Plano de mesas" → "Seating plan"**, **"Vista do casal" → "Visão geral"** (`src/app/admin/wedding/[id]/layout.tsx`; keep routes `/plan` + `/couple`).
- **Seating plan** (`plan/page.tsx` + `usePlan.ts` + `PlanCanvas`):
  - **Hide the dining-room zones** (don't render the zone layer / pass `zones={[]}`).
  - Add **"Grupo"** to the "Pintar por" options → color seats by the guest's primary group (extend `colorMap`/`buildColorMap` to accept a `group` attribute keyed off `groupId`, legend shows group names).
  - The **table list below** (`TableList.tsx`) shows **only guest names** (drop age/gender/dietary columns/among the seated list).
- **Couple overview** (`CoupleView.tsx`):
  - **Hide zones** on the dinner arrangement (pass `zones={[]}`).
  - Add a small **guest summary** header: total convidados + nº confirmados (from `/api/weddings/[id]/plan` guests' rsvp, or the guests endpoint).

### Task 2: Template editor fixes
- `TemplateTableEditor.tsx` / templates page: the layout picker + header show the floor plan's **name** (fallback "Planta N"), NOT always "Planta N".
- **Remove the generic circular table** default option when adding tables — only real catalog table types can be placed (if the catalog is empty, hint to create one).
- **Delete tables** from the template: add a remove affordance per table in the editor (persist via the existing `saveTemplateTables`).

### Task 3: Guest table filters + sorting
- `GuestTable.tsx`: column **sorting** (click header to sort by name/group/rsvp/age/…) and **filters** (at least by group + RSVP status). Client-side over the loaded guests. Keep inline editing intact.

---

## WAVE 2 — small schema changes

### Task 4: Name tables (double-click)
- `Table.name String?` (migration). Double-click a table on the seating plan / template editor → inline rename → PATCH. Show the name instead of "Mesa N" when set. Applies to both canvases.

### Task 5: Rectangular tables with/without heads (cabeceiras)
- Rect tables can have seats on the short ends (heads) or not. Add `Table.heads Boolean? @default(true)` (or on TableType). Chair layout (`chairs.ts`) places/omits the 2 head seats for rect; capacity accounting reflects it. Editable when placing/editing a rect table.

### Task 6: Dinner template defined in Detalhes + per-moment notes
- Move the **dinner arrangement selection to the Detalhes tab** (venue defines it, like the other moments) with a **reduced thumbnail** of the template. The Seating plan stops offering its own template picker — it seats into the wedding's dinner template set in Detalhes (apply/copy still happens, just triggered from Detalhes).
- Add **`WeddingMoment.notes String?`** (migration) — a notes box under each moment in Detalhes (and shown in the couple overview).

---

## WAVE 3 — larger features

### Task 7: Create a room from scratch (dimensions)
- Allow a floor plan with **no image**: enter length × width (metres) → the editor renders a to-scale room rectangle (derive scale from a fixed canvas fit). Tables/zones/elements work on the blank room.

### Task 8: Extra room elements (dance floor, bar, …)
- Draw labelled rectangles with **text in the middle** + a **chosen colour**; **exempt from min-spacing**. Store per template/floor plan (JSON list `{x,y,w,h,label,color}` or a small model). Render on the editor + seating plan + couple overview.

### Task 9: Snap / alignment guides (AutoCAD-style)
- While dragging a table in the template editor, show **alignment guides** and **snap** to other tables' centre lines (horizontal/vertical centre alignment).

### Task 10: Export PDF per room (couple overview)
- A **"Exportar PDF"** button per moment/room in the Visão geral → a printable PDF of that room's plan (image/room + tables + labels; dinner with names/seats). Client-side (self-contained; no external CDN).

---

## Definition of Done (per wave)
- `npm run test` green; `tsc` + `build` clean; each task verified by driving the app; committed separately.
