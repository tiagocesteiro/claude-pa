"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePlan } from "@/components/plan/usePlan";
import type { PlanTableView } from "@/components/plan/PlanCanvas";

const PlanCanvas = dynamic(() => import("@/components/plan/PlanCanvas"), {
  ssr: false,
});

// Same on-screen bounds convention as the Plan 2 floor-plan editor; the stage
// fits inside this box preserving the uploaded image's aspect ratio.
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;

interface FloorPlanOption {
  id: string;
  image: string;
  venue?: { name: string };
}

function imageUrlFor(image: string): string | undefined {
  if (!image) return undefined;
  const rel = image.replace(/^data\/uploads\//, "").replace(/\\/g, "/");
  return `/api/uploads/${rel}`;
}

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const weddingId = params.id;

  const [floorPlans, setFloorPlans] = useState<FloorPlanOption[]>([]);
  const [floorPlanId, setFloorPlanId] = useState<string | null>(null);

  useEffect(() => {
    async function loadFloorPlans() {
      const res = await fetch("/api/floorplans");
      if (!res.ok) return;
      const data = (await res.json()) as FloorPlanOption[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
      setFloorPlans(data);
      setFloorPlanId((prev) => prev ?? (data.length > 0 ? data[0].id : null));
    }
    loadFloorPlans();
  }, []);

  const {
    guests,
    tables,
    loading,
    generating,
    error,
    score,
    warnings,
    generate,
    violations,
  } = usePlan(weddingId, floorPlanId);

  const selectedFloorPlan = floorPlans.find((f) => f.id === floorPlanId);

  const tableViews: PlanTableView[] = useMemo(
    () =>
      tables.map((t) => ({
        id: t.id,
        shape: t.shape,
        capacity: t.capacity,
        x: t.x,
        y: t.y,
        guestNames: guests.filter((g) => g.assignedTableId === t.id).map((g) => g.name),
      })),
    [tables, guests]
  );

  const unassigned = guests.filter((g) => g.assignedTableId === null);

  const hasWarnings =
    warnings.length > 0 || violations.overCapacity.length > 0 || violations.separated.length > 0;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <p>
        <Link href={`/admin/wedding/${weddingId}`}>&larr; Back to wedding</Link>
      </p>
      <h1>Plano de mesas</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <label>
          Floor plan:{" "}
          <select
            value={floorPlanId ?? ""}
            onChange={(e) => setFloorPlanId(e.target.value || null)}
          >
            {floorPlans.length === 0 && <option value="">Nenhum floor plan disponível</option>}
            {floorPlans.map((fp) => (
              <option key={fp.id} value={fp.id}>
                {fp.venue?.name ?? "?"} — {fp.id.slice(0, 6)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={generate} disabled={!floorPlanId || generating}>
          {generating ? "A gerar..." : "Generate"}
        </button>
        {score !== null && <span data-testid="plan-score">Score: {score.toFixed(2)}</span>}
        {loading && <span style={{ color: "#666" }}>A carregar...</span>}
      </div>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {!floorPlanId && <p>Escolhe um floor plan para começar.</p>}

      {floorPlanId && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <PlanCanvas
            imageUrl={imageUrlFor(selectedFloorPlan?.image ?? "")}
            tables={tableViews}
            overCapacityIds={violations.overCapacity}
            maxWidth={CANVAS_WIDTH}
            maxHeight={CANVAS_HEIGHT}
          />

          <div style={{ minWidth: 260, flex: "0 0 260px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Avisos</h3>
              {!hasWarnings && <p style={{ fontSize: 13, color: "#666" }}>Sem avisos.</p>}
              <ul style={{ paddingLeft: 18, fontSize: 13, margin: 0 }}>
                {warnings.map((w, i) => (
                  <li key={`w-${i}`} style={{ color: "#d97706" }}>
                    {w.message}
                  </li>
                ))}
                {violations.overCapacity.map((id) => {
                  const t = tables.find((tb) => tb.id === id);
                  const occ = t ? guests.filter((g) => g.assignedTableId === id).length : 0;
                  return (
                    <li key={`oc-${id}`} style={{ color: "#dc2626" }}>
                      Mesa {id.slice(0, 6)} está acima da capacidade ({occ}/{t?.capacity ?? "?"}).
                    </li>
                  );
                })}
                {violations.separated.map((s, i) => (
                  <li key={`sep-${i}`} style={{ color: "#dc2626" }}>
                    Convidados que deviam estar separados partilham mesa ({s.a} / {s.b}).
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Por atribuir ({unassigned.length})</h3>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: 400,
                  overflowY: "auto",
                }}
              >
                {unassigned.map((g) => (
                  <li
                    key={g.id}
                    style={{ border: "1px solid #ccc", borderRadius: 6, padding: "6px 8px" }}
                  >
                    {g.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
