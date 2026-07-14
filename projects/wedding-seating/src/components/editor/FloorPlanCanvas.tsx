"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Ellipse, Rect, Text, Line } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { EditorTable } from "@/lib/floorplan/editorState";
import type { Point } from "@/lib/floorplan/geometry";
import { tableRenderSize } from "@/lib/floorplan/tableShape";
import { chairPositions } from "@/lib/floorplan/chairs";
import type { RoomElement } from "@/lib/floorplan/elements";
import { computeSnap, type SnapGuides } from "@/lib/floorplan/snap";
import { spacingHalfExtents, resolveNoOverlap, type SpacingBox } from "@/lib/floorplan/spacingGeom";
import { resolveInsideZone } from "@/lib/floorplan/zoneClearance";

// Alignment-guide snap (Plan 18 Task 9): the on-screen "magnetism" distance, in
// display (screen) pixels, converted to natural pixels via displayScale before
// being handed to `computeSnap` (which operates in natural-pixel/centre space,
// same as every other persisted quantity here).
const SNAP_THRESHOLD_SCREEN_PX = 8;

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

export type CanvasMode = "select" | "add-table" | "calibrate" | "draw-zone" | "add-element";

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
  /** Decorative room elements (dance floor, bar, ... — Plan 18 Task 8), each a
   * labelled/colored rectangle in image-natural pixel space. Rendered behind the
   * tables; NOT fed into spacing/zone checks (they're not tables). Read-only unless
   * `onMoveElement`/`onSelectElement` are provided (the editor's "Elementos" mode). */
  elements?: RoomElement[];
  /** Currently-selected element id (editor mode only) — renders a highlighted outline. */
  selectedElementId?: string | null;
  /** Called when an element is clicked (editor mode only, i.e. when provided). */
  onSelectElement?: (id: string) => void;
  /** Called when an element is dragged to a new position (top-left, natural-pixel
   * space). Its presence also makes elements draggable. */
  onMoveElement?: (id: string, to: Point) => void;
  /** In "add-element" mode, called with the click position (natural pixels) — the
   * caller places a default-sized rectangle there. */
  onAddElement?: (at: Point) => void;
  /** When provided, each element renders a small "×" remove button (same affordance
   * as `onDeleteTable`). Omit to render without it (read-only views). */
  onDeleteElement?: (id: string) => void;
  /** Enables AutoCAD-style centre-alignment snap while dragging a table (Plan 18
   * Task 9): dashed guide lines + magnetism to other tables' centres. Opt-in and
   * defaults to off so read-only views (couple overview) and the floor-plan/zone
   * editor — which pass a no-op `onMoveTable` — are unaffected; only the venue
   * template editor (`TemplateTableEditor`) turns this on. */
  enableSnap?: boolean;
  /** Called with the underlying Konva stage instance once it mounts (and with
   * `null` on unmount) — lets a read-only caller (the couple overview's "Exportar
   * PDF", Plan 18 Task 10) capture `stage.toDataURL()` on demand. */
  onStageReady?: (stage: Konva.Stage | null) => void;
  /** Draws each table's spacing boundary (Plan 18 Task 11) — a dashed outline,
   * shape-appropriate (rect -> rectangle, round/oval -> ellipse), expanded by
   * `minSpacing/2` on every side. Also activates the drag barrier (a dragged
   * table's boundary is kept from overlapping any other table's boundary) and
   * is read by the template editor's add-table placement. Opt-in like
   * `enableSnap` — off by default so read-only views are unaffected. */
  showSpacing?: boolean;
  /** Minimum required gap between table edges, in METRES (matches the floor
   * plan's `minSpacing` field). 0/absent draws no boundary and disables the
   * drag barrier (only literal overlaps are still prevented, via a 0 margin).
   * Also drives the zone-wall clearance barrier below (Plan 18 Task 12): a
   * table must keep at least this many metres from the walls of whichever
   * zone contains it, in addition to staying clear of other tables. */
  minSpacing?: number;
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
  elements = [],
  selectedElementId = null,
  onSelectElement,
  onMoveElement,
  onAddElement,
  onDeleteElement,
  enableSnap = false,
  onStageReady,
  showSpacing = false,
  minSpacing = 0,
}: FloorPlanCanvasProps) {
  const image = useImageElement(imageUrl);
  const stageRef = useRef<Konva.Stage>(null);

  function handleStageRef(node: Konva.Stage | null) {
    stageRef.current = node;
    onStageReady?.(node);
  }

  // Active alignment guide lines while a table is mid-drag (Plan 18 Task 9), in
  // natural-pixel space — same convention as calibrationPoints/zones — so they
  // scale up alongside everything else at render time. Cleared on drag end.
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({});

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

  // Natural-pixel equivalent of the fixed on-screen magnetism distance — computeSnap
  // itself is unit-agnostic, but every persisted coordinate here (table x/y, guide
  // positions) lives in natural-pixel space, so the threshold has to match.
  const snapThresholdNatural = SNAP_THRESHOLD_SCREEN_PX / displayScale;

  // AutoCAD-style centre-alignment snap (Plan 18 Task 9), called from a table's
  // onDragMove while `enableSnap` is on: snaps the dragged Konva node's live
  // position to the nearest other table's centre line (within threshold) on each
  // axis independently, and tracks which guide line(s) to draw. Mutating the node
  // position directly (vs. only updating React state) is what makes the shape
  // visibly "stick" mid-drag — onDragEnd then reads that same (already-snapped)
  // node position via the existing toNatural(...) conversion, so no separate
  // "commit the snapped value" step is needed.
  // Spacing barrier (Plan 18 Task 11): keeps the dragged table's spacing
  // boundary from ever overlapping another table's — applied AFTER snap so the
  // barrier always wins (a snapped-but-overlapping position gets pushed back
  // out). Resolving every onDragMove (not just onDragEnd) is what makes the
  // table visibly "slide along" the barrier instead of snapping back after the
  // fact. Pure `resolveNoOverlap` does the math; this just feeds it natural-
  // pixel boxes built from each table's real render size (`spacingHalfExtents`).
  function applySpacingBarrier(tableId: string, at: Point): Point {
    if (!showSpacing) return at;
    const dragged = tables.find((t) => t.id === tableId);
    if (!dragged) return at;
    const self = spacingHalfExtents(dragged, scale, minSpacing);
    const others: SpacingBox[] = tables
      .filter((t) => t.id !== tableId)
      .map((t) => ({ id: t.id, cx: t.x, cy: t.y, ...spacingHalfExtents(t, scale, minSpacing) }));
    return resolveNoOverlap(at, self, others);
  }

  // Zone-wall clearance barrier (Plan 18 Task 12): tracks, per table, the last
  // centre position confirmed to respect the wall clearance (seeded from the
  // table's committed x/y at drag start) — used to clamp back to when a live
  // position would leave every zone entirely (resolveInsideZone reports
  // ok:false), same "hold the last good spot" idea `resolveNoOverlap`'s
  // barrier achieves implicitly by never proposing an invalid position.
  const lastValidZonePositionRef = useRef<Record<string, Point>>({});

  function handleTableDragStart(tableId: string) {
    const dragged = tables.find((t) => t.id === tableId);
    if (dragged) lastValidZonePositionRef.current[tableId] = { x: dragged.x, y: dragged.y };
  }

  // Clearance in natural pixels: the table's own half-extent (its largest
  // dimension / 2 — a circular approximation is fine for a wall check) plus
  // the full `minSpacing` (metres -> pixels via `scale`), matching the spec's
  // `maxHalfExtent(table) + minSpacing*scale` — unlike the table-table margin,
  // the wall doesn't contribute its own half, so no /2 here.
  function wallClearance(table: EditorTable): number {
    const { wPx, hPx } = tableRenderSize(table, scale);
    return Math.max(wPx, hPx) / 2 + minSpacing * scale;
  }

  function applyZoneClearance(tableId: string, at: Point): Point {
    if (!showSpacing || minSpacing <= 0 || zones.length === 0) return at;
    const dragged = tables.find((t) => t.id === tableId);
    if (!dragged) return at;
    const clearance = wallClearance(dragged);
    const resolved = resolveInsideZone(at, clearance, zones);
    if (!resolved.ok) {
      // Would leave every zone — reject the move outright, holding the table
      // at the last position confirmed inside a zone with valid clearance.
      return lastValidZonePositionRef.current[tableId] ?? { x: dragged.x, y: dragged.y };
    }
    lastValidZonePositionRef.current[tableId] = { x: resolved.x, y: resolved.y };
    return { x: resolved.x, y: resolved.y };
  }

  function handleTableDragMove(tableId: string, e: KonvaEventObject<DragEvent>) {
    const node = e.target;
    let natural = toNatural({ x: node.x(), y: node.y() });
    let guides: SnapGuides = {};

    if (enableSnap) {
      const others = tables.filter((t) => t.id !== tableId).map((t) => ({ x: t.x, y: t.y }));
      const snapped = computeSnap(natural, others, snapThresholdNatural);
      natural = { x: snapped.x, y: snapped.y };
      guides = snapped.guides;
    }

    natural = applySpacingBarrier(tableId, natural);
    natural = applyZoneClearance(tableId, natural);

    node.x(natural.x * displayScale);
    node.y(natural.y * displayScale);
    setSnapGuides(guides);
  }

  function clearSnapGuides() {
    if (enableSnap || showSpacing) setSnapGuides({});
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

  // Same top-left convention as the Rect itself (no offsetX/Y) — unlike tables, whose
  // x/y are their center point.
  const elementGeoms = elements.map((el) => ({
    element: el,
    displayX: el.x * displayScale,
    displayY: el.y * displayScale,
    width: el.w * displayScale,
    height: el.h * displayScale,
  }));

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
    if (mode === "add-element") {
      onAddElement?.(naturalPos);
      return;
    }
    onSelect(null);
  }

  const cursor =
    mode === "add-table" || mode === "add-element"
      ? "copy"
      : mode === "calibrate" || mode === "draw-zone"
        ? "crosshair"
        : "default";

  const elementsInteractive = Boolean(onMoveElement || onSelectElement);

  return (
    <div style={{ position: "relative", width: stageWidth, height: stageHeight }}>
    <Stage
      ref={handleStageRef}
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
      {/* Room elements (Plan 18 Task 8 — dance floor, bar, ...): decorative rectangles
          drawn behind the tables, filled with a semi-transparent version of their
          chosen color, label centered. Draggable/selectable only when the caller
          wires onMoveElement/onSelectElement (the template editor's "Elementos" mode);
          inert (listening=false) everywhere else, e.g. the seating plan/couple view. */}
      <Layer listening={elementsInteractive}>
        {elementGeoms.map(({ element, displayX, displayY, width, height }) => {
          const isSelected = element.id === selectedElementId;
          return (
            <Fragment key={element.id}>
              <Rect
                x={displayX}
                y={displayY}
                width={width}
                height={height}
                fill={`${element.color}b3`}
                stroke={isSelected ? "#2563eb" : element.color}
                strokeWidth={isSelected ? 3 : 1.5}
                draggable={Boolean(onMoveElement)}
                onClick={onSelectElement ? () => onSelectElement(element.id) : undefined}
                onTap={onSelectElement ? () => onSelectElement(element.id) : undefined}
                onDragEnd={
                  onMoveElement
                    ? (e) => onMoveElement(element.id, toNatural({ x: e.target.x(), y: e.target.y() }))
                    : undefined
                }
              />
              <Text
                x={displayX}
                y={displayY}
                width={width}
                height={height}
                align="center"
                verticalAlign="middle"
                text={element.label}
                fontSize={14}
                fontStyle="bold"
                fill="#111827"
                listening={false}
              />
            </Fragment>
          );
        })}
      </Layer>
      {/* Spacing boundaries (Plan 18 Task 11) — a dashed, shape-appropriate outline
          around each table's real render size expanded by minSpacing/2 on every
          side (rect -> rectangle, round/oval -> ellipse). Non-listening: purely
          visual, drawn behind the tables layer. Two boundaries just touching means
          exactly `minSpacing` of edge-to-edge gap (each contributes half). */}
      {showSpacing && minSpacing > 0 && (
        <Layer listening={false}>
          {tables.map((t) => {
            const { halfW, halfH } = spacingHalfExtents(t, scale, minSpacing);
            const displayX = t.x * displayScale;
            const displayY = t.y * displayScale;
            const boundaryW = halfW * 2 * displayScale;
            const boundaryH = halfH * 2 * displayScale;
            const isRect = t.shape !== "round" && t.shape !== "oval";
            return isRect ? (
              <Rect
                key={`spacing-${t.id}`}
                x={displayX}
                y={displayY}
                offsetX={boundaryW / 2}
                offsetY={boundaryH / 2}
                width={boundaryW}
                height={boundaryH}
                stroke="#9ca3af"
                strokeWidth={1}
                dash={[5, 4]}
                listening={false}
              />
            ) : (
              <Ellipse
                key={`spacing-${t.id}`}
                x={displayX}
                y={displayY}
                radiusX={boundaryW / 2}
                radiusY={boundaryH / 2}
                stroke="#9ca3af"
                strokeWidth={1}
                dash={[5, 4]}
                listening={false}
              />
            );
          })}
        </Layer>
      )}
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
            onDragStart={showSpacing ? () => handleTableDragStart(t.id) : undefined}
            onDragMove={enableSnap || showSpacing ? (e) => handleTableDragMove(t.id, e) : undefined}
            onDragEnd={(e) => {
              onMoveTable(t.id, toNatural({ x: e.target.x(), y: e.target.y() }));
              clearSnapGuides();
            }}
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
      {/* Alignment guide lines (Plan 18 Task 9) — dashed lines spanning the stage at
          the active vertical/horizontal snap position, drawn while dragging a table
          near another's centre line. Non-listening, cleared on drag end. */}
      <Layer listening={false}>
        {snapGuides.vertical !== undefined && (
          <Line
            points={[snapGuides.vertical * displayScale, 0, snapGuides.vertical * displayScale, stageHeight]}
            stroke="#2563eb"
            strokeWidth={1}
            dash={[6, 4]}
          />
        )}
        {snapGuides.horizontal !== undefined && (
          <Line
            points={[0, snapGuides.horizontal * displayScale, stageWidth, snapGuides.horizontal * displayScale]}
            stroke="#2563eb"
            strokeWidth={1}
            dash={[6, 4]}
          />
        )}
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
    {onDeleteElement && (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {elementGeoms.map((g) => (
          <button
            key={g.element.id}
            type="button"
            data-testid={`delete-element-${g.element.id}`}
            onClick={() => onDeleteElement(g.element.id)}
            title="Remover elemento"
            style={{
              position: "absolute",
              left: g.displayX + g.width - 10,
              top: g.displayY - 10,
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
  onDragStart,
  onDragMove,
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
  /** Seeds the zone-wall clearance barrier's "last valid position" at the start
   * of a drag (Plan 18 Task 12). Omit to disable (matches `showSpacing={false}`). */
  onDragStart?: () => void;
  /** Live alignment-snap while dragging (Plan 18 Task 9). Omit to disable (matches
   * `enableSnap={false}` on the parent canvas). */
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
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
          onDragStart={onDragStart}
          onDragMove={onDragMove}
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
          onDragStart={onDragStart}
          onDragMove={onDragMove}
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
