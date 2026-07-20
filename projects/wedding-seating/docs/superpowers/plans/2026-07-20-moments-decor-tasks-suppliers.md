# Moments-as-tabs + Decoration + Tasks + Suppliers — Plan

## Owner request
- Move the wedding MOMENTS out of the Detalhes page into **one tab per moment**; be able to **add / remove** moments (tabs).
- In each moment, a **Decoration** section — the venue has a **decoration dataset (catalog)**; the couple **picks from it AND can add their own** items (owner decision).
- In each moment, replace the **notes box with a Tasks / pending-items** section for tracking; each task assignable to a **responsible party: Noivos (couple) / Quinta (venue) / a specific Fornecedor (supplier)**.
- On the **Detalhes** page, a **Suppliers (Fornecedores)** section to add suppliers (they populate the task-assignee list).
- Owner decision: each moment KEEPS its venue table-arrangement view (template) + adds decoration + tasks (nothing removed).

## Data model
- **`WeddingMoment` becomes dynamic** (was a fixed 4-kind set with `@@unique[weddingId,kind]`):
  - add `title String?` (display name; fallback to the kind label when null), `order Int @default(0)`.
  - make `kind String?` nullable (a tag for the 4 seeded defaults; custom moments = null). **DROP `@@unique([weddingId, kind])`.**
  - keep `notes` (legacy, unused by new UI). Add relations `tasks MomentTask[]`, `decor MomentDecor[]`.
  - Identity moves to `id`; route + data-access become **id-based** (was `[kind]`). Templates on a moment are now a **view only** — NO apply-template side-effect (dinner seating lives in the Layouts feature). Removes the dinner special-case.
- **`Supplier`** (wedding-owned): `{ id, weddingId, name, service?, contact?, createdAt }` + `tasks MomentTask[]`.
- **`DecorItem`** (venue catalog): `{ id, venueId, name, category?, image?, price?, createdAt }` + `momentDecor MomentDecor[]`.
- **`MomentDecor`** (per-moment decoration line): `{ id, momentId, decorItemId? (from catalog) , name? note? (custom when decorItemId null), quantity Int@1, createdAt }`.
- **`MomentTask`**: `{ id, momentId, text, done Boolean@false, assignee String@"couple" (couple|venue|supplier), supplierId?, dueDate?, order Int@0, createdAt }`.
- Back-relations: `Wedding.suppliers`, `Venue.decorItems`.
- **Migration `moments_decor_tasks_suppliers`**: additive new tables + WeddingMoment new columns; make kind nullable + drop the unique index. `order`/`quantity`/`done` have defaults; `title` nullable so existing rows are fine (display falls back to kind label).
- **Seeding:** `createWedding` still seeds the 4 defaults, now with `title` + `order` (ceremony=0…dance=3).

## Access
- `Supplier`/`MomentTask`/`MomentDecor` resolve their owner through the wedding (moment→weddingId; supplier→weddingId) → `assertWeddingAccess`. `DecorItem` resolves through `venueId` → `assertVenueAccess` (venue writes; couple reads its booked venue's catalog). New `assertMomentAccess`, `assertSupplierAccess`, `assertDecorItemAccess`.

## Waves
1. **Schema + migration + data-access + access + tests.** `src/lib/db/moments.ts` rewritten id-based (list/create/rename/reorder/delete + setMomentTemplate/FloorPlan by id) + `tasks.ts` + `decor.ts` (moment decor) + `suppliers.ts` + `decorCatalog.ts` (venue items). Access helpers. Tests.
2. **Routes.** `moments` (GET list / POST create / PATCH rename+reorder+template / DELETE) → id-based; `moments/[momentId]/tasks` (GET/POST/PATCH/DELETE); `moments/[momentId]/decor` (GET/POST/PATCH/DELETE); `weddings/[id]/suppliers` (GET/POST/PATCH/DELETE); `venues/[id]/decor-items` (GET/POST/PATCH/DELETE, venue-owned catalog). Keep the old `[kind]` route working or migrate callers.
3. **Venue UI.** Decoration catalog management for the venue (like table-types): list/add/edit/remove DecorItem (name, category, price, optional image upload to Storage).
4. **Couple UI.** Dynamic **moment tabs** in the wedding nav (from the wedding's moments, + "Novo momento", remove per tab). Per-moment page: arrangement (existing template view) + **Decoration** (pick from venue catalog + add custom, with quantity) + **Tasks** (add/toggle/assign to couple/venue/supplier, optional due date). **Detalhes**: new **Fornecedores** section (add/edit/remove). Remove the per-moment notes + the moment list from Detalhes.
5. **Visão geral** (optional polish): show each moment's decoration + open tasks alongside the arrangement.

## Verification
Per wave: `npm run test` (+ new) green, `tsc` + `next build` clean. Live: add/remove a moment; add a supplier; a task assigned to that supplier; pick a venue decor item + a custom one; all persist and isolate per tenant.

## Not changing
Seating engine, layouts feature, konva canvases, tenancy model — only extended.
