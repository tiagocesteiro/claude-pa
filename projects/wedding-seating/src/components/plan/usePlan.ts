"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Warning } from "@/lib/seating";
import { planViolations, type PlanViolations } from "@/lib/plan/validate";

export interface PlanGuest {
  id: string;
  weddingId: string;
  name: string;
  groupId: string | null;
  assignedTableId: string | null;
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

export function usePlan(weddingId: string, floorPlanId: string | null) {
  const [guests, setGuests] = useState<PlanGuest[]>([]);
  const [tables, setTables] = useState<PlanTable[]>([]);
  const [constraints, setConstraints] = useState<PlanConstraint[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);

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

  const violations: PlanViolations = useMemo(
    () => planViolations(guests, tables, constraints),
    [guests, tables, constraints]
  );

  return {
    guests,
    tables,
    constraints,
    loading,
    generating,
    error,
    score,
    warnings,
    refresh,
    generate,
    assign,
    violations,
  };
}
