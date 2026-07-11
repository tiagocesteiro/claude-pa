"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import CalibrationTool from "@/components/editor/CalibrationTool";
import type { CanvasMode } from "@/components/editor/FloorPlanCanvas";
import type { Point } from "@/lib/floorplan/geometry";

const FloorPlanCanvas = dynamic(() => import("@/components/editor/FloorPlanCanvas"), {
  ssr: false,
});

// Max on-screen bounds for the editor stage. The actual stage is fit inside
// this box preserving the uploaded image's aspect ratio (see FloorPlanCanvas'
// displayScale). Persisted calibration scale is always in the image's natural
// pixel space, independent of these bounds.
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
  zones: string | null;
}

function imageUrlFor(image: string): string | undefined {
  if (!image) return undefined;
  const rel = image.replace(/^data\/uploads\//, "").replace(/\\/g, "/");
  return `/api/uploads/${rel}`;
}

export default function FloorPlanEditorPage() {
  const params = useParams<{ id: string }>();
  const floorPlanId = params.id;

  const [floorPlan, setFloorPlan] = useState<FloorPlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<CanvasMode>("select");
  const [calibrationActive, setCalibrationActive] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [zoneDrawActive, setZoneDrawActive] = useState(false);
  const [zones, setZones] = useState<Point[][]>([]);
  const [savingZones, setSavingZones] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const fpRes = await fetch(`/api/floorplans/${floorPlanId}`);
    if (fpRes.ok) {
      const fp = (await fpRes.json()) as FloorPlanRecord;
      setFloorPlan(fp);
      // Migrate a legacy single `boundary` polygon into zones[0] when this
      // floor plan predates multi-zone support (no `zones` saved yet).
      try {
        if (fp.zones) {
          setZones(JSON.parse(fp.zones) as Point[][]);
        } else if (fp.boundary) {
          setZones([JSON.parse(fp.boundary) as Point[]]);
        } else {
          setZones([]);
        }
      } catch {
        setZones([]);
      }
    }
    setLoading(false);
  }, [floorPlanId]);

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
      if (next) setZoneDrawActive(false);
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

  async function persistZones(next: Point[][]) {
    setSavingZones(true);
    try {
      const zonesToSave = next.filter((zone) => zone.length > 0);
      const payload = zonesToSave.length > 0 ? JSON.stringify(zonesToSave) : null;
      const res = await fetch(`/api/floorplans/${floorPlanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zones: payload }),
      });
      if (res.ok) setFloorPlan((prev) => (prev ? { ...prev, zones: payload } : prev));
    } finally {
      setSavingZones(false);
    }
  }

  function handleToggleZoneDraw() {
    setZoneDrawActive((prev) => {
      const next = !prev;
      if (next) {
        setCalibrationActive(false);
        setCalibrationPoints([]);
        // Always start a fresh zone rather than resuming into whatever zone
        // happens to be last — otherwise re-entering draw mode after a
        // previous save would silently extend an already-finished polygon.
        setZones((z) => [...z, []]);
      } else {
        // Finishing the draw: persist once here rather than per-click, so
        // overlapping in-flight PATCH requests can't complete out of order
        // and clobber a later (or cleared) set of zones with a stale one.
        void persistZones(zones);
      }
      setMode(next ? "draw-zone" : "select");
      return next;
    });
  }

  function handleZoneClick(p: Point) {
    setZones((prev) => {
      if (prev.length === 0) return [[p]];
      const next = [...prev];
      next[next.length - 1] = [...next[next.length - 1], p];
      return next;
    });
  }

  function handleNewZone() {
    setZones((prev) => [...prev, []]);
  }

  async function handleClearZones() {
    setZones([]);
    await persistZones([]);
  }

  const activeZoneIndex = zones.length > 0 ? zones.length - 1 : -1;

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
      <h1>Layout editor</h1>

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
            <strong>Zonas</strong>{" "}
            <button
              type="button"
              onClick={handleToggleZoneDraw}
              disabled={calibrationActive}
              style={{ marginLeft: 8, fontWeight: zoneDrawActive ? "bold" : "normal" }}
            >
              {zoneDrawActive ? "Concluir desenho" : "Desenhar zona"}
            </button>
            <button
              type="button"
              onClick={handleNewZone}
              disabled={!zoneDrawActive}
              style={{ marginLeft: 8 }}
            >
              Nova zona
            </button>
            <button
              type="button"
              onClick={handleClearZones}
              disabled={zones.length === 0 || savingZones}
              style={{ marginLeft: 8 }}
            >
              Limpar zonas
            </button>
            {savingZones && <span style={{ marginLeft: 8 }}>Saving...</span>}
            {zoneDrawActive && (
              <p>
                Clique no mapa para adicionar pontos à zona atual ({activeZoneIndex + 1}
                {zones.length > 0 ? ` de ${zones.length}` : ""}). Use &quot;Nova zona&quot; para começar outra.
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <FloorPlanCanvas
              imageUrl={imageUrlFor(floorPlan?.image ?? "")}
              tables={[]}
              scale={floorPlan?.scale ?? 0}
              selectedId={null}
              mode={mode}
              calibrationPoints={calibrationPoints}
              zones={zones}
              maxWidth={CANVAS_WIDTH}
              maxHeight={CANVAS_HEIGHT}
              onAddTable={() => {}}
              onMoveTable={() => {}}
              onSelect={() => {}}
              onCalibrateClick={handleCalibrateClick}
              onZoneClick={handleZoneClick}
            />
          </div>
        </>
      )}
    </main>
  );
}
