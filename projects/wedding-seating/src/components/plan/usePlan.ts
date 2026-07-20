"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Warning } from "@/lib/seating";
import { planViolations, type PlanViolations } from "@/lib/plan/validate";
import { buildColorMap, type AttributeKey } from "@/lib/plan/colors";
import { parseElements, type RoomElement } from "@/lib/floorplan/elements";

export interface PlanGuest {
  id: string;
  weddingId: string;
  name: string;
  groupId: string | null;
  extraGroups: string | null;
  assignedTableId: string | null;
  locked: boolean;
  ageGroup: string | null;
  gender: string | null;
  dietary: string | null;
  /** Used only by the couple overview's "N convidados · M confirmados" summary
   * (Task 1); harmless elsewhere since it's just carried through from the API. */
  rsvp?: string | null;
}

export interface PlanTable {
  id: string;
  floorPlanId: string | null;
  shape: string;
  capacity: number;
  x: number;
  y: number;
  fixed: boolean;
  width?: number | null;
  depth?: number | null;
  minCapacity?: number | null;
  /** Optional human label ("Mesa dos noivos"); falls back to "Mesa N" when unset. */
  name?: string | null;
  /** Rect tables only ("cabeceiras"): seats on the two short ends. Defaults to true. */
  heads?: boolean | null;
}

export interface PlanConstraint {
  id: string;
  weddingId: string;
  type: "together" | "separate";
  guestAId: string;
  guestBId: string;
}

export interface PlanGroup {
  id: string;
  weddingId: string;
  name: string;
  color: string | null;
}

/** The template's floor-plan background (image + scale + zones), attached to the
 * wedding once a template has been applied. `null` before any template is applied.
 * `width`/`depth` (metres) feed the blank-room render (Plan 18 Task 7) when `image`
 * is empty — a layout defined by dimensions rather than an uploaded photo. */
export interface PlanLayout {
  floorPlanId: string | null;
  image: string | null;
  scale: number;
  width: number;
  depth: number;
  zones: string | null;
  /** JSON list of decorative room elements (dance floor, bar, ...) — Plan 18 Task 8.
   * Parsed via `parseElements` before being handed to PlanCanvas. */
  elements: string | null;
}

export interface PlanTemplate {
  id: string;
  name: string;
  minGuests: number;
  maxGuests: number;
  venueId: string;
  venue?: { name: string };
  floorPlanId: string | null;
  floorPlan?: { image: string } | null;
}

/** A venue's table-type catalog entry — the presets offered by the "add table" control
 * while editing the wedding's copied tables (Task 4). */
export interface PlanTableType {
  id: string;
  name: string;
  shape: string;
  minSeats: number;
  maxSeats: number;
  width: number;
  depth: number;
}

/** Minimal shape accepted when placing a new table from the catalog — see `addTable`. */
export interface TablePlacementPreset {
  shape?: string;
  capacity?: number;
  minCapacity?: number | null;
  width?: number | null;
  depth?: number | null;
}

/**
 * Drives the seating editor. Two modes, same UI:
 *  • wedding mode (`layoutId` omitted) — the legacy single dinner arrangement,
 *    talking to `/api/weddings/[id]/*`.
 *  • layout mode (`layoutId` given) — one of the couple's multiple layouts,
 *    talking to `/api/layouts/[layoutId]/*`. The `/plan`, `/generate`,
 *    `/assignment`, `/tables` suffixes are identical in both, so only the base
 *    URL differs; the one real difference is the layout `/plan` response, which
 *    carries seating as a separate `seats` array (merged into each guest's
 *    `assignedTableId` here) and the background under `background`.
 */
export function usePlan(weddingId: string, layoutId?: string) {
  const [guests, setGuests] = useState<PlanGuest[]>([]);
  const [tables, setTables] = useState<PlanTable[]>([]);
  const [constraints, setConstraints] = useState<PlanConstraint[]>([]);
  const [groups, setGroups] = useState<PlanGroup[]>([]);
  const [layout, setLayout] = useState<PlanLayout | null>(null);
  const [layoutMeta, setLayoutMeta] = useState<{
    id: string;
    name: string;
    isFinal: boolean;
    momentId: string | null;
    hasSeating: boolean;
  } | null>(null);
  const [elements, setElements] = useState<RoomElement[]>([]);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [venueTableTypes, setVenueTableTypes] = useState<PlanTableType[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [savingTables, setSavingTables] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [colorAttr, setColorAttr] = useState<AttributeKey | null>(null);

  // Only the base differs between the two modes — the /plan, /generate,
  // /assignment, /tables suffixes are the same on both route trees.
  const planBase = useMemo(
    () => (layoutId ? `/api/layouts/${layoutId}` : `/api/weddings/${weddingId}`),
    [layoutId, weddingId]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${planBase}/plan`);
      if (!res.ok) throw new Error("failed to load plan");
      const data = (await res.json()) as {
        // wedding mode
        guests: PlanGuest[];
        tables: PlanTable[];
        constraints: PlanConstraint[];
        layout?: PlanLayout | null;
        // layout mode
        seats?: { guestId: string; tableId: string }[];
        background?: PlanLayout | null;
        meta?: { id: string; name: string; isFinal: boolean; momentId: string | null; hasSeating: boolean } | null;
      };
      if (layoutId) {
        // Layout mode: seating lives in a separate `seats` array — fold each
        // guest's seat in THIS layout into their assignedTableId so the rest of
        // the editor (which reads assignedTableId) works unchanged.
        const seatBy = new Map((data.seats ?? []).map((s) => [s.guestId, s.tableId]));
        setGuests((data.guests ?? []).map((g) => ({ ...g, assignedTableId: seatBy.get(g.id) ?? null })));
        setLayout(data.background ?? null);
        setLayoutMeta(data.meta ?? null);
        setElements(parseElements(data.background?.elements ?? null));
      } else {
        setGuests(data.guests ?? []);
        setLayout(data.layout ?? null);
        setElements(parseElements(data.layout?.elements ?? null));
      }
      setTables(data.tables ?? []);
      setConstraints(data.constraints ?? []);
    } catch {
      setError("Não foi possível carregar o plano.");
    } finally {
      setLoading(false);
    }
  }, [planBase, layoutId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load on mount
    refresh();
  }, [refresh]);

  // Templates are wedding-independent (global catalog); fetched once for the picker.
  useEffect(() => {
    let cancelled = false;
    async function loadTemplates() {
      try {
        const res = await fetch("/api/templates");
        if (!res.ok) return;
        const data = (await res.json()) as PlanTemplate[];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load on mount
        if (!cancelled) setTemplates(data ?? []);
      } catch {
        // silent — the picker just shows no options
      }
    }
    loadTemplates();
    return () => {
      cancelled = true;
    };
  }, []);

  // The applied template's venue, resolved without any API change: the template
  // list (fetched above) already carries venueId, so we match the wedding's
  // current layout back to the template that points at the same floor plan.
  const venueId = useMemo(() => {
    if (!layout?.floorPlanId) return null;
    return templates.find((t) => t.floorPlanId === layout.floorPlanId)?.venueId ?? null;
  }, [layout?.floorPlanId, templates]);

  // The venue's table-type catalog, used by the "add table" control while editing
  // the wedding's copied tables. Re-fetched whenever the resolved venue changes.
  useEffect(() => {
    if (!venueId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears the catalog when there's no venue to fetch from
      setVenueTableTypes([]);
      return;
    }
    let cancelled = false;
    async function loadTableTypes() {
      try {
        const res = await fetch(`/api/venues/${venueId}/table-types`);
        if (!res.ok) return;
        const data = (await res.json()) as PlanTableType[];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- data load when the venue changes
        if (!cancelled) setVenueTableTypes(data ?? []);
      } catch {
        // silent — the add-table control just shows no presets
      }
    }
    loadTableTypes();
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  // Copies the template's tables onto the wedding (replacing any current wedding
  // tables + clearing seating, server-side) and attaches its floor plan as the
  // wedding's layout. Caller is responsible for confirming the replace when the
  // wedding already has tables/seating — this just applies + refreshes.
  const applyTemplate = useCallback(
    async (templateId: string) => {
      setApplying(true);
      setError(null);
      try {
        const res = await fetch(`/api/weddings/${weddingId}/apply-template`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId }),
        });
        if (!res.ok) throw new Error("apply template failed");
        setScore(null);
        setWarnings([]);
        await refresh();
      } catch {
        setError("Não foi possível aplicar o template.");
      } finally {
        setApplying(false);
      }
    },
    [weddingId, refresh]
  );

  // Groups aren't floor-plan scoped; fetched once per wedding, used only to resolve
  // warning names (group-split). Best-effort — a failed fetch just means warnings
  // fall back to the engine's raw message instead of the group name.
  useEffect(() => {
    let cancelled = false;
    async function loadGroups() {
      try {
        const res = await fetch(`/api/weddings/${weddingId}/groups`);
        if (!res.ok) return;
        const data = (await res.json()) as PlanGroup[];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load on mount/wedding change
        if (!cancelled) setGroups(data ?? []);
      } catch {
        // silent — see comment above
      }
    }
    loadGroups();
    return () => {
      cancelled = true;
    };
  }, [weddingId]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${planBase}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "generate failed");
      }
      const result = (await res.json()) as { score: number; warnings: Warning[] };
      setScore(result.score);
      setWarnings(result.warnings ?? []);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "aplica um template primeiro"
          ? "Aplica um template primeiro."
          : "Não foi possível gerar o plano de mesas."
      );
    } finally {
      setGenerating(false);
    }
  }, [planBase, refresh]);

  // Optimistic local update + persist via PUT; live `violations` (below) picks
  // up the change on next render. Reverts and surfaces an error if the PUT fails.
  const assign = useCallback(
    async (guestId: string, tableId: string | null) => {
      let previous: string | null = null;
      setGuests((prev) =>
        prev.map((g) => {
          if (g.id !== guestId) return g;
          previous = g.assignedTableId;
          return { ...g, assignedTableId: tableId };
        })
      );
      try {
        const res = await fetch(`${planBase}/assignment`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments: [{ guestId, tableId }] }),
        });
        if (!res.ok) throw new Error("assign failed");
      } catch {
        setGuests((prev) =>
          prev.map((g) => (g.id === guestId ? { ...g, assignedTableId: previous } : g))
        );
        setError("Não foi possível guardar a alteração.");
      }
    },
    [planBase]
  );

  // Optimistic local update + persist via PATCH. Reverts and surfaces an error if the
  // PATCH fails. Locked guests are excluded from Generate by the engine (Task 3).
  const toggleGuestLock = useCallback(
    async (guestId: string, locked: boolean) => {
      let previous = false;
      setGuests((prev) =>
        prev.map((g) => {
          if (g.id !== guestId) return g;
          previous = g.locked;
          return { ...g, locked };
        })
      );
      try {
        const res = await fetch(`/api/guests/${guestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locked }),
        });
        if (!res.ok) throw new Error("lock toggle failed");
      } catch {
        setGuests((prev) => prev.map((g) => (g.id === guestId ? { ...g, locked: previous } : g)));
        setError("Não foi possível guardar o bloqueio do convidado.");
      }
    },
    []
  );

  // Same optimistic pattern as toggleGuestLock, for tables. Fixed tables are excluded
  // from Generate's re-seating pass (Task 3).
  const toggleTableFixed = useCallback(
    async (tableId: string, fixed: boolean) => {
      let previous = false;
      setTables((prev) =>
        prev.map((t) => {
          if (t.id !== tableId) return t;
          previous = t.fixed;
          return { ...t, fixed };
        })
      );
      try {
        const res = await fetch(`/api/tables/${tableId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fixed }),
        });
        if (!res.ok) throw new Error("fixed toggle failed");
      } catch {
        setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, fixed: previous } : t)));
        setError("Não foi possível guardar a mesa fixa.");
      }
    },
    []
  );

  // Same optimistic PATCH pattern as toggleTableFixed, for a table's name (Plan 18
  // Task 4 — double-click rename on the seating plan). `null`/empty clears the
  // custom name, falling back to the "Mesa N" label everywhere it's displayed.
  const renameTable = useCallback(
    async (tableId: string, name: string | null) => {
      let previous: string | null | undefined = null;
      setTables((prev) =>
        prev.map((t) => {
          if (t.id !== tableId) return t;
          previous = t.name ?? null;
          return { ...t, name };
        })
      );
      try {
        const res = await fetch(`/api/tables/${tableId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error("rename failed");
      } catch {
        setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, name: previous ?? null } : t)));
        setError("Não foi possível guardar o nome da mesa.");
      }
    },
    []
  );

  // Exchanges guestA's and guestB's assignedTableId in one optimistic update + single
  // PUT (both entries), so a partial failure can't leave the pair half-swapped server-side.
  // Reads current table ids from `guests` state synchronously (not from inside the
  // setGuests updater) — React doesn't guarantee that updater runs before the code
  // below it, so capturing the swap values there and using them for the PUT body
  // outside the updater sent stale/null values.
  const swap = useCallback(
    async (guestAId: string, guestBId: string) => {
      if (guestAId === guestBId) return;
      const a = guests.find((g) => g.id === guestAId);
      const b = guests.find((g) => g.id === guestBId);
      if (!a || !b) return;
      const prevA = a.assignedTableId;
      const prevB = b.assignedTableId;
      setGuests((prev) =>
        prev.map((g) => {
          if (g.id === guestAId) return { ...g, assignedTableId: prevB };
          if (g.id === guestBId) return { ...g, assignedTableId: prevA };
          return g;
        })
      );
      try {
        const res = await fetch(`${planBase}/assignment`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignments: [
              { guestId: guestAId, tableId: prevB },
              { guestId: guestBId, tableId: prevA },
            ],
          }),
        });
        if (!res.ok) throw new Error("swap failed");
      } catch {
        setGuests((prev) =>
          prev.map((g) => {
            if (g.id === guestAId) return { ...g, assignedTableId: prevA };
            if (g.id === guestBId) return { ...g, assignedTableId: prevB };
            return g;
          })
        );
        setError("Não foi possível trocar os convidados de mesa.");
      }
    },
    [planBase, guests]
  );

  // Shared persist step for move/add/remove: PUTs the full next table set (each
  // entry carrying its existing `id` when it has one — the server's saveWeddingTables
  // treats a recognized id as "update in place" and an omitted/unrecognized id as
  // "create new", so kept/moved tables never lose their id and never disturb the
  // guests already seated there). Always re-`refresh()`s afterward so newly created
  // tables pick up their real DB id and any unassigned-by-removal guests show up in
  // the tray. Reverts the optimistic local table list on failure.
  const persistTables = useCallback(
    async (next: PlanTable[], previous: PlanTable[]) => {
      setSavingTables(true);
      setError(null);
      try {
        const res = await fetch(`${planBase}/tables`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tables: next.map((t) => ({
              id: t.id,
              shape: t.shape,
              capacity: t.capacity,
              x: t.x,
              y: t.y,
              fixed: t.fixed,
              width: t.width ?? undefined,
              depth: t.depth ?? undefined,
              minCapacity: t.minCapacity ?? undefined,
              // Carried through as-is (not just for newly-added tables) so an
              // unrelated move/add/remove round-trip never blanks out a table's
              // existing name/heads — the server's update path (saveWeddingTables)
              // writes exactly what's sent here.
              name: t.name ?? null,
              heads: t.heads ?? null,
            })),
          }),
        });
        if (!res.ok) throw new Error("save tables failed");
        await refresh();
      } catch {
        setTables(previous);
        setError("Não foi possível guardar as alterações às mesas.");
      } finally {
        setSavingTables(false);
      }
    },
    [planBase, refresh]
  );

  // Drags a table to a new position (natural/image-pixel space) and persists it.
  // Optimistic: applied to local state immediately so Konva doesn't snap the shape
  // back to its pre-drag position while the PUT is in flight.
  const moveTable = useCallback(
    (tableId: string, to: { x: number; y: number }) => {
      const previous = tables;
      const next = tables.map((t) => (t.id === tableId ? { ...t, x: to.x, y: to.y } : t));
      setTables(next);
      void persistTables(next, previous);
    },
    [tables, persistTables]
  );

  // Places a new table (from the venue's table-type catalog, or a generic default)
  // at `at` (natural/image-pixel space) and persists it. The placeholder id is
  // discarded by the follow-up refresh() once the server assigns a real one.
  const addTable = useCallback(
    (preset: TablePlacementPreset, at: { x: number; y: number }) => {
      const previous = tables;
      const placeholder: PlanTable = {
        id: `tmp-${Date.now()}`,
        floorPlanId: null,
        shape: preset.shape ?? "round",
        capacity: preset.capacity ?? 8,
        minCapacity: preset.minCapacity ?? undefined,
        x: at.x,
        y: at.y,
        fixed: false,
        width: preset.width ?? undefined,
        depth: preset.depth ?? undefined,
      };
      const next = [...tables, placeholder];
      setTables(next);
      void persistTables(next, previous);
    },
    [tables, persistTables]
  );

  // Removes a table and persists the smaller set; the server unassigns (only)
  // that table's seated guests, who then reappear in the unassigned tray on refresh.
  const removeTable = useCallback(
    (tableId: string) => {
      const previous = tables;
      const next = tables.filter((t) => t.id !== tableId);
      setTables(next);
      void persistTables(next, previous);
    },
    [tables, persistTables]
  );

  // Generic decorative elements (bar, dance floor, ...) — layout mode only.
  // Optimistic local update + PUT of the full next set, reverting on failure.
  const persistElements = useCallback(
    async (next: RoomElement[], previous: RoomElement[]) => {
      setElements(next);
      try {
        const res = await fetch(`${planBase}/elements`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ elements: next }),
        });
        if (!res.ok) throw new Error("save elements failed");
      } catch {
        setElements(previous);
        setError("Não foi possível guardar os elementos.");
      }
    },
    [planBase]
  );

  const addElement = useCallback(
    (el: { label: string; w: number; h: number; color?: string }, at: { x: number; y: number }) => {
      const previous = elements;
      const next: RoomElement[] = [
        ...elements,
        {
          id: `el-${Date.now()}`,
          x: at.x - el.w / 2,
          y: at.y - el.h / 2,
          w: el.w,
          h: el.h,
          label: el.label,
          color: el.color ?? "#6e8c66",
        },
      ];
      void persistElements(next, previous);
    },
    [elements, persistElements]
  );

  const moveElement = useCallback(
    (id: string, to: { x: number; y: number }) => {
      const previous = elements;
      const next = elements.map((e) => (e.id === id ? { ...e, x: to.x, y: to.y } : e));
      void persistElements(next, previous);
    },
    [elements, persistElements]
  );

  const removeElement = useCallback(
    (id: string) => {
      const previous = elements;
      void persistElements(elements.filter((e) => e.id !== id), previous);
    },
    [elements, persistElements]
  );

  const violations: PlanViolations = useMemo(
    () => planViolations(guests, tables, constraints),
    [guests, tables, constraints]
  );

  // Derived color map for the selected attribute — recomputed only when the guest list
  // or the chosen attribute changes. `null` (no attribute selected) yields empty maps,
  // which both PlanCanvas (no tinting) and the legend (nothing to render) treat as "off".
  const colorMap = useMemo(
    () => (colorAttr ? buildColorMap(guests, colorAttr) : { legend: [], colorByGuest: {} }),
    [guests, colorAttr]
  );

  return {
    guests,
    tables,
    constraints,
    groups,
    layout,
    layoutMeta,
    templates,
    venueId,
    venueTableTypes,
    loading,
    generating,
    applying,
    savingTables,
    error,
    score,
    warnings,
    refresh,
    generate,
    applyTemplate,
    assign,
    toggleGuestLock,
    toggleTableFixed,
    renameTable,
    swap,
    moveTable,
    addTable,
    removeTable,
    elements,
    addElement,
    moveElement,
    removeElement,
    violations,
    colorAttr,
    setColorAttr,
    colorMap,
  };
}
