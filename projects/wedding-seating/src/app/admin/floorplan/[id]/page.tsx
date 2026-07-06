"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEditorState } from "@/components/editor/useEditorState";
import CalibrationTool from "@/components/editor/CalibrationTool";
import TableInspector from "@/components/editor/TableInspector";
import type { EditorTable } from "@/lib/floorplan/editorState";
import type { CanvasMode } from "@/components/editor/FloorPlanCanvas";
import type { Point } from "@/lib/floorplan/geometry";

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
}

interface TableRecord {
  id: string;
  shape: string;
  capacity: number;
  x: number;
  y: number;
  fixed: boolean;
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

  const refresh = useCallback(async () => {
    setLoading(true);
    const [fpRes, tablesRes] = await Promise.all([
      fetch(`/api/floorplans/${floorPlanId}`),
      fetch(`/api/floorplans/${floorPlanId}/tables`),
    ]);
    if (fpRes.ok) {
      const fp = (await fpRes.json()) as FloorPlanRecord;
      setFloorPlan(fp);
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

  const selectedTable = state.tables.find((t) => t.id === state.selectedId);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <p>
        <Link href="/admin">&larr; Back to venues</Link>
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

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setMode(mode === "add-table" ? "select" : "add-table")}
              disabled={calibrationActive}
              style={{ fontWeight: mode === "add-table" ? "bold" : "normal" }}
            >
              {mode === "add-table" ? "Cancel add table" : "Add table"}
            </button>
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

          <div style={{ display: "flex", gap: 16 }}>
            <FloorPlanCanvas
              imageUrl={imageUrlFor(floorPlan?.image ?? "")}
              tables={state.tables}
              selectedId={state.selectedId}
              mode={mode}
              calibrationPoints={calibrationPoints}
              maxWidth={CANVAS_WIDTH}
              maxHeight={CANVAS_HEIGHT}
              onAddTable={addTable}
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
