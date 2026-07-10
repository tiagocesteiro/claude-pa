# Wedding Tabs & Editable Floor Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Navigate inside a wedding with **tabs** (not an arrow/next-page link), and let the admin **open and modify an existing venue floor plan** (not only create a new one).

**Architecture:** Two small, independent UI changes. (1) A shared client `layout.tsx` for `/admin/wedding/[id]` renders a tab bar over the wedding sub-routes, highlighting the active one; the constraints panel moves to its own tab-route so each tab is a clear section. (2) The admin page lists each venue's existing floor plans (from the existing `GET /api/floorplans`, filtered by `venueId`) with an "Editar" link into the existing editor. No schema/API/engine changes. Verified by driving the app.

**Tech Stack:** Next.js (App Router), existing components. No new dependencies.

## Global Constraints

- **Local-first only.** No cloud/network. UI-only; no schema, engine, or new endpoints (reuse `GET /api/floorplans`, which already returns each plan with `venueId` + `venue.name`).
- **Builds on Plans 1-9.** Reuse the existing wedding pages, plan page, editor, and `ConstraintsPanel`/`useGuestBoard`. Do not disturb the seating engine, the react-konva canvases, or drag/lock/swap behavior.
- **No regressions:** the guest board, plan generation/drag, and floor-plan editor must keep working exactly as before; these tasks only change navigation and add a floor-plan list.
- `npx tsc --noEmit` + `npm run build` + `npm run test` (104 tests) must stay green. UI verified by driving the app.

---

### Task 1: Tabbed navigation inside a wedding

**Files:**
- Create: `src/app/admin/wedding/[id]/layout.tsx` (client layout: couple-name header + tab bar)
- Modify: `src/app/admin/wedding/[id]/page.tsx` (remove the "Ver plano de mesas →" arrow link and the couple-name `<h1>` now owned by the layout; keep import/add/board; REMOVE `ConstraintsPanel` from this page)
- Create: `src/app/admin/wedding/[id]/constraints/page.tsx` (its own tab: fetches the wedding's guests and renders `ConstraintsPanel`)
- (Plan page `src/app/admin/wedding/[id]/plan/page.tsx` stays; it's just another tab target.)

**Interfaces:**
- The layout renders three tabs as `next/link`s, highlighting the active route via `usePathname()`:
  - **Convidados & Grupos** → `/admin/wedding/[id]`
  - **Restrições** → `/admin/wedding/[id]/constraints`
  - **Plano de mesas** → `/admin/wedding/[id]/plan`
- The couple name (fetched once from `/api/weddings`) is shown in the layout header above the tabs.

- [ ] **Step 1: Layout with tabs** — create `layout.tsx` (`"use client"`): fetch the couple name (find the wedding in `GET /api/weddings` by the `[id]` param via `useParams`), render `<h1>{couple}</h1>` and a horizontal tab bar of the three `Link`s. Use `usePathname()` to mark the active tab: the guests tab is active when the pathname equals `/admin/wedding/${id}` exactly; constraints when it ends with `/constraints`; plan when it ends with `/plan`. Style the active tab distinctly (e.g. bold + bottom border), inactive tabs muted — match the app's existing inline-style conventions. Render `{children}` below the tabs.

- [ ] **Step 2: Trim the guests page** — in `page.tsx`, remove the `<h1>{couple}</h1>` (now in the layout), remove the `Link` "Ver plano de mesas →", and remove the `<ConstraintsPanel .../>` render (it moves to its own tab). Keep `ImportPanel`, `AddGuestForm`, and `GroupBoard` and all their wiring intact. The wedding-record fetch used only for the title can be dropped from this page if the layout now owns the title (leave the guest-board logic untouched).

- [ ] **Step 3: Constraints tab** — create `constraints/page.tsx` (`"use client"`): read `[id]` via `useParams`, fetch the wedding's guests (`GET /api/weddings/[id]/guests`), and render `<ConstraintsPanel weddingId={id} guests={guests} />`. Keep it minimal; show a "Loading..." state while guests load. (ConstraintsPanel already handles its own constraints fetching + add/delete.)

- [ ] **Step 4: Verify by driving the app (webapp-testing skill)** (dev server on :3000; start `npm run dev` if down)
   1. Open `/admin/wedding/[id]` → confirm a tab bar shows (Convidados & Grupos | Restrições | Plano de mesas) with the couple name above, "Convidados & Grupos" active, and NO "Ver plano de mesas →" arrow.
   2. Click "Restrições" → constraints panel renders (add/list/delete works); click "Plano de mesas" → the plan page renders (Generate/drag still work); click back to "Convidados & Grupos" → the board renders. Active-tab highlight follows the route.
   Screenshot the tab bar. Report what was verified vs not.

- [ ] **Step 5: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test` (all green).

```bash
git add "src/app/admin/wedding/[id]"
git commit -m "feat(wedding): tabbed navigation (Convidados/Restrições/Plano) replacing the arrow link"
```

---

### Task 2: Open & modify existing venue floor plans

**Files:**
- Modify: `src/app/admin/page.tsx` (per-venue list of existing floor plans with an "Editar" link)

**Interfaces:**
- Consumes: the existing `GET /api/floorplans` (returns all floor plans, each with `venueId`, `venue.name`, `image`, `scale`, `createdAt`) — filter client-side by `venueId`. No new endpoint.
- Produces: under each venue (next to "New floor plan"), a list of that venue's existing floor plans, each an "Editar" link to `/admin/floorplan/[id]`, with a readable label (e.g. "Planta {n}" by creation order, or the created date; mark plans with an empty `image` as "sem imagem / rascunho"). "New floor plan" stays.

- [ ] **Step 1: Load floor plans** — in `AdminPage`, add state `floorPlans` and a `loadFloorPlans()` that `GET`s `/api/floorplans`; call it in the existing mount effect. (Each item includes `venueId`.)

- [ ] **Step 2: Render per-venue list** — in each venue `<li>`, below the existing buttons, render the venue's floor plans (`floorPlans.filter(fp => fp.venueId === v.id)`), each a `Link href={`/admin/floorplan/${fp.id}`}` labelled e.g. "Planta 1", "Planta 2" (index within the venue, or `new Date(fp.createdAt).toLocaleDateString()`), plus a subtle "(sem imagem)" when `fp.image` is empty. If a venue has none, show a muted "Sem plantas ainda." The existing "New floor plan" button and "Table type catalog" link stay. After `handleNewFloorPlan` creates+navigates, no change needed (the list reloads on next mount).

- [ ] **Step 3: Verify by driving the app** (dev server on :3000)
   1. For a venue with an existing floor plan, confirm the plan appears under it with an "Editar" link; click it → opens `/admin/floorplan/[id]` with the saved tables/calibration/boundary loaded (i.e. you can MODIFY the existing plan, not just create a new one).
   2. Confirm "New floor plan" still creates a fresh one; a venue with no plans shows "Sem plantas ainda."
   Screenshot. Report what was verified vs not.

- [ ] **Step 4: Gates + commit**

Run `npx tsc --noEmit`, `npm run build`, `npm run test`.

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): list & open existing venue floor plans for editing"
```

---

## Definition of Done

- `npm run test` green; `npx tsc --noEmit` + `npm run build` clean.
- In the running app: inside a wedding you navigate with **tabs** (Convidados & Grupos | Restrições | Plano de mesas) — no arrow/next-page link; and under each venue you can **open an existing floor plan to modify it** (as well as create a new one).

## What comes next

- **Plan 11:** PDF export with color coding + legend + per-table list (the printable deliverable).
- **Deferred:** positioned layout templates by guest-count.
