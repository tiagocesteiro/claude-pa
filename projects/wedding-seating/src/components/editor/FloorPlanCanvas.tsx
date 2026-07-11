"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Ellipse, Rect, Text, Line } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { EditorTable } from "@/lib/floorplan/editorState";
import type { Point } from "@/lib/floorplan/geometry";
import { tableRenderSize } from "@/lib/floorplan/tableShape";

function useImageElement(src: string | undefined): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);

  useEffect(() => {
    if (!src) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the image source clears
      setImage(undefined);
      return;
    }
    const img = new window.Image();
    img.src = src;
    img.onload = () => setImage(img);
    return () => {
      img.onload = null;
    };
  }, [src]);

  return image;
}

export type CanvasMode = "select" | "add-table" | "calibrate" | "draw-boundary";

export interface FloorPlanCanvasProps {
  imageUrl?: string;
  tables: EditorTable[];
  /** Floor plan's pixels-per-metre calibration; drives each table's real render size
   * via `tableRenderSize`. 0/absent falls back to `tableRenderSize`'s fixed defaults. */
  scale?: number;
  selectedId: string | null;
  mode: CanvasMode;
  /** Reference calibration points, in image-natural pixel space. */
  calibrationPoints?: Point[];
  /** Room boundary polygon, in image-natural pixel space. */
  boundary?: Point[];
  /** Max on-screen bounds for the stage; actual stage size is fit within these preserving image aspect ratio. */
  maxWidth: number;
  maxHeight: number;
  /** Table ids currently flagged by a spacing/min-occupancy warning; rendered with a highlighted outline. */
  warningTableIds?: string[];
  /** All positions handed to these callbacks are in image-natural pixel space. */
  onAddTable: (at: Point) => void;
  onMoveTable: (id: string, to: Point) => void;
  onSelect: (id: string | null) => void;
  onCalibrateClick?: (at: Point) => void;
  onBoundaryClick?: (at: Point) => void;
}

export default function FloorPlanCanvas({
  imageUrl,
  tables,
  scale = 0,
  selectedId,
  mode,
  calibrationPoints = [],
  boundary = [],
  maxWidth,
  maxHeight,
  warningTableIds = [],
  onAddTable,
  onMoveTable,
  onSelect,
  onCalibrateClick,
  onBoundaryClick,
}: FloorPlanCanvasProps) {
  const image = useImageElement(imageUrl);
  const stageRef = useRef<Konva.Stage>(null);

  // displayScale maps image-natural pixels -> on-screen (display) pixels.
  // Persisted quantities (table x/y, calibration points) live in natural space;
  // only rendering multiplies by displayScale. Falls back to a 1:1, max-bounds
  // box before an image has loaded.
  const naturalWidth = image?.naturalWidth || maxWidth;
  const naturalHeight = image?.naturalHeight || maxHeight;
  const displayScale = image ? Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight) : 1;
  const stageWidth = image ? naturalWidth * displayScale : maxWidth;
  const stageHeight = image ? naturalHeight * displayScale : maxHeight;

  function toNatural(p: Point): Point {
    return { x: p.x / displayScale, y: p.y / displayScale };
  }

  function handleStageClick(e: KonvaEventObject<MouseEvent>) {
    if (e.target !== e.target.getStage()) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const naturalPos = toNatural(pos);
    if (mode === "add-table") {
      onAddTable(naturalPos);
      return;
    }
    if (mode === "calibrate") {
      onCalibrateClick?.(naturalPos);
      return;
    }
    if (mode === "draw-boundary") {
      onBoundaryClick?.(naturalPos);
      return;
    }
    onSelect(null);
  }

  const cursor =
    mode === "add-table" ? "copy" : mode === "calibrate" || mode === "draw-boundary" ? "crosshair" : "default";

  return (
    <Stage
      ref={stageRef}
      width={stageWidth}
      height={stageHeight}
      onClick={handleStageClick}
      style={{ border: "1px solid #ccc", cursor }}
    >
      <Layer>
        {image && (
          <KonvaImage image={image} width={stageWidth} height={stageHeight} listening={false} />
        )}
      </Layer>
      <Layer listening={false}>
        {boundary.length >= 2 && (
          <Line
            points={boundary.flatMap((p) => [p.x * displayScale, p.y * displayScale])}
            closed
            fill="rgba(37, 99, 235, 0.15)"
            stroke="#2563eb"
            strokeWidth={2}
          />
        )}
        {boundary.map((p, i) => (
          <Circle key={i} x={p.x * displayScale} y={p.y * displayScale} radius={4} fill="#2563eb" />
        ))}
      </Layer>
      <Layer>
        {tables.map((t) => (
          <TableShape
            key={t.id}
            table={t}
            displayScale={displayScale}
            scale={scale}
            isSelected={t.id === selectedId}
            hasWarning={warningTableIds.includes(t.id)}
            onSelect={() => onSelect(t.id)}
            onDragEnd={(e) =>
              onMoveTable(t.id, toNatural({ x: e.target.x(), y: e.target.y() }))
            }
          />
        ))}
      </Layer>
      <Layer listening={false}>
        {calibrationPoints.length === 2 && (
          <Line
            points={[
              calibrationPoints[0].x * displayScale,
              calibrationPoints[0].y * displayScale,
              calibrationPoints[1].x * displayScale,
              calibrationPoints[1].y * displayScale,
            ]}
            stroke="#059669"
            strokeWidth={2}
            dash={[6, 4]}
          />
        )}
        {calibrationPoints.map((p, i) => (
          <Circle key={i} x={p.x * displayScale} y={p.y * displayScale} radius={5} fill="#059669" />
        ))}
      </Layer>
    </Stage>
  );
}

function TableShape({
  table,
  displayScale,
  scale,
  isSelected,
  hasWarning,
  onSelect,
  onDragEnd,
}: {
  table: EditorTable;
  displayScale: number;
  scale: number;
  isSelected: boolean;
  hasWarning?: boolean;
  onSelect: () => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
}) {
  const stroke = isSelected ? "#2563eb" : hasWarning ? "#f59e0b" : table.fixed ? "#dc2626" : "#111827";
  const strokeWidth = isSelected || hasWarning ? 3 : 1.5;
  const fill = "#fef3c7";

  // table.x/y are stored in image-natural pixels; scale up only for display.
  const displayX = table.x * displayScale;
  const displayY = table.y * displayScale;

  // Real render size (natural pixels) from shape + width/depth (metres) x floor-plan
  // scale, then scaled up for on-screen display — same helper the plan canvas uses,
  // so the drag hit-box (the shape node itself) always matches the visible outline.
  const { shape, wPx, hPx } = tableRenderSize(table, scale);
  const width = wPx * displayScale;
  const height = hPx * displayScale;
  const labelWidth = Math.max(width, 60 * displayScale);

  return (
    <>
      {shape === "round" || shape === "oval" ? (
        <Ellipse
          x={displayX}
          y={displayY}
          radiusX={width / 2}
          radiusY={height / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={onDragEnd}
        />
      ) : (
        <Rect
          x={displayX}
          y={displayY}
          offsetX={width / 2}
          offsetY={height / 2}
          width={width}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={onDragEnd}
        />
      )}
      <Text
        x={displayX - labelWidth / 2}
        y={displayY - 8}
        width={labelWidth}
        align="center"
        text={String(table.capacity)}
        fontSize={16}
        listening={false}
      />
    </>
  );
}
