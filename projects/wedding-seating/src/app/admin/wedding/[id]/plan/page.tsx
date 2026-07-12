"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import type { Warning } from "@/lib/seating";
import { usePlan, type PlanGroup, type PlanGuest, type TablePlacementPreset } from "@/components/plan/usePlan";
import type { PlanTableView } from "@/components/plan/PlanCanvas";
import UnassignedTray from "@/components/plan/UnassignedTray";
import TableList, { type TableListRow } from "@/components/plan/TableList";
import type { AttributeKey } from "@/lib/plan/colors";
import type { Point } from "@/lib/floorplan/geometry";
import { pointInPolygon } from "@/lib/floorplan/boundary";
import { spacingViolations } from "@/lib/floorplan/spacing";

function normalizeShape(shape: string): "round" | "oval" | "rect" {
  return shape === "oval" || shape === "rect" ? shape : "round";
}

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

  const {
    guests,
    tables,
    groups,
    layout,
    templates,
    venueTableTypes,
    loading,
    generating,
    applying,
    savingTables,
    error,
    score,
    warnings,
    generate,
    applyTemplate,
    assign,
    toggleGuestLock,
    toggleTableFixed,
    swap,
    moveTable,
    addTable,
    removeTable,
    violations,
    colorAttr,
    setColorAttr,
    colorMap,
  } = usePlan(weddingId);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [editMode, setEditMode] = useState(false);
  const [addTableMode, setAddTableMode] = useState(false);
  const [presetTypeId, setPresetTypeId] = useState("");

  const hasTables = tables.length > 0;

  // Zones are stored as a JSON string on the floor plan; parsed once per layout change
  // for the read-only background layer (same shape the editor works with in-memory).
  const zones: Point[][] = useMemo(() => {
    if (!layout?.zones) return [];
    try {
      return JSON.parse(layout.zones) as Point[][];
    } catch {
      return [];
    }
  }, [layout?.zones]);

  async function handleApplyTemplate() {
    if (!selectedTemplateId) return;
    if (hasTables) {
      const confirmed = window.confirm(
        "Aplicar este template substitui as mesas atuais e limpa os lugares já atribuídos. Continuar?"
      );
      if (!confirmed) return;
    }
    await applyTemplate(selectedTemplateId);
  }

  // Out-of-zone: a table is flagged when its center falls inside NONE of the applied
  // template's zones (same "outside every zone" rule the template editor uses).
  const outOfZoneIds = useMemo(() => {
    if (zones.length === 0) return [] as string[];
    return tables.filter((t) => !zones.some((zone) => pointInPolygon({ x: t.x, y: t.y }, zone))).map((t) => t.id);
  }, [tables, zones]);

  // Spacing: reuses the same check as the template editor. minSpacing isn't part of
  // the wedding's layout payload (only floorPlanId/image/scale/zones), so this falls
  // back to 0 — spacingViolations then only ever flags literally overlapping tables,
  // never a false positive.
  const spacingIssues = useMemo(
    () => spacingViolations(tables, 0, layout?.scale || 1),
    [tables, layout?.scale]
  );
  const spacingWarnIds = useMemo(
    () => new Set(spacingIssues.flatMap((v) => [v.a, v.b])),
    [spacingIssues]
  );

  function presetFor(typeId: string): TablePlacementPreset | undefined {
    const t = venueTableTypes.find((tt) => tt.id === typeId);
    if (!t) return undefined;
    return {
      shape: normalizeShape(t.shape),
      capacity: t.maxSeats,
      minCapacity: t.minSeats,
      width: t.width,
      depth: t.depth,
    };
  }

  function handleAddTableAt(at: Point) {
    addTable(presetFor(presetTypeId) ?? {}, at);
  }

  function handleToggleEditMode() {
    setEditMode((m) => !m);
    setAddTableMode(false);
  }

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
        width: t.width,
        depth: t.depth,
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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1>Plano de mesas</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <label>
          Template:{" "}
          <select
            data-testid="template-select"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
          >
            <option value="">
              {templates.length === 0 ? "Nenhum template disponível" : "Escolhe um template"}
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.venue?.name ?? "?"} — {t.name} — {t.minGuests}-{t.maxGuests}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          data-testid="apply-template-button"
          onClick={handleApplyTemplate}
          disabled={!selectedTemplateId || applying}
        >
          {applying ? "A aplicar..." : "Usar este template"}
        </button>
        <button type="button" onClick={generate} disabled={!hasTables || generating}>
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
        {hasTables && (
          <button
            type="button"
            data-testid="edit-tables-toggle"
            onClick={handleToggleEditMode}
            style={{ fontWeight: editMode ? 700 : 400 }}
          >
            {editMode ? "Concluir edição de mesas" : "Editar mesas"}
          </button>
        )}
        {savingTables && <span style={{ color: "#666" }}>A guardar mesas...</span>}
      </div>

      {editMode && (
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            background: "#f9fafb",
          }}
        >
          <strong>A editar as mesas deste casamento — o template da venue não é alterado.</strong>
          <label>
            Tipo de mesa:{" "}
            <select
              data-testid="table-type-select"
              value={presetTypeId}
              onChange={(e) => setPresetTypeId(e.target.value)}
            >
              <option value="">Genérica (redonda, 8 lugares)</option>
              {venueTableTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            data-testid="add-table-mode-toggle"
            onClick={() => setAddTableMode((m) => !m)}
            style={{ fontWeight: addTableMode ? 700 : 400 }}
          >
            {addTableMode ? "A adicionar — clica no mapa" : "Adicionar do catálogo"}
          </button>
          <span style={{ fontSize: 13, color: "#666" }}>
            Arrasta uma mesa para a mover; usa o × para a remover (os convidados sentados ficam por atribuir).
          </span>
          {(spacingWarnIds.size > 0 || outOfZoneIds.length > 0) && (
            <span style={{ fontSize: 13 }}>
              {spacingWarnIds.size > 0 && (
                <span data-testid="edit-spacing-warning" style={{ color: "#f59e0b", marginRight: 8 }}>
                  {spacingWarnIds.size} mesa(s) demasiado próximas.
                </span>
              )}
              {outOfZoneIds.length > 0 && (
                <span data-testid="edit-zone-warning" style={{ color: "#dc2626" }}>
                  {outOfZoneIds.length} mesa(s) fora de qualquer zona.
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {!hasTables && (
        <p>Escolhe um template acima e clica em &quot;Usar este template&quot; para começar.</p>
      )}

      {hasTables && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <PlanCanvas
            imageUrl={imageUrlFor(layout?.image ?? "")}
            tables={tableViews}
            scale={layout?.scale ?? 0}
            zones={zones}
            overCapacityIds={violations.overCapacity}
            maxWidth={CANVAS_WIDTH}
            maxHeight={CANVAS_HEIGHT}
            onAssign={assign}
            onToggleGuestLock={toggleGuestLock}
            onToggleTableFixed={toggleTableFixed}
            onSwap={swap}
            colorByGuest={colorMap.colorByGuest}
            editMode={editMode}
            addTableMode={addTableMode}
            onMoveTable={moveTable}
            onAddTableAt={handleAddTableAt}
            onRemoveTable={removeTable}
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

      {hasTables && (
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
    </div>
  );
}
