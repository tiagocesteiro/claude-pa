"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Ellipse, Rect, Text, Line } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { EditorTable } from "@/lib/floorplan/editorState";
import type { Point } from "@/lib/floorplan/geometry";
import { tableRenderSize } from "@/lib/floorplan/tableShape";
import { chairPositions } from "@/lib/floorplan/chairs";

// Decorative chair dots — same convention as the seating plan's PlanCanvas, but
// always neutral (the editor has no seated guests to tint by).
const CHAIR_RADIUS = 6;
const CHAIR_FILL = "#e5e7eb";

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

export type CanvasMode = "select" | "add-table" | "calibrate" | "draw-zone";

/** Stroke colors cycled per zone index so multiple zones stay visually distinguishable. */
const ZONE_COLORS = ["#6C9BD1", "#E88B7D", "#6FBF9B", "#A98BD1", "#E8B04B"];

export interface FloorPlanCanvasProps {
  imageUrl?: string;
  tables: EditorTable[];
  /** Floor plan's pixels-per-metre calibration; drives each table's real render size
   * via `tableRenderSize`. 0/absent falls back to `tableRenderSize`'s fixed defaults. */
  scale?: number;
  /** Room dimensions in metres (Plan 18 Task 7 — "create a room from scratch"). Only
   * used when there's no `imageUrl`: the stage is then sized from `roomWidth*scale ×
   * roomDepth*scale` natural pixels (same convention as an image's natural size) and
   * a plain room rectangle is drawn as the background. Ignored whenever `imageUrl` is
   * present — the image always defines the natural size instead. */
  roomWidth?: number;
  roomDepth?: number;
  selectedId: string | null;
  mode: CanvasMode;
  /** Reference calibration points, in image-natural pixel space. */
  calibrationPoints?: Point[];
  /** Zones (rooms/areas), each a closed polygon in image-natural pixel space. In
   * "draw-zone" mode, clicks are reported via onZoneClick and the caller is
   * expected to append them to the last (active) zone in this array. */
  zones?: Point[][];
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
  onZoneClick?: (at: Point) => void;
  /** When provided, each table renders a small "×" remove button (same affordance
   * as the seating plan's editMode — see PlanCanvas). Omit to render without it. */
  onDeleteTable?: (id: string) => void;
  /** Called on double-click of a table (Plan 18 Task 4) with the new name — `null`
   * clears it back to the "Mesa N" fallback. The prompt itself lives here (this
   * component already knows the table's current name); omit to disable renaming. */
  onRenameTable?: (id: string, name: string | null) => void;
}

export default function FloorPlanCanvas({
  imageUrl,
  tables,
  scale = 0,
  roomWidth = 0,
  roomDepth = 0,
  selectedId,
  mode,
  calibrationPoints = [],
  zones = [],
  maxWidth,
  maxHeight,
  warningTableIds = [],
  onAddTable,
  onMoveTable,
  onSelect,
  onCalibrateClick,
  onZoneClick,
  onDeleteTable,
  onRenameTable,
}: FloorPlanCanvasProps) {
  const image = useImageElement(imageUrl);
  const stageRef = useRef<Konva.Stage>(null);

  // Plan 18 Task 7: a "blank room" (no photo) is sized from its typed dimensions ×
  // scale instead of an image's natural pixels — same natural-pixel space, so
  // tables/zones/calibration/the delete overlay all stay aligned without any of
  // them knowing whether the background is a photo or a plain rectangle.
  const hasRoom = !image && roomWidth > 0 && roomDepth > 0 && scale > 0;
  const roomNaturalWidth = roomWidth * scale;
  const roomNaturalHeight = roomDepth * scale;

  // displayScale maps natural pixels (image OR room) -> on-screen (display) pixels.
  // Persisted quantities (table x/y, calibration points) live in natural space;
  // only rendering multiplies by displayScale. Falls back to a 1:1, max-bounds
  // box when there's neither an image nor valid room dimensions.
  const naturalWidth = image?.naturalWidth || (hasRoom ? roomNaturalWidth : maxWidth);
  const naturalHeight = image?.naturalHeight || (hasRoom ? roomNaturalHeight : maxHeight);
  const hasBackground = Boolean(image) || hasRoom;
  const displayScale = hasBackground ? Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight) : 1;
  const stageWidth = hasBackground ? naturalWidth * displayScale : maxWidth;
  const stageHeight = hasBackground ? naturalHeight * displayScale : maxHeight;

  function toNatural(p: Point): Point {
    return { x: p.x / displayScale, y: p.y / displayScale };
  }

  // Geometry for the HTML remove-button overlay (only rendered when onDeleteTable
  // is provided) — same displayX/Y/width/height convention TableShape uses below,
  // duplicated here because the overlay lives outside the Stage/Konva tree.
  const geoms = tables.map((t) => {
    const { wPx, hPx } = tableRenderSize(t, scale);
    return {
      table: t,
      displayX: t.x * displayScale,
      displayY: t.y * displayScale,
      width: wPx * displayScale,
      height: hPx * displayScale,
    };
  });

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
    if (mode === "draw-zone") {
      onZoneClick?.(naturalPos);
      return;
    }
    onSelect(null);
  }

  const cursor =
    mode === "add-table" ? "copy" : mode === "calibrate" || mode === "draw-zone" ? "crosshair" : "default";

  return (
    <div style={{ position: "relative", width: stageWidth, height: stageHeight }}>
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
        {!image && hasRoom && (
          <Rect
            x={0}
            y={0}
            width={stageWidth}
            height={stageHeight}
            fill="#fafaf9"
            stroke="#9ca3af"
            strokeWidth={2}
            listening={false}
          />
        )}
      </Layer>
      <Layer listening={false}>
        {zones.map((zone, zi) => {
          const color = ZONE_COLORS[zi % ZONE_COLORS.length];
          return (
            <Fragment key={zi}>
              {zone.length >= 2 && (
                <Line
                  points={zone.flatMap((p) => [p.x * displayScale, p.y * displayScale])}
                  closed
                  fill={`${color}22`}
                  stroke={color}
                  strokeWidth={2}
                />
              )}
              {zone.map((p, i) => (
                <Circle key={i} x={p.x * displayScale} y={p.y * displayScale} radius={4} fill={color} />
              ))}
            </Fragment>
          );
        })}
      </Layer>
      <Layer>
        {tables.map((t, i) => (
          <TableShape
            key={t.id}
            table={t}
            index={i}
            displayScale={displayScale}
            scale={scale}
            isSelected={t.id === selectedId}
            hasWarning={warningTableIds.includes(t.id)}
            onSelect={() => onSelect(t.id)}
            onDragEnd={(e) =>
              onMoveTable(t.id, toNatural({ x: e.target.x(), y: e.target.y() }))
            }
            onRename={
              onRenameTable
                ? () => {
                    const next = window.prompt("Nome da mesa:", t.name ?? "");
                    if (next === null) return; // cancelled
                    onRenameTable(t.id, next.trim() || null);
                  }
                : undefined
            }
          />
        ))}
      </Layer>
      {/* Decorative chair layer — non-listening so it never intercepts table
          drag/select/delete. Neutral dots only (no seated-guest data here);
          rect tables respect `heads` (Plan 18 Task 5 — "cabeceiras" toggle). */}
      <Layer listening={false}>
        {tables.map((t) =>
          chairPositions(
            { x: t.x, y: t.y, capacity: t.capacity, shape: t.shape, width: t.width, depth: t.depth, heads: t.heads },
            scale
          ).map((chair, i) => (
            <Circle
              key={`${t.id}-chair-${i}`}
              x={chair.x * displayScale}
              y={chair.y * displayScale}
              radius={CHAIR_RADIUS * displayScale}
              fill={CHAIR_FILL}
              stroke="#9ca3af"
              strokeWidth={1}
              listening={false}
            />
          ))
        )}
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
    {onDeleteTable && (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {geoms.map((g) => (
          <button
            key={g.table.id}
            type="button"
            data-testid={`delete-table-${g.table.id}`}
            onClick={() => onDeleteTable(g.table.id)}
            title="Remover mesa"
            style={{
              position: "absolute",
              left: g.displayX + g.width / 2 - 10,
              top: g.displayY - g.height / 2 - 10,
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "1px solid #dc2626",
              background: "#fef2f2",
              color: "#dc2626",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1,
              padding: 0,
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              pointerEvents: "auto",
            }}
          >
            ×
          </button>
        ))}
      </div>
    )}
    </div>
  );
}

function TableShape({
  table,
  index,
  displayScale,
  scale,
  isSelected,
  hasWarning,
  onSelect,
  onDragEnd,
  onRename,
}: {
  table: EditorTable;
  /** Position within the current tables array — feeds the "Mesa N" fallback label
   * when the table has no custom name (Plan 18 Task 4). */
  index: number;
  displayScale: number;
  scale: number;
  isSelected: boolean;
  hasWarning?: boolean;
  onSelect: () => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  /** Double-click to rename (Plan 18 Task 4). Omit to disable. */
  onRename?: () => void;
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

  // A custom name always wins over the "Mesa N" fallback (same convention as PlanCanvas).
  const tableLabel = table.name?.trim() ? table.name : `Mesa ${index + 1}`;

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
          onDblClick={onRename}
          onDblTap={onRename}
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
          onDblClick={onRename}
          onDblTap={onRename}
        />
      )}
      <Text
        x={displayX - labelWidth / 2}
        y={displayY - 22}
        width={labelWidth}
        align="center"
        text={tableLabel}
        fontSize={13}
        fill="#374151"
        listening={false}
      />
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
