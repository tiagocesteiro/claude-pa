"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEditorState } from "@/components/editor/useEditorState";
import CalibrationTool from "@/components/editor/CalibrationTool";
import TableInspector from "@/components/editor/TableInspector";
import type { EditorTable, TablePreset } from "@/lib/floorplan/editorState";
import type { CanvasMode } from "@/components/editor/FloorPlanCanvas";
import type { Point } from "@/lib/floorplan/geometry";
import { spacingViolations } from "@/lib/floorplan/spacing";
import type { TableTypeRecord } from "@/components/venue/TableTypeCatalog";

const FloorPlanCanvas = dynamic(() => import("@/components/editor/FloorPlanCanvas"), {
  ssr: false,
});

// Max on-screen bounds for the editor stage. The actual stage is fit inside
// this box preserving the uploaded image's aspect ratio (see FloorPlanCanvas'
// displayScale). Persisted table x/y and calibration scale are always in the
// image's natural pixel space, independent of these bounds.
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;

interface FloorPlanRecord {
  id: string;
  venueId: string;
  image: string;
  scale: number;
  width: number;
  depth: number;
  minSpacing: number | null;
}

interface TableRecord {
  id: string;
  shape: string;
  capacity: number;
  x: number;
  y: number;
  fixed: boolean;
  width?: number | null;
  depth?: number | null;
  minCapacity?: number | null;
}

function imageUrlFor(image: string): string | undefined {
  if (!image) return undefined;
  const rel = image.replace(/^data\/uploads\//, "").replace(/\\/g, "/");
  return `/api/uploads/${rel}`;
}

export default function FloorPlanEditorPage() {
  const params = useParams<{ id: string }>();
  const floorPlanId = params.id;

  const { state, addTable, moveTable, updateTable, deleteTable, select, load, save } =
    useEditorState(floorPlanId);

  const [floorPlan, setFloorPlan] = useState<FloorPlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<CanvasMode>("select");
  const [calibrationActive, setCalibrationActive] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [tableTypes, setTableTypes] = useState<TableTypeRecord[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [pendingPreset, setPendingPreset] = useState<TablePreset | null>(null);

  const [minSpacingInput, setMinSpacingInput] = useState("");
  const [savingSpacing, setSavingSpacing] = useState(false);
  const [spacingError, setSpacingError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [fpRes, tablesRes] = await Promise.all([
      fetch(`/api/floorplans/${floorPlanId}`),
      fetch(`/api/floorplans/${floorPlanId}/tables`),
    ]);
    if (fpRes.ok) {
      const fp = (await fpRes.json()) as FloorPlanRecord;
      setFloorPlan(fp);
      setMinSpacingInput(fp.minSpacing != null ? String(fp.minSpacing) : "");
      const typesRes = await fetch(`/api/venues/${fp.venueId}/table-types`);
      if (typesRes.ok) {
        setTableTypes((await typesRes.json()) as TableTypeRecord[]);
      }
    }
    if (tablesRes.ok) {
      const tables = (await tablesRes.json()) as TableRecord[];
      const editorTables: EditorTable[] = tables.map((t) => ({
        id: t.id,
        shape: t.shape === "rect" ? "rect" : "round",
        capacity: t.capacity,
        x: t.x,
        y: t.y,
        fixed: t.fixed,
        width: t.width,
        depth: t.depth,
        minCapacity: t.minCapacity,
      }));
      load(editorTables);
    }
    setLoading(false);
  }, [floorPlanId, load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorPlanId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/floorplans/${floorPlanId}/image`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      setUploadError("Failed to upload image");
      return;
    }
    const { image } = (await res.json()) as { image: string };
    setFloorPlan((prev) => (prev ? { ...prev, image } : prev));
  }

  function handleCalibrateClick(p: Point) {
    setCalibrationPoints((prev) => (prev.length >= 2 ? [p] : [...prev, p]));
  }

  function handleToggleCalibration() {
    setCalibrationActive((prev) => {
      const next = !prev;
      setMode(next ? "calibrate" : "select");
      if (!next) setCalibrationPoints([]);
      return next;
    });
  }

  function handleCalibrated(scale: number) {
    setFloorPlan((prev) => (prev ? { ...prev, scale } : prev));
    setCalibrationActive(false);
    setMode("select");
  }

  async function handleSave() {
    setSaving(true);
    try {
      await save();
    } finally {
      setSaving(false);
    }
  }

  function handleAddTable(at: Point) {
    if (pendingPreset) {
      addTable(at, pendingPreset);
      setPendingPreset(null);
      setSelectedTypeId("");
      setMode("select");
      return;
    }
    addTable(at);
  }

  function handleSelectType(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedTypeId(id);
    if (!id) {
      setPendingPreset(null);
      setMode((m) => (m === "add-table" ? "select" : m));
      return;
    }
    const type = tableTypes.find((t) => t.id === id);
    if (!type) return;
    setPendingPreset({
      shape: type.shape === "rect" ? "rect" : "round",
      capacity: type.maxSeats,
      minCapacity: type.minSeats,
      width: type.width,
      depth: type.depth,
    });
    setMode("add-table");
  }

  async function handleSaveSpacing() {
    setSpacingError(null);
    const trimmed = minSpacingInput.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      setSpacingError("Enter a non-negative number");
      return;
    }
    setSavingSpacing(true);
    try {
      const res = await fetch(`/api/floorplans/${floorPlanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minSpacing: value }),
      });
      if (!res.ok) throw new Error("failed to save spacing");
      setFloorPlan((prev) => (prev ? { ...prev, minSpacing: value } : prev));
    } catch {
      setSpacingError("Failed to save minimum spacing");
    } finally {
      setSavingSpacing(false);
    }
  }

  const selectedTable = state.tables.find((t) => t.id === state.selectedId);

  function tableLabel(id: string): string {
    const index = state.tables.findIndex((t) => t.id === id);
    return `Mesa ${index >= 0 ? index + 1 : "?"}`;
  }

  const violations =
    floorPlan?.minSpacing != null && floorPlan.minSpacing >= 0 && floorPlan.scale > 0
      ? spacingViolations(state.tables, floorPlan.minSpacing, floorPlan.scale)
      : [];

  const warningTableIds = Array.from(new Set(violations.flatMap((v) => [v.a, v.b])));

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <p>
        <Link href="/admin">&larr; Back to venues</Link>
        {floorPlan && (
          <>
            {" · "}
            <Link href={`/admin/venue/${floorPlan.venueId}`}>Table type catalog</Link>
          </>
        )}
      </p>
      <h1>Floor plan editor</h1>

      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          <div style={{ marginBottom: 12 }}>
            <label>
              Upload room image:{" "}
              <input type="file" accept="image/png,image/jpeg" onChange={handleUpload} />
            </label>
            {uploadError && <span style={{ color: "#dc2626", marginLeft: 8 }}>{uploadError}</span>}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => {
                setPendingPreset(null);
                setSelectedTypeId("");
                setMode(mode === "add-table" ? "select" : "add-table");
              }}
              disabled={calibrationActive}
              style={{ fontWeight: mode === "add-table" && !pendingPreset ? "bold" : "normal" }}
            >
              {mode === "add-table" && !pendingPreset ? "Cancel add table" : "Add table"}
            </button>

            <label>
              Adicionar do catálogo:{" "}
              <select value={selectedTypeId} onChange={handleSelectType} disabled={calibrationActive}>
                <option value="">-- selecionar tipo --</option>
                {tableTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.minSeats}-{t.maxSeats})
                  </option>
                ))}
              </select>
            </label>
            {pendingPreset && <span>Clique no mapa para colocar a mesa</span>}

            <button type="button" onClick={handleSave} disabled={!state.dirty || saving}>
              {saving ? "Saving..." : "Save layout"}
            </button>
            {state.dirty && <span>Unsaved changes</span>}
          </div>

          <div style={{ marginBottom: 12 }}>
            <CalibrationTool
              floorPlanId={floorPlanId}
              active={calibrationActive}
              onToggleActive={handleToggleCalibration}
              points={calibrationPoints}
              onReset={() => setCalibrationPoints([])}
              currentScale={floorPlan?.scale ?? 0}
              onCalibrated={handleCalibrated}
            />
          </div>

          <div style={{ marginBottom: 12, border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <label>
              Espaçamento mínimo (m):{" "}
              <input
                type="number"
                step="0.1"
                min={0}
                value={minSpacingInput}
                onChange={(e) => setMinSpacingInput(e.target.value)}
                style={{ width: 80 }}
              />
            </label>
            <button type="button" onClick={handleSaveSpacing} disabled={savingSpacing} style={{ marginLeft: 8 }}>
              {savingSpacing ? "Saving..." : "Save"}
            </button>
            {spacingError && <span style={{ color: "#dc2626", marginLeft: 8 }}>{spacingError}</span>}

            {violations.length > 0 && (
              <ul style={{ marginTop: 8, color: "#b45309" }}>
                {violations.map((v) => (
                  <li key={`${v.a}-${v.b}`}>
                    {tableLabel(v.a)} e {tableLabel(v.b)} demasiado próximas (
                    {v.gapMetres.toFixed(1)}m &lt; {floorPlan?.minSpacing?.toFixed(1)}m)
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <FloorPlanCanvas
              imageUrl={imageUrlFor(floorPlan?.image ?? "")}
              tables={state.tables}
              selectedId={state.selectedId}
              mode={mode}
              calibrationPoints={calibrationPoints}
              maxWidth={CANVAS_WIDTH}
              maxHeight={CANVAS_HEIGHT}
              warningTableIds={warningTableIds}
              onAddTable={handleAddTable}
              onMoveTable={moveTable}
              onSelect={select}
              onCalibrateClick={handleCalibrateClick}
            />
            <div style={{ minWidth: 240 }}>
              <TableInspector table={selectedTable} onUpdate={updateTable} onDelete={deleteTable} />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
