"use client";

import { useState } from "react";
import { scaleFromReference, type Point } from "@/lib/floorplan/geometry";

export interface CalibrationToolProps {
  floorPlanId: string;
  active: boolean;
  onToggleActive: () => void;
  points: Point[];
  onReset: () => void;
  currentScale: number;
  onCalibrated: (scale: number) => void;
}

export default function CalibrationTool({
  floorPlanId,
  active,
  onToggleActive,
  points,
  onReset,
  currentScale,
  onCalibrated,
}: CalibrationToolProps) {
  const [metres, setMetres] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSetScale() {
    setError(null);
    const value = Number(metres);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a real length in metres greater than 0");
      return;
    }
    if (points.length !== 2) {
      setError("Click two points on the floor plan first");
      return;
    }
    try {
      setSaving(true);
      const scale = scaleFromReference(points[0], points[1], value);
      const res = await fetch(`/api/floorplans/${floorPlanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scale }),
      });
      if (!res.ok) throw new Error("failed to save scale");
      onCalibrated(scale);
      setMetres("");
      onReset();
    } catch {
      setError("Could not save the scale. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <strong>Calibration</strong>
        <span>{currentScale > 0 ? `${currentScale.toFixed(2)} px/m` : "not calibrated"}</span>
      </div>
      <button type="button" onClick={onToggleActive}>
        {active ? "Cancel calibration" : "Calibrate scale"}
      </button>
      {active && (
        <div style={{ marginTop: 8 }}>
          <p>Click two points on the floor plan to draw a reference line ({points.length}/2 selected).</p>
          <label>
            Real length (metres):{" "}
            <input
              type="number"
              step="0.01"
              min="0"
              value={metres}
              onChange={(e) => setMetres(e.target.value)}
              disabled={points.length !== 2}
            />
          </label>
          <button
            type="button"
            onClick={handleSetScale}
            disabled={points.length !== 2 || saving || !metres}
            style={{ marginLeft: 8 }}
          >
            {saving ? "Saving..." : "Set scale"}
          </button>
          {points.length === 2 && (
            <button type="button" onClick={onReset} style={{ marginLeft: 8 }}>
              Reset points
            </button>
          )}
          {error && <p style={{ color: "#dc2626" }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
