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
import ConstraintsPanel from "@/components/guests/ConstraintsPanel";
import { Button, Badge } from "@/components/ui";
import type { AttributeKey } from "@/lib/plan/colors";
import { imageUrlFor } from "@/lib/images";

const COLOR_ATTR_OPTIONS: { label: string; value: AttributeKey | "" }[] = [
  { label: "Nenhum", value: "" },
  { label: "Faixa etária", value: "ageGroup" },
  { label: "Género", value: "gender" },
  { label: "Alimentar", value: "dietary" },
  { label: "Grupo", value: "group" },
];

const AGE_GROUP_LABELS: Record<string, string> = {
  adult: "adulto",
  child: "criança",
  senior: "idoso",
};

function legendLabel(attr: AttributeKey, value: string, groups: PlanGroup[]): string {
  if (attr === "ageGroup") return AGE_GROUP_LABELS[value] ?? value;
  if (attr === "group") return groups.find((g) => g.id === value)?.name ?? value;
  return value;
}

const PlanCanvas = dynamic(() => import("@/components/plan/PlanCanvas"), { ssr: false });

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;

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

export default function LayoutPlanPage() {
  const params = useParams<{ id: string; layoutId: string }>();
  const weddingId = params.id;
  const layoutId = params.layoutId;

  const {
    guests,
    tables,
    groups,
    layout,
    layoutMeta,
    venueTableTypes,
    loading,
    generating,
    savingTables,
    error,
    score,
    warnings,
    generate,
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
  } = usePlan(weddingId, layoutId);

  // Table-editing mode (add / move / remove) — mutually exclusive with seating.
  const [editMode, setEditMode] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [presetId, setPresetId] = useState<string>("");
  // Element-editing (bar, dance floor, ...) — mutually exclusive with add-table.
  const [addElMode, setAddElMode] = useState(false);
  const [elLabel, setElLabel] = useState("Pista de dança");

  // Whether this layout's moment has a seating plan — gates all the guest-seating
  // UI. Defaults to true until the plan payload loads.
  const seatingEnabled = layoutMeta?.hasSeating ?? true;
  const backHref = layoutMeta?.momentId
    ? `/admin/wedding/${weddingId}/moment/${layoutMeta.momentId}`
    : `/admin/wedding/${weddingId}/details`;

  const hasTables = tables.length > 0;
  // `elements` now comes from usePlan (mutable + persisted); no local parse.

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
        name: t.name,
        heads: t.heads,
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

  // The preset a click places while in add-table mode: a chosen venue table-type,
  // else a generic round-8. Placed at the click position (natural pixels).
  function placeAt(at: { x: number; y: number }) {
    const preset = venueTableTypes.find((tt) => tt.id === presetId);
    addTable(
      preset
        ? {
            shape: preset.shape,
            capacity: preset.maxSeats,
            minCapacity: preset.minSeats,
            width: preset.width,
            depth: preset.depth,
          }
        : { shape: "round", capacity: 8 },
      at
    );
    setAddMode(false);
  }

  // Places a generic rectangular element (bar, dance floor, ...) at the click.
  // Default size ~4×3 m converted to natural pixels via the layout's scale.
  function placeElementAt(at: { x: number; y: number }) {
    const scale = layout?.scale && layout.scale > 0 ? layout.scale : 50;
    addElement({ label: elLabel.trim() || "Elemento", w: 4 * scale, h: 3 * scale }, at);
    setAddElMode(false);
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <p style={{ marginBottom: 8 }}>
        <Link href={backHref} style={{ color: "var(--text-muted)" }}>
          &larr; Voltar ao momento
        </Link>
      </p>
      <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {layoutMeta?.name ?? "Layout"}
        {layoutMeta?.isFinal && <Badge tone="accent">Final</Badge>}
        {!seatingEnabled && <Badge tone="neutral">Sem lugares marcados</Badge>}
      </h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <Button
          variant={editMode ? "secondary" : "primary"}
          onClick={() => {
            // Leaving edit mode also leaves the add sub-modes.
            setEditMode((v) => !v);
            setAddMode(false);
            setAddElMode(false);
          }}
        >
          {editMode ? "Concluir edição" : "Editar mesas e elementos"}
        </Button>

        {editMode && (
          <>
            <Button
              variant={addMode ? "primary" : "secondary"}
              onClick={() => {
                setAddMode((v) => !v);
                setAddElMode(false);
              }}
            >
              {addMode ? "A adicionar mesa… (clica)" : "Adicionar mesa"}
            </Button>
            <label style={{ fontSize: 13 }}>
              Tipo:{" "}
              <select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                <option value="">Redonda (8)</option>
                {venueTableTypes.map((tt) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.name} ({tt.maxSeats})
                  </option>
                ))}
              </select>
            </label>

            <Button
              variant={addElMode ? "primary" : "secondary"}
              onClick={() => {
                setAddElMode((v) => !v);
                setAddMode(false);
              }}
            >
              {addElMode ? "A adicionar elemento… (clica)" : "Adicionar elemento"}
            </Button>
            <label style={{ fontSize: 13 }}>
              Nome:{" "}
              <input value={elLabel} onChange={(e) => setElLabel(e.target.value)} style={{ width: 130 }} />
            </label>
            {savingTables && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>A guardar…</span>}
          </>
        )}

        {!editMode && seatingEnabled && (
          <Button variant="primary" onClick={generate} disabled={!hasTables || generating} loading={generating}>
            {generating ? "A gerar..." : "Gerar sentada"}
          </Button>
        )}

        {score !== null && !editMode && seatingEnabled && (
          <Badge tone="accent" className="app-header-role">
            <span data-testid="plan-score">Score: {score.toFixed(2)}</span>
          </Badge>
        )}
        {loading && <span style={{ color: "var(--text-muted)" }}>A carregar...</span>}

        {!editMode && seatingEnabled && (
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
        )}
      </div>

      {editMode && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: -4 }}>
          Arrasta as mesas para as posicionar. Usa <strong>Adicionar mesa</strong> e clica na sala para
          colocar; o botão de remover aparece em cada mesa. A sentada mantém-se ao mover mesas.
        </p>
      )}

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {!editMode && seatingEnabled && (
        <details style={{ marginBottom: 16, border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "8px 12px", background: "var(--surface)" }}>
          <summary style={{ cursor: "pointer", fontWeight: 500 }}>
            Restrições entre convidados{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 13 }}>
              (quem fica junto / separado ao gerar)
            </span>
          </summary>
          <div style={{ marginTop: 12 }}>
            <ConstraintsPanel weddingId={weddingId} guests={guests} />
          </div>
        </details>
      )}

      {!hasTables && !editMode && (
        <p>
          Este layout ainda não tem mesas. Carrega em <strong>Editar mesas</strong> para as adicionar.
        </p>
      )}

      {(hasTables || editMode) && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <PlanCanvas
            imageUrl={imageUrlFor(layout?.image ?? "")}
            tables={tableViews}
            scale={layout?.scale ?? 0}
            roomWidth={layout?.width ?? 0}
            roomDepth={layout?.depth ?? 0}
            zones={[]}
            elements={elements}
            overCapacityIds={violations.overCapacity}
            maxWidth={CANVAS_WIDTH}
            maxHeight={CANVAS_HEIGHT}
            onAssign={assign}
            onToggleGuestLock={toggleGuestLock}
            onToggleTableFixed={toggleTableFixed}
            onSwap={swap}
            onRenameTable={renameTable}
            colorByGuest={colorMap.colorByGuest}
            editMode={editMode}
            addTableMode={editMode && addMode}
            onMoveTable={moveTable}
            onAddTableAt={placeAt}
            onRemoveTable={removeTable}
            addElementMode={editMode && addElMode}
            onMoveElement={moveElement}
            onAddElementAt={placeElementAt}
            onRemoveElement={removeElement}
          />

          {!editMode && seatingEnabled && (
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
                          style={{ width: 14, height: 14, borderRadius: 3, background: entry.color, display: "inline-block", flexShrink: 0 }}
                        />
                        {legendLabel(colorAttr, entry.value, groups)}
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
          )}
        </div>
      )}

      {hasTables && !editMode && seatingEnabled && (
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
