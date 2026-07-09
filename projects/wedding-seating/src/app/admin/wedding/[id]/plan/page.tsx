"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Warning } from "@/lib/seating";
import { usePlan, type PlanGroup, type PlanGuest } from "@/components/plan/usePlan";
import type { PlanTableView } from "@/components/plan/PlanCanvas";
import UnassignedTray from "@/components/plan/UnassignedTray";
import TableList, { type TableListRow } from "@/components/plan/TableList";
import type { AttributeKey } from "@/lib/plan/colors";

// "Pintar por" control options — label shown to the user vs. the AttributeKey (or ""
// for "no color") passed to setColorAttr / buildColorMap.
const COLOR_ATTR_OPTIONS: { label: string; value: AttributeKey | "" }[] = [
  { label: "Nenhum", value: "" },
  { label: "Faixa etária", value: "ageGroup" },
  { label: "Género", value: "gender" },
  { label: "Alimentar", value: "dietary" },
];

// Same "adult"/"child"/"senior" -> Portuguese mapping as TableList, used for the legend's
// value labels when coloring by ageGroup (gender/dietary values are shown as stored).
const AGE_GROUP_LABELS: Record<string, string> = {
  adult: "adulto",
  child: "criança",
  senior: "idoso",
};

function legendLabel(attr: AttributeKey, value: string): string {
  return attr === "ageGroup" ? (AGE_GROUP_LABELS[value] ?? value) : value;
}

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

// Resolves an engine warning to a human-readable, NAME-based message: group-split looks up
// warning.groupId in the groups list, together-split/separate-unsatisfiable look up both ids
// in warning.guestIds. Falls back to the engine's raw message if a lookup misses (e.g. group
// or guest was deleted since the plan was generated).
function resolveWarningText(w: Warning, groups: PlanGroup[], guests: PlanGuest[]): string {
  if (w.kind === "group-split" && w.groupId) {
    const group = groups.find((g) => g.id === w.groupId);
    if (group) return `O grupo "${group.name}" ficou dividido por mais do que uma mesa.`;
  }
  if ((w.kind === "together-split" || w.kind === "separate-unsatisfiable") && w.guestIds) {
    const [aId, bId] = w.guestIds;
    const a = guests.find((g) => g.id === aId);
    const b = guests.find((g) => g.id === bId);
    if (a && b) {
      return w.kind === "together-split"
        ? `${a.name} e ${b.name} deviam ficar juntos mas ficaram em mesas diferentes.`
        : `${a.name} e ${b.name} deviam ficar separados mas ficaram na mesma mesa.`;
    }
  }
  return w.message;
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
    groups,
    loading,
    generating,
    error,
    score,
    warnings,
    generate,
    assign,
    toggleGuestLock,
    toggleTableFixed,
    swap,
    violations,
    colorAttr,
    setColorAttr,
    colorMap,
  } = usePlan(weddingId, floorPlanId);

  const selectedFloorPlan = floorPlans.find((f) => f.id === floorPlanId);

  // Stable, human labels ("Mesa 1", "Mesa 2", ...) derived from table order — used by the
  // canvas, the warnings list, and the TableList so a table reads the same everywhere
  // instead of showing a raw id.
  const tableLabels = useMemo(() => {
    const map = new Map<string, string>();
    tables.forEach((t, i) => map.set(t.id, `Mesa ${i + 1}`));
    return map;
  }, [tables]);

  const tableViews: PlanTableView[] = useMemo(
    () =>
      tables.map((t) => ({
        id: t.id,
        shape: t.shape,
        capacity: t.capacity,
        x: t.x,
        y: t.y,
        label: tableLabels.get(t.id),
        fixed: t.fixed,
        guests: guests
          .filter((g) => g.assignedTableId === t.id)
          .map((g) => ({ id: g.id, name: g.name, locked: g.locked })),
      })),
    [tables, guests, tableLabels]
  );

  const unassigned = guests.filter((g) => g.assignedTableId === null);

  const tableListRows: TableListRow[] = useMemo(
    () =>
      tables.map((t) => {
        const seated = guests.filter((g) => g.assignedTableId === t.id);
        return {
          id: t.id,
          label: tableLabels.get(t.id) ?? t.id.slice(0, 6),
          occupancy: seated.length,
          capacity: t.capacity,
          guests: seated.map((g) => ({
            id: g.id,
            name: g.name,
            ageGroup: g.ageGroup,
            gender: g.gender,
            dietary: g.dietary,
          })),
          overCapacity: violations.overCapacity.includes(t.id),
        };
      }),
    [tables, guests, tableLabels, violations.overCapacity]
  );

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
        <label>
          Pintar por:{" "}
          <select
            data-testid="color-attr-select"
            value={colorAttr ?? ""}
            onChange={(e) => setColorAttr((e.target.value || null) as AttributeKey | null)}
          >
            {COLOR_ATTR_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
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
            onAssign={assign}
            onToggleGuestLock={toggleGuestLock}
            onToggleTableFixed={toggleTableFixed}
            onSwap={swap}
            colorByGuest={colorMap.colorByGuest}
          />

          <div style={{ minWidth: 260, flex: "0 0 260px", display: "flex", flexDirection: "column", gap: 16 }}>
            {colorAttr && colorMap.legend.length > 0 && (
              <div data-testid="color-legend" style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Legenda</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {colorMap.legend.map((entry) => (
                    <li
                      key={entry.value}
                      data-testid={`legend-entry-${entry.value}`}
                      style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          background: entry.color,
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      {legendLabel(colorAttr, entry.value)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Avisos</h3>
              {!hasWarnings && <p style={{ fontSize: 13, color: "#666" }}>Sem avisos.</p>}
              <ul style={{ paddingLeft: 18, fontSize: 13, margin: 0 }}>
                {warnings.map((w, i) => (
                  <li key={`w-${i}`} style={{ color: "#d97706" }}>
                    {resolveWarningText(w, groups, guests)}
                  </li>
                ))}
                {violations.overCapacity.map((id) => {
                  const t = tables.find((tb) => tb.id === id);
                  const occ = t ? guests.filter((g) => g.assignedTableId === id).length : 0;
                  return (
                    <li key={`oc-${id}`} style={{ color: "#dc2626" }}>
                      {tableLabels.get(id) ?? id.slice(0, 6)} está acima da capacidade ({occ}/{t?.capacity ?? "?"}).
                    </li>
                  );
                })}
                {violations.separated.map((s, i) => {
                  const nameA = guests.find((g) => g.id === s.a)?.name ?? s.a;
                  const nameB = guests.find((g) => g.id === s.b)?.name ?? s.b;
                  return (
                    <li key={`sep-${i}`} style={{ color: "#dc2626" }}>
                      Convidados que deviam estar separados partilham mesa ({nameA} / {nameB}).
                    </li>
                  );
                })}
              </ul>
            </div>

            <UnassignedTray
              guests={unassigned.map((g) => ({ id: g.id, name: g.name, locked: g.locked }))}
              onDrop={(guestId) => assign(guestId, null)}
              onToggleGuestLock={toggleGuestLock}
              onSwap={swap}
            />
          </div>
        </div>
      )}

      {floorPlanId && (
        <TableList
          rows={tableListRows}
          unassigned={unassigned.map((g) => ({
            id: g.id,
            name: g.name,
            ageGroup: g.ageGroup,
            gender: g.gender,
            dietary: g.dietary,
          }))}
        />
      )}
    </main>
  );
}
