"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import dynamic from "next/dynamic";
import type { CanvasMode } from "@/components/editor/FloorPlanCanvas";
import {
  editorReducer,
  initialEditorState,
  type EditorTable,
  type TablePreset,
} from "@/lib/floorplan/editorState";
import type { Point } from "@/lib/floorplan/geometry";
import { pointInPolygon } from "@/lib/floorplan/boundary";
import { spacingViolations } from "@/lib/floorplan/spacing";
import { parseElements, serializeElements, type RoomElement } from "@/lib/floorplan/elements";
import type { TableInput } from "@/lib/db/tables";

// Reuses the same canvas as the floor-plan/plan editors (Plan 2/12): image
// background + zones + realistic round/oval/rect table shapes + drag. Loaded
// dynamically because react-konva touches the DOM and can't run during SSR.
const FloorPlanCanvas = dynamic(() => import("@/components/editor/FloorPlanCanvas"), {
  ssr: false,
});

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

interface TableTypeRecord {
  id: string;
  name: string;
  shape: string;
  minSeats: number;
  maxSeats: number;
  width: number;
  depth: number;
}

interface FloorPlanRecord {
  id: string;
  venueId: string;
  image: string;
  name: string | null;
  scale: number;
  width: number;
  depth: number;
  minSpacing: number | null;
  zones: string | null;
  boundary: string | null;
  elements: string | null;
}

// Default size (metres) for a newly-placed room element, converted to natural pixels
// via the floor plan's scale — falls back to a fixed pixel size when uncalibrated
// (scale 0), same convention `tableRenderSize` uses for tables.
const DEFAULT_ELEMENT_WIDTH_M = 3;
const DEFAULT_ELEMENT_HEIGHT_M = 2;
const DEFAULT_ELEMENT_WIDTH_PX = 150;
const DEFAULT_ELEMENT_HEIGHT_PX = 100;

// A small fixed palette keeps element colors readable/consistent rather than an
// unconstrained color wheel — still a real <input type="color"> for anyone who wants
// something else.
const ELEMENT_COLOR_PALETTE = ["#60a5fa", "#f97316", "#34d399", "#a78bfa", "#f472b6", "#fbbf24"];

let elementCounter = 0;
function newElementId(): string {
  elementCounter += 1;
  return `el-${Date.now()}-${elementCounter}`;
}

function imageUrlFor(image: string): string | undefined {
  if (!image) return undefined;
  const rel = image.replace(/^data\/uploads\//, "").replace(/\\/g, "/");
  return `/api/uploads/${rel}`;
}

/** Zones (read-only background) for this layout: prefers the multi-zone field,
 * falling back to the legacy single `boundary` polygon (same migration the
 * floor-plan editor performs) so older layouts still render a background. */
function parseZones(fp: FloorPlanRecord | null): Point[][] {
  if (!fp) return [];
  try {
    if (fp.zones) return JSON.parse(fp.zones) as Point[][];
    if (fp.boundary) return [JSON.parse(fp.boundary) as Point[]];
  } catch {
    // malformed zone/boundary JSON on the floor plan — render with no zones
  }
  return [];
}

function normalizeShape(shape: string): "round" | "oval" | "rect" {
  return shape === "oval" || shape === "rect" ? shape : "round";
}

export interface TemplateTableEditorProps {
  templateId: string;
  venueId: string;
  floorPlanId: string;
  /** Display label for the chosen layout ("Planta N" fallback already resolved by the
   * caller, which knows the venue's full floor-plan list/order — Plan 18 Task 2). */
  layoutLabel?: string;
  /** Optional close affordance; the parent decides what "closing" means (e.g. collapse inline). */
  onClose?: () => void;
}

export default function TemplateTableEditor({
  templateId,
  venueId,
  floorPlanId,
  layoutLabel,
  onClose,
}: TemplateTableEditorProps) {
  const [state, dispatch] = useReducer(editorReducer, undefined, initialEditorState);
  const [floorPlan, setFloorPlan] = useState<FloorPlanRecord | null>(null);
  const [tableTypes, setTableTypes] = useState<TableTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<CanvasMode>("select");
  const [presetTypeId, setPresetTypeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Room elements (Plan 18 Task 8 — dance floor, bar, ...): unlike tables, these
  // aren't part of the reducer's "Guardar" save flow — each add/move/label/color/
  // delete persists immediately (same convention as `handleRenameTable` below and
  // the floor-plan editor's zone drawing), since they belong to the floor plan, not
  // the template's table set.
  const [elements, setElements] = useState<RoomElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [elementsSaveError, setElementsSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [tablesRes, fpRes, typesRes] = await Promise.all([
        fetch(`/api/templates/${templateId}/tables`),
        fetch(`/api/floorplans/${floorPlanId}`),
        fetch(`/api/venues/${venueId}/table-types`),
      ]);
      if (!tablesRes.ok) throw new Error("failed to load template tables");
      const tables = (await tablesRes.json()) as EditorTable[];
      dispatch({ type: "load", tables });
      const fp = fpRes.ok ? ((await fpRes.json()) as FloorPlanRecord) : null;
      setFloorPlan(fp);
      setElements(parseElements(fp?.elements));
      setTableTypes(typesRes.ok ? ((await typesRes.json()) as TableTypeRecord[]) : []);
    } catch {
      setLoadError("Failed to load editor data");
    } finally {
      setLoading(false);
    }
  }, [templateId, floorPlanId, venueId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    load();
  }, [load]);

  const zones = useMemo(() => parseZones(floorPlan), [floorPlan]);

  // Only real catalog table types can be placed (Plan 18 Task 2 — the old generic
  // round/8-seat default is gone). Once the catalog loads, default the picker to
  // the first type so `presetTypeId` is never a dangling/empty selection.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs the picker to the loaded catalog
    setPresetTypeId((prev) => {
      if (tableTypes.length === 0) return "";
      return tableTypes.some((t) => t.id === prev) ? prev : tableTypes[0].id;
    });
  }, [tableTypes]);

  const hasTableTypes = tableTypes.length > 0;

  function presetFor(typeId: string): TablePreset | undefined {
    const t = tableTypes.find((tt) => tt.id === typeId);
    if (!t) return undefined;
    return {
      shape: normalizeShape(t.shape),
      capacity: t.maxSeats,
      minCapacity: t.minSeats,
      width: t.width,
      depth: t.depth,
    };
  }

  function handleAddTable(at: Point) {
    dispatch({ type: "add-table", at, preset: presetFor(presetTypeId) });
  }

  function handleMoveTable(id: string, to: Point) {
    dispatch({ type: "move-table", id, to });
  }

  function handleDeleteTable(id: string) {
    dispatch({ type: "delete-table", id });
  }

  // Selecting a table vs. an element is mutually exclusive — each clears the other,
  // so the editor never shows both a table's and an element's controls at once.
  function handleSelectTable(id: string | null) {
    dispatch({ type: "select", id });
    setSelectedElementId(null);
  }

  function handleSelectElement(id: string) {
    setSelectedElementId(id);
    dispatch({ type: "select", id: null });
  }

  const persistElements = useCallback(
    async (next: RoomElement[]) => {
      setElementsSaveError(null);
      try {
        const res = await fetch(`/api/floorplans/${floorPlanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ elements: serializeElements(next) }),
        });
        if (!res.ok) throw new Error("failed to save elements");
      } catch {
        setElementsSaveError("Não foi possível guardar os elementos.");
      }
    },
    [floorPlanId]
  );

  // Places a default-sized rectangle centered on the click (natural-pixel space),
  // sized from the floor plan's real-world scale when calibrated, a fixed pixel
  // fallback otherwise (same convention `tableRenderSize` uses for tables).
  function handleAddElement(at: Point) {
    const scale = floorPlan?.scale ?? 0;
    const w = scale > 0 ? DEFAULT_ELEMENT_WIDTH_M * scale : DEFAULT_ELEMENT_WIDTH_PX;
    const h = scale > 0 ? DEFAULT_ELEMENT_HEIGHT_M * scale : DEFAULT_ELEMENT_HEIGHT_PX;
    const element: RoomElement = {
      id: newElementId(),
      x: at.x - w / 2,
      y: at.y - h / 2,
      w,
      h,
      label: "Novo elemento",
      color: ELEMENT_COLOR_PALETTE[elements.length % ELEMENT_COLOR_PALETTE.length],
    };
    const next = [...elements, element];
    setElements(next);
    setSelectedElementId(element.id);
    dispatch({ type: "select", id: null });
    void persistElements(next);
  }

  function handleMoveElement(id: string, to: Point) {
    const next = elements.map((e) => (e.id === id ? { ...e, x: to.x, y: to.y } : e));
    setElements(next);
    void persistElements(next);
  }

  function handleUpdateElement(id: string, patch: Partial<Pick<RoomElement, "label" | "color">>) {
    const next = elements.map((e) => (e.id === id ? { ...e, ...patch } : e));
    setElements(next);
    void persistElements(next);
  }

  // Resize keeps the element's CENTRE fixed (grows/shrinks symmetrically) so it
  // doesn't drift when you tweak a dimension. `dims` are in natural pixels.
  function handleResizeElement(id: string, dims: { w?: number; h?: number }) {
    const next = elements.map((e) => {
      if (e.id !== id) return e;
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      const w = dims.w != null && dims.w > 0 ? dims.w : e.w;
      const h = dims.h != null && dims.h > 0 ? dims.h : e.h;
      return { ...e, w, h, x: cx - w / 2, y: cy - h / 2 };
    });
    setElements(next);
    void persistElements(next);
  }

  function handleDeleteElement(id: string) {
    const next = elements.filter((e) => e.id !== id);
    setElements(next);
    if (selectedElementId === id) setSelectedElementId(null);
    void persistElements(next);
  }

  // Spacing: reuses the floor-plan spacing check against this layout's
  // minSpacing/scale (0 when uncalibrated — spacingViolations then only ever
  // flags literally overlapping tables, never a false positive).
  const violations = useMemo(
    () => spacingViolations(state.tables, floorPlan?.minSpacing ?? 0, floorPlan?.scale || 1),
    [state.tables, floorPlan]
  );
  const spacingIds = useMemo(() => new Set(violations.flatMap((v) => [v.a, v.b])), [violations]);

  // Out-of-zone: a table is flagged when its center falls inside NONE of the
  // layout's zones. No zones drawn yet = nothing to flag against.
  const outOfZoneIds = useMemo(() => {
    if (zones.length === 0) return [] as string[];
    return state.tables
      .filter((t) => !zones.some((zone) => pointInPolygon({ x: t.x, y: t.y }, zone)))
      .map((t) => t.id);
  }, [state.tables, zones]);

  const warningTableIds = useMemo(
    () => Array.from(new Set([...spacingIds, ...outOfZoneIds])),
    [spacingIds, outOfZoneIds]
  );

  const selectedTable = useMemo(
    () => state.tables.find((t) => t.id === state.selectedId),
    [state.tables, state.selectedId]
  );

  const selectedElement = useMemo(
    () => elements.find((e) => e.id === selectedElementId) ?? null,
    [elements, selectedElementId]
  );

  // Shared persist step: PUTs a given table set (saveTemplateTables deletes +
  // recreates every row, so this is always a full replace — there's no partial
  // "just this field" path). Used by both the "Guardar" button (persists
  // whatever's in `state.tables`) and double-click rename (Plan 18 Task 4),
  // which computes its own `next` array up front rather than reading
  // `state.tables` right after dispatching — a reducer dispatch doesn't update
  // `state` synchronously, so reading it back immediately would still see the
  // pre-rename value.
  const persistTables = useCallback(
    async (tablesToSave: EditorTable[]) => {
      setSaving(true);
      setSaveError(null);
      setSavedAt(null);
      try {
        const tables: TableInput[] = tablesToSave.map(({ id, width, depth, minCapacity, ...rest }) => {
          void id;
          return {
            ...rest,
            width: width ?? undefined,
            depth: depth ?? undefined,
            minCapacity: minCapacity ?? undefined,
          };
        });
        const res = await fetch(`/api/templates/${templateId}/tables`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tables }),
        });
        if (!res.ok) throw new Error("failed to save template tables");
        const getRes = await fetch(`/api/templates/${templateId}/tables`);
        const saved = (await getRes.json()) as EditorTable[];
        dispatch({ type: "load", tables: saved });
        setSavedAt(Date.now());
      } catch {
        setSaveError("Failed to save changes");
      } finally {
        setSaving(false);
      }
    },
    [templateId]
  );

  function handleSave() {
    return persistTables(state.tables);
  }

  // Double-click rename (Plan 18 Task 4): update local state immediately (snappy
  // feedback) and persist right away — unlike shape/capacity/position edits, a
  // rename shouldn't silently wait on the user remembering to click "Guardar".
  function handleRenameTable(id: string, name: string | null) {
    dispatch({ type: "update-table", id, patch: { name } });
    const next = state.tables.map((t) => (t.id === id ? { ...t, name } : t));
    void persistTables(next);
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>
          Editor de mesas do template
          {(layoutLabel || floorPlan?.name) && ` — ${layoutLabel || floorPlan?.name}`}
        </strong>
        {onClose && (
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        )}
      </div>

      {loading && <p>Loading...</p>}
      {loadError && <p style={{ color: "#dc2626" }}>{loadError}</p>}

      {!loading && !loadError && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0", flexWrap: "wrap" }}>
            <label>
              Tipo de mesa{" "}
              <select
                value={presetTypeId}
                onChange={(e) => setPresetTypeId(e.target.value)}
                disabled={!hasTableTypes}
              >
                {tableTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setMode((m) => (m === "add-table" ? "select" : "add-table"))}
              disabled={!hasTableTypes}
              style={{ fontWeight: mode === "add-table" ? 700 : 400 }}
            >
              {mode === "add-table" ? "A adicionar — clique no mapa" : "Adicionar do catálogo"}
            </button>
            <button
              type="button"
              onClick={() => setMode((m) => (m === "add-element" ? "select" : "add-element"))}
              style={{ fontWeight: mode === "add-element" ? 700 : 400 }}
            >
              {mode === "add-element" ? "A adicionar elemento — clique no mapa" : "Adicionar elemento"}
            </button>
            <button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "A guardar..." : "Guardar"}
            </button>
            {savedAt !== null && <span style={{ color: "#059669" }}>Guardado.</span>}
          </div>

          {elementsSaveError && <p style={{ color: "#dc2626" }}>{elementsSaveError}</p>}

          {!hasTableTypes && (
            <p style={{ color: "#dc2626" }}>
              Cria tipos de mesa na aba &quot;Mesas disponíveis&quot; primeiro.
            </p>
          )}

          {saveError && <p style={{ color: "#dc2626" }}>{saveError}</p>}

          {(spacingIds.size > 0 || outOfZoneIds.length > 0) && (
            <div style={{ marginBottom: 8 }}>
              {spacingIds.size > 0 && (
                <p style={{ color: "#f59e0b", margin: "4px 0" }} data-testid="spacing-warning">
                  {spacingIds.size} mesa(s) demasiado próximas.
                </p>
              )}
              {outOfZoneIds.length > 0 && (
                <p style={{ color: "#dc2626", margin: "4px 0" }} data-testid="zone-warning">
                  {outOfZoneIds.length} mesa(s) fora de qualquer zona.
                </p>
              )}
            </div>
          )}

          {!floorPlan?.image && !(floorPlan && floorPlan.width > 0 && floorPlan.depth > 0) && (
            <p style={{ color: "#6b7280" }}>
              Esta planta ainda não tem imagem nem dimensões definidas.
            </p>
          )}

          <FloorPlanCanvas
            imageUrl={imageUrlFor(floorPlan?.image ?? "")}
            tables={state.tables}
            scale={floorPlan?.scale ?? 0}
            roomWidth={floorPlan?.width ?? 0}
            roomDepth={floorPlan?.depth ?? 0}
            selectedId={state.selectedId}
            mode={mode}
            zones={zones}
            maxWidth={CANVAS_WIDTH}
            maxHeight={CANVAS_HEIGHT}
            warningTableIds={warningTableIds}
            onAddTable={handleAddTable}
            onMoveTable={handleMoveTable}
            onSelect={handleSelectTable}
            onDeleteTable={handleDeleteTable}
            onRenameTable={handleRenameTable}
            elements={elements}
            selectedElementId={selectedElementId}
            onSelectElement={handleSelectElement}
            onMoveElement={handleMoveElement}
            onAddElement={handleAddElement}
            onDeleteElement={handleDeleteElement}
            enableSnap
          />

          {/* Selected-table controls (Plan 18 Task 5): "cabeceiras" only applies to
              rect tables — round/oval always seat all the way around, so the
              toggle is hidden for them rather than shown disabled. */}
          {selectedTable && selectedTable.shape === "rect" && (
            <div style={{ marginTop: 8 }}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedTable.heads !== false}
                  onChange={(e) =>
                    dispatch({
                      type: "update-table",
                      id: selectedTable.id,
                      patch: { heads: e.target.checked },
                    })
                  }
                />{" "}
                Com cabeceiras (assentos nos topos curtos)
              </label>
            </div>
          )}

          {/* Selected-element controls (Plan 18 Task 8): label + color + delete. Move
              happens by dragging the element directly on the canvas above. */}
          {selectedElement && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 8,
              }}
            >
              <label>
                Texto{" "}
                <input
                  data-testid="element-label-input"
                  value={selectedElement.label}
                  onChange={(e) => handleUpdateElement(selectedElement.id, { label: e.target.value })}
                  style={{ width: 160 }}
                />
              </label>
              <label>
                Cor{" "}
                <input
                  data-testid="element-color-input"
                  type="color"
                  value={selectedElement.color}
                  onChange={(e) => handleUpdateElement(selectedElement.id, { color: e.target.value })}
                />
              </label>
              {(() => {
                const elScale = floorPlan?.scale ?? 0;
                const unit = elScale > 0 ? "m" : "px";
                const toDisp = (px: number) =>
                  elScale > 0 ? Math.round((px / elScale) * 100) / 100 : Math.round(px);
                const toPx = (val: number) => (elScale > 0 ? val * elScale : val);
                return (
                  <>
                    <label>
                      Largura ({unit}){" "}
                      <input
                        data-testid="element-width-input"
                        type="number"
                        min={0}
                        step={elScale > 0 ? 0.1 : 5}
                        value={toDisp(selectedElement.w)}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isNaN(v) && v > 0)
                            handleResizeElement(selectedElement.id, { w: toPx(v) });
                        }}
                        style={{ width: 80 }}
                      />
                    </label>
                    <label>
                      Comprimento ({unit}){" "}
                      <input
                        data-testid="element-height-input"
                        type="number"
                        min={0}
                        step={elScale > 0 ? 0.1 : 5}
                        value={toDisp(selectedElement.h)}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isNaN(v) && v > 0)
                            handleResizeElement(selectedElement.id, { h: toPx(v) });
                        }}
                        style={{ width: 80 }}
                      />
                    </label>
                  </>
                );
              })()}
              <button
                type="button"
                data-testid="delete-selected-element"
                onClick={() => handleDeleteElement(selectedElement.id)}
                style={{ color: "#dc2626" }}
              >
                Remover elemento
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
