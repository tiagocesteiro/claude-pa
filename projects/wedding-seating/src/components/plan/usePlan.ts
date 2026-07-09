"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Warning } from "@/lib/seating";
import { planViolations, type PlanViolations } from "@/lib/plan/validate";
import { buildColorMap, type AttributeKey } from "@/lib/plan/colors";

export interface PlanGuest {
  id: string;
  weddingId: string;
  name: string;
  groupId: string | null;
  assignedTableId: string | null;
  locked: boolean;
  ageGroup: string | null;
  gender: string | null;
  dietary: string | null;
}

export interface PlanTable {
  id: string;
  floorPlanId: string;
  shape: string;
  capacity: number;
  x: number;
  y: number;
  fixed: boolean;
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

export function usePlan(weddingId: string, floorPlanId: string | null) {
  const [guests, setGuests] = useState<PlanGuest[]>([]);
  const [tables, setTables] = useState<PlanTable[]>([]);
  const [constraints, setConstraints] = useState<PlanConstraint[]>([]);
  const [groups, setGroups] = useState<PlanGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [colorAttr, setColorAttr] = useState<AttributeKey | null>(null);

  const refresh = useCallback(async () => {
    if (!floorPlanId) {
      setGuests([]);
      setTables([]);
      setConstraints([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/weddings/${weddingId}/plan?floorPlanId=${encodeURIComponent(floorPlanId)}`
      );
      if (!res.ok) throw new Error("failed to load plan");
      const data = (await res.json()) as {
        guests: PlanGuest[];
        tables: PlanTable[];
        constraints: PlanConstraint[];
      };
      setGuests(data.guests ?? []);
      setTables(data.tables ?? []);
      setConstraints(data.constraints ?? []);
    } catch {
      setError("Não foi possível carregar o plano.");
    } finally {
      setLoading(false);
    }
  }, [weddingId, floorPlanId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load + reload on floor-plan change
    refresh();
  }, [refresh]);

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
    if (!floorPlanId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ floorPlanId }),
      });
      if (!res.ok) throw new Error("generate failed");
      const result = (await res.json()) as { score: number; warnings: Warning[] };
      setScore(result.score);
      setWarnings(result.warnings ?? []);
      await refresh();
    } catch {
      setError("Não foi possível gerar o plano de mesas.");
    } finally {
      setGenerating(false);
    }
  }, [weddingId, floorPlanId, refresh]);

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
        const res = await fetch(`/api/weddings/${weddingId}/assignment`, {
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
    [weddingId]
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
        const res = await fetch(`/api/weddings/${weddingId}/assignment`, {
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
    [weddingId, guests]
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
    loading,
    generating,
    error,
    score,
    warnings,
    refresh,
    generate,
    assign,
    toggleGuestLock,
    toggleTableFixed,
    swap,
    violations,
    colorAttr,
    setColorAttr,
    colorMap,
  };
}
