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
import { spacingViolations, DEFAULT_TABLE_METRES } from "@/lib/floorplan/spacing";
import { outOfBoundsTables } from "@/lib/floorplan/boundary";
import { autoGridPositions } from "@/lib/floorplan/autoLayout";
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
  boundary: string | null;
}

interface TemplateLine {
  tableTypeId: string;
  quantity: number;
}

interface TemplateRecord {
  id: string;
  venueId: string;
  name: string;
  minGuests: number;
  maxGuests: number;
  lines: string;
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

  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);

  const [minSpacingInput, setMinSpacingInput] = useState("");
  const [savingSpacing, setSavingSpacing] = useState(false);
  const [spacingError, setSpacingError] = useState<string | null>(null);

  const [boundaryDrawActive, setBoundaryDrawActive] = useState(false);
  const [boundaryPoints, setBoundaryPoints] = useState<Point[]>([]);
  const [savingBoundary, setSavingBoundary] = useState(false);

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
      try {
        setBoundaryPoints(fp.boundary ? (JSON.parse(fp.boundary) as Point[]) : []);
      } catch {
        setBoundaryPoints([]);
      }
      const [typesRes, templatesRes] = await Promise.all([
        fetch(`/api/venues/${fp.venueId}/table-types`),
        fetch(`/api/venues/${fp.venueId}/templates`),
      ]);
      if (typesRes.ok) {
        setTableTypes((await typesRes.json()) as TableTypeRecord[]);
      }
      if (templatesRes.ok) {
        setTemplates((await templatesRes.json()) as TemplateRecord[]);
      }
    }
    if (tablesRes.ok) {
      const tables = (await tablesRes.json()) as TableRecord[];
      const editorTables: EditorTable[] = tables.map((t) => ({
        id: t.id,
        shape: t.shape === "oval" || t.shape === "rect" ? t.shape : "round",
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
      if (next) setBoundaryDrawActive(false);
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

  async function persistBoundary(boundary: string | null) {
    setSavingBoundary(true);
    try {
      const res = await fetch(`/api/floorplans/${floorPlanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boundary }),
      });
      if (res.ok) setFloorPlan((prev) => (prev ? { ...prev, boundary } : prev));
    } finally {
      setSavingBoundary(false);
    }
  }

  function handleToggleBoundaryDraw() {
    setBoundaryDrawActive((prev) => {
      const next = !prev;
      if (next) {
        setCalibrationActive(false);
        setCalibrationPoints([]);
        setPendingPreset(null);
        setSelectedTypeId("");
      } else {
        // Finishing the draw: persist once here rather than per-click, so
        // overlapping in-flight PATCH requests can't complete out of order
        // and clobber a later (or cleared) boundary with a stale one.
        void persistBoundary(boundaryPoints.length > 0 ? JSON.stringify(boundaryPoints) : null);
      }
      setMode(next ? "draw-boundary" : "select");
      return next;
    });
  }

  function handleBoundaryClick(p: Point) {
    setBoundaryPoints((prev) => [...prev, p]);
  }

  async function handleClearBoundary() {
    setBoundaryPoints([]);
    await persistBoundary(null);
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
      shape: type.shape === "oval" || type.shape === "rect" ? type.shape : "round",
      capacity: type.maxSeats,
      minCapacity: type.minSeats,
      width: type.width,
      depth: type.depth,
    });
    setMode("add-table");
  }

  function parseTemplateLines(lines: string): TemplateLine[] {
    try {
      const parsed = JSON.parse(lines);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (l): l is TemplateLine =>
          l && typeof l.tableTypeId === "string" && typeof l.quantity === "number"
      );
    } catch {
      return [];
    }
  }

  async function handleApplyTemplate() {
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) return;
    setTemplateMessage(null);

    const lines = parseTemplateLines(template.lines);
    const presets: TablePreset[] = [];
    for (const line of lines) {
      const type = tableTypes.find((t) => t.id === line.tableTypeId);
      if (!type || !(line.quantity > 0)) continue; // skip unknown table types
      for (let i = 0; i < line.quantity; i++) {
        presets.push({
          shape: type.shape === "oval" || type.shape === "rect" ? type.shape : "round",
          capacity: type.maxSeats,
          minCapacity: type.minSeats,
          width: type.width,
          depth: type.depth,
        });
      }
    }

    if (presets.length === 0) {
      setTemplateMessage("Nenhuma mesa reconhecida neste template");
      return;
    }

    const scale = floorPlan?.scale ?? 0;
    const largestDimMetres = Math.max(
      ...presets.map((p) => Math.max(p.width ?? 0, p.depth ?? 0)),
      DEFAULT_TABLE_METRES
    );
    const GAP_PX = 20;
    const DEFAULT_CELL_PX = 120;
    const ORIGIN = 80;
    const cellPx = scale > 0 ? largestDimMetres * scale + GAP_PX : DEFAULT_CELL_PX;
    const positions = autoGridPositions(presets.length, {
      originX: ORIGIN,
      originY: ORIGIN,
      cellPx,
    });

    setApplyingTemplate(true);
    try {
      // Update the visual editor state right away (non-destructive: existing
      // tables are untouched, these are appended via the same add-table path
      // used by "adicionar do catálogo").
      presets.forEach((preset, i) => addTable(positions[i], preset));

      // Persist explicitly rather than via the hook's `save()` — that closure
      // captures `state.tables` from this render, which predates the
      // dispatches above (React batches state updates), so it would PUT the
      // pre-template table list. Build the merged list ourselves instead.
      const existingTables = state.tables.map(({ id, ...rest }) => {
        void id;
        return rest;
      });
      const newTables = presets.map((preset, i) => ({
        shape: preset.shape ?? "round",
        capacity: preset.capacity ?? 8,
        x: positions[i].x,
        y: positions[i].y,
        fixed: false,
        width: preset.width,
        depth: preset.depth,
        minCapacity: preset.minCapacity,
      }));
      const res = await fetch(`/api/floorplans/${floorPlanId}/tables`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables: [...existingTables, ...newTables] }),
      });
      if (!res.ok) throw new Error("failed to save layout");
      const getRes = await fetch(`/api/floorplans/${floorPlanId}/tables`);
      const saved = (await getRes.json()) as EditorTable[];
      load(saved);
      setTemplateMessage(`${presets.length} mesas adicionadas do template ${template.name}`);
      setSelectedTemplateId("");
    } catch {
      setTemplateMessage("Falha ao aplicar o template");
    } finally {
      setApplyingTemplate(false);
    }
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

  const outOfBoundsIds = outOfBoundsTables(state.tables, boundaryPoints);

  const warningTableIds = Array.from(
    new Set([...violations.flatMap((v) => [v.a, v.b]), ...outOfBoundsIds])
  );

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
                setBoundaryDrawActive(false);
                setMode(mode === "add-table" ? "select" : "add-table");
              }}
              disabled={calibrationActive || boundaryDrawActive}
              style={{ fontWeight: mode === "add-table" && !pendingPreset ? "bold" : "normal" }}
            >
              {mode === "add-table" && !pendingPreset ? "Cancel add table" : "Add table"}
            </button>

            <label>
              Adicionar do catálogo:{" "}
              <select
                value={selectedTypeId}
                onChange={handleSelectType}
                disabled={calibrationActive || boundaryDrawActive}
              >
                <option value="">-- selecionar tipo --</option>
                {tableTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.minSeats}-{t.maxSeats})
                  </option>
                ))}
              </select>
            </label>
            {pendingPreset && <span>Clique no mapa para colocar a mesa</span>}

            <label>
              Aplicar template:{" "}
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={calibrationActive || boundaryDrawActive || templates.length === 0}
              >
                <option value="">-- selecionar template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.minGuests}-{t.maxGuests})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleApplyTemplate}
              disabled={!selectedTemplateId || applyingTemplate}
            >
              {applyingTemplate ? "A aplicar..." : "Aplicar"}
            </button>
            {templateMessage && <span>{templateMessage}</span>}

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

          <div style={{ marginBottom: 12, border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <strong>Limites da sala</strong>{" "}
            <button
              type="button"
              onClick={handleToggleBoundaryDraw}
              disabled={calibrationActive || (mode === "add-table" && !boundaryDrawActive)}
              style={{ marginLeft: 8, fontWeight: boundaryDrawActive ? "bold" : "normal" }}
            >
              {boundaryDrawActive ? "Concluir desenho" : "Desenhar limites"}
            </button>
            <button
              type="button"
              onClick={handleClearBoundary}
              disabled={boundaryPoints.length === 0 || savingBoundary}
              style={{ marginLeft: 8 }}
            >
              Limpar limites
            </button>
            {savingBoundary && <span style={{ marginLeft: 8 }}>Saving...</span>}
            {boundaryDrawActive && <p>Clique no mapa para adicionar pontos ao limite da sala.</p>}

            {outOfBoundsIds.length > 0 && (
              <ul style={{ marginTop: 8, color: "#b45309" }}>
                {outOfBoundsIds.map((id) => (
                  <li key={id}>{tableLabel(id)} fora dos limites da sala</li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <FloorPlanCanvas
              imageUrl={imageUrlFor(floorPlan?.image ?? "")}
              tables={state.tables}
              scale={floorPlan?.scale ?? 0}
              selectedId={state.selectedId}
              mode={mode}
              calibrationPoints={calibrationPoints}
              boundary={boundaryPoints}
              maxWidth={CANVAS_WIDTH}
              maxHeight={CANVAS_HEIGHT}
              warningTableIds={warningTableIds}
              onAddTable={handleAddTable}
              onMoveTable={moveTable}
              onSelect={select}
              onCalibrateClick={handleCalibrateClick}
              onBoundaryClick={handleBoundaryClick}
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
