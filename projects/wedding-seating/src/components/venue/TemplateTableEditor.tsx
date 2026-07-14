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
      setFloorPlan(fpRes.ok ? ((await fpRes.json()) as FloorPlanRecord) : null);
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
            <button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "A guardar..." : "Guardar"}
            </button>
            {savedAt !== null && <span style={{ color: "#059669" }}>Guardado.</span>}
          </div>

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

          {!floorPlan?.image && (
            <p style={{ color: "#6b7280" }}>Esta planta ainda não tem imagem.</p>
          )}

          <FloorPlanCanvas
            imageUrl={imageUrlFor(floorPlan?.image ?? "")}
            tables={state.tables}
            scale={floorPlan?.scale ?? 0}
            selectedId={state.selectedId}
            mode={mode}
            zones={zones}
            maxWidth={CANVAS_WIDTH}
            maxHeight={CANVAS_HEIGHT}
            warningTableIds={warningTableIds}
            onAddTable={handleAddTable}
            onMoveTable={handleMoveTable}
            onSelect={(id) => dispatch({ type: "select", id })}
            onDeleteTable={handleDeleteTable}
            onRenameTable={handleRenameTable}
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
        </>
      )}
    </div>
  );
}
