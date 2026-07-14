"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import CalibrationTool from "@/components/editor/CalibrationTool";
import type { CanvasMode } from "@/components/editor/FloorPlanCanvas";
import type { Point } from "@/lib/floorplan/geometry";
import { fitRoomScale } from "@/lib/floorplan/roomFit";

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
  name: string | null;
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

  const [minSpacingInput, setMinSpacingInput] = useState("");
  const [spacingSaved, setSpacingSaved] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [nameSaved, setNameSaved] = useState(false);

  // Plan 18 Task 7: "create a room from scratch" — a floor plan with no uploaded
  // image can instead be defined by typed dimensions (metres). Submitting derives
  // a fit scale (the room's longer side maps to a fixed natural-pixel target) and
  // persists width+depth+scale together via the dimensions PATCH branch.
  const [lengthInput, setLengthInput] = useState("");
  const [widthInput, setWidthInput] = useState("");
  const [dimensionsError, setDimensionsError] = useState<string | null>(null);
  const [savingDimensions, setSavingDimensions] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const fpRes = await fetch(`/api/floorplans/${floorPlanId}`);
    if (fpRes.ok) {
      const fp = (await fpRes.json()) as FloorPlanRecord;
      setFloorPlan(fp);
      setNameInput(fp.name ?? "");
      setMinSpacingInput(fp.minSpacing != null ? String(fp.minSpacing) : "");
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
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setUploadError(body?.error ?? "Não foi possível carregar a imagem.");
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

  async function saveName() {
    const name = nameInput.trim() || null;
    if (name === (floorPlan?.name ?? null)) return;
    const res = await fetch(`/api/floorplans/${floorPlanId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setFloorPlan((prev) => (prev ? { ...prev, name } : prev));
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 1500);
    }
  }

  async function saveMinSpacing() {
    const raw = minSpacingInput.trim();
    const val = raw === "" ? null : Number(raw);
    if (val !== null && (Number.isNaN(val) || val < 0)) return;
    const res = await fetch(`/api/floorplans/${floorPlanId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minSpacing: val }),
    });
    if (res.ok) {
      setFloorPlan((prev) => (prev ? { ...prev, minSpacing: val } : prev));
      setSpacingSaved(true);
      setTimeout(() => setSpacingSaved(false), 1500);
    }
  }

  async function handleSetDimensions() {
    setDimensionsError(null);
    const lengthM = Number(lengthInput);
    const widthM = Number(widthInput);
    if (!Number.isFinite(lengthM) || lengthM <= 0 || !Number.isFinite(widthM) || widthM <= 0) {
      setDimensionsError("Indica comprimento e largura em metros, maiores que 0.");
      return;
    }
    const scale = fitRoomScale(lengthM, widthM);
    setSavingDimensions(true);
    try {
      const res = await fetch(`/api/floorplans/${floorPlanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ width: lengthM, depth: widthM, scale }),
      });
      if (!res.ok) throw new Error("failed to save dimensions");
      const fp = (await res.json()) as FloorPlanRecord;
      setFloorPlan(fp);
    } catch {
      setDimensionsError("Não foi possível guardar as dimensões da sala.");
    } finally {
      setSavingDimensions(false);
    }
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
          <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <label>
              Nome da planta:{" "}
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={saveName}
                placeholder="ex: Salão principal"
                style={{ minWidth: 240 }}
              />
            </label>
            {nameSaved && <span style={{ color: "#16a34a" }}>Guardado.</span>}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>
              Upload room image:{" "}
              <input type="file" accept="image/png,image/jpeg" onChange={handleUpload} />
            </label>
            {uploadError && <span style={{ color: "#dc2626", marginLeft: 8 }}>{uploadError}</span>}
          </div>

          {!floorPlan?.image && (
            <div style={{ marginBottom: 12, border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
              <strong>Sala sem planta (definir dimensões)</strong>
              <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
                Sem foto? Indica as dimensões reais da sala e é desenhado um retângulo à escala
                para colocares mesas em cima.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label>
                  Comprimento (m):{" "}
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={lengthInput}
                    onChange={(e) => setLengthInput(e.target.value)}
                    placeholder="ex: 12"
                    style={{ width: 90 }}
                  />
                </label>
                <label>
                  Largura (m):{" "}
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={widthInput}
                    onChange={(e) => setWidthInput(e.target.value)}
                    placeholder="ex: 8"
                    style={{ width: 90 }}
                  />
                </label>
                <button type="button" onClick={handleSetDimensions} disabled={savingDimensions}>
                  {savingDimensions ? "A guardar..." : "Definir"}
                </button>
                {floorPlan && floorPlan.width > 0 && floorPlan.depth > 0 && (
                  <span style={{ color: "var(--text-muted)" }}>
                    Atual: {floorPlan.width}m x {floorPlan.depth}m
                  </span>
                )}
              </div>
              {dimensionsError && <p style={{ color: "#dc2626" }}>{dimensionsError}</p>}
            </div>
          )}

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

          <div style={{ marginBottom: 12, border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
            <strong>Distância mínima entre mesas</strong>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                min={0}
                step={0.1}
                value={minSpacingInput}
                onChange={(e) => setMinSpacingInput(e.target.value)}
                onBlur={saveMinSpacing}
                placeholder="ex: 1.2"
                style={{ width: 100 }}
              />
              <span style={{ color: "var(--text-muted)" }}>metros</span>
              <button type="button" onClick={saveMinSpacing}>
                Guardar
              </button>
              {spacingSaved && <span style={{ color: "#16a34a" }}>Guardado.</span>}
            </div>
            <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
              Mesas mais próximas do que isto são assinaladas com aviso no plano. Deixa vazio para
              não verificar.
            </p>
          </div>

          <div style={{ marginBottom: 12, border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
            <strong>Zonas (limites da sala / paredes)</strong>{" "}
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
            <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
              Desenha os limites da sala (paredes). Mesas colocadas fora das zonas são assinaladas.
              Podes ter várias zonas se a sala tiver divisões.
            </p>
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
              roomWidth={floorPlan?.width ?? 0}
              roomDepth={floorPlan?.depth ?? 0}
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
