"use client";

import { Fragment, useEffect, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Ellipse, Rect, Text, Line } from "react-konva";
import { chairPositions } from "@/lib/floorplan/chairs";
import { tableRenderSize, type TableShapeKind } from "@/lib/floorplan/tableShape";
import type { Point } from "@/lib/floorplan/geometry";

// Same per-zone stroke cycling as the editor's FloorPlanCanvas, so a zone reads the
// same color here as it did while being drawn.
const ZONE_COLORS = ["#2563eb", "#dc2626", "#059669", "#7c3aed", "#ea580c"];

// Chair dots (natural pixels, before displayScale). Occupied chairs with no attribute
// color selected fall back to CHAIR_NEUTRAL_FILL; empty seats always render CHAIR_EMPTY_FILL.
const CHAIR_RADIUS = 6;
const CHAIR_NEUTRAL_FILL = "#6b7280";
const CHAIR_EMPTY_FILL = "#e5e7eb";

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

export interface PlanTableGuest {
  id: string;
  name: string;
  locked: boolean;
}

/** A table plus the derived, render-ready info the canvas needs — no db/engine types leak in here. */
export interface PlanTableView {
  id: string;
  shape: string;
  capacity: number;
  /** Image-natural pixel coordinates (same space as the Plan 2 editor). */
  x: number;
  y: number;
  guests: PlanTableGuest[];
  /** Stable human label ("Mesa 1"). Falls back to a short id if omitted. */
  label?: string;
  fixed: boolean;
  /** Metres — same convention as the Prisma Table model; feeds `tableRenderSize`. */
  width?: number | null;
  depth?: number | null;
}

export interface PlanCanvasProps {
  imageUrl?: string;
  tables: PlanTableView[];
  /** Floor plan's pixels-per-metre calibration; drives each table's real render size
   * via `tableRenderSize`. 0/absent falls back to `tableRenderSize`'s fixed defaults. */
  scale?: number;
  /** Read-only zone outlines (rooms/areas) from the applied template's floor plan,
   * each a closed polygon in image-natural pixel space. Rendered behind the tables,
   * same translucent style as the editor — no interaction here. */
  zones?: Point[][];
  /** Table ids currently over capacity — rendered in red. */
  overCapacityIds: string[];
  maxWidth: number;
  maxHeight: number;
  /** Called when a guest card (dragged from another table or the unassigned tray) is dropped onto a table. */
  onAssign: (guestId: string, tableId: string) => void;
  /** Called when a guest chip's lock button is toggled. */
  onToggleGuestLock: (guestId: string, locked: boolean) => void;
  /** Called when a table's fix button is toggled. */
  onToggleTableFixed: (tableId: string, fixed: boolean) => void;
  /** Called when guest A is dropped directly onto guest B's chip — exchanges their tables. */
  onSwap: (guestAId: string, guestBId: string) => void;
  /** Maps guest id -> hex color for the currently selected color attribute (Task 4).
   * Guests absent from this map (attribute is "Nenhum", or the guest has no value for
   * the selected attribute) render with the plain Plan 5 chip styling. */
  colorByGuest?: Record<string, string>;
}

interface TableGeom {
  table: PlanTableView;
  shape: TableShapeKind;
  displayX: number;
  displayY: number;
  width: number;
  height: number;
}

export default function PlanCanvas({
  imageUrl,
  tables,
  scale = 0,
  zones = [],
  overCapacityIds,
  maxWidth,
  maxHeight,
  onAssign,
  onToggleGuestLock,
  onToggleTableFixed,
  onSwap,
  colorByGuest = {},
}: PlanCanvasProps) {
  const image = useImageElement(imageUrl);

  // displayScale maps image-natural pixels -> on-screen (display) pixels, same
  // convention as FloorPlanCanvas (Plan 2). Table x/y here are always natural.
  const naturalWidth = image?.naturalWidth || maxWidth;
  const naturalHeight = image?.naturalHeight || maxHeight;
  const displayScale = image ? Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight) : 1;
  const stageWidth = image ? naturalWidth * displayScale : maxWidth;
  const stageHeight = image ? naturalHeight * displayScale : maxHeight;

  const overCapacitySet = new Set(overCapacityIds);

  const geoms: TableGeom[] = tables.map((t) => {
    const { shape, wPx, hPx } = tableRenderSize(t, scale);
    return {
      table: t,
      shape,
      displayX: t.x * displayScale,
      displayY: t.y * displayScale,
      width: wPx * displayScale,
      height: hPx * displayScale,
    };
  });

  return (
    <div style={{ position: "relative", width: stageWidth, height: stageHeight }}>
      <Stage width={stageWidth} height={stageHeight} style={{ border: "1px solid #ccc" }}>
        <Layer>
          {image && (
            <KonvaImage image={image} width={stageWidth} height={stageHeight} listening={false} />
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
                    fill="rgba(37, 99, 235, 0.12)"
                    stroke={color}
                    strokeWidth={2}
                  />
                )}
              </Fragment>
            );
          })}
        </Layer>
        <Layer listening={false}>
          {geoms.map((g) => (
            <TableShape key={g.table.id} geom={g} overCapacity={overCapacitySet.has(g.table.id)} />
          ))}
        </Layer>
        {/* Decorative chair layer — non-listening so it never intercepts the HTML
            drag/drop overlay below. Occupied chairs (first `occupancy` seats, in the
            table's seated-guest order) take colorByGuest; the rest render neutral/empty. */}
        <Layer listening={false}>
          {geoms.map((g) =>
            chairPositions(
              {
                x: g.table.x,
                y: g.table.y,
                capacity: g.table.capacity,
                shape: g.table.shape,
                width: g.table.width,
                depth: g.table.depth,
              },
              scale
            ).map((chair, i) => {
              const guest = g.table.guests[i];
              const fill = guest ? colorByGuest[guest.id] ?? CHAIR_NEUTRAL_FILL : CHAIR_EMPTY_FILL;
              return (
                <Circle
                  key={`${g.table.id}-chair-${i}`}
                  x={chair.x * displayScale}
                  y={chair.y * displayScale}
                  radius={CHAIR_RADIUS * displayScale}
                  fill={fill}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  listening={false}
                />
              );
            })
          )}
        </Layer>
      </Stage>

      {/* HTML drop-target overlay: Konva shapes don't receive native HTML drag events,
          so each table gets a transparent, absolutely-positioned div aligned to its
          on-screen (display-scaled) position. It doubles as the home for the seated
          guests' draggable chips, so a guest can be picked back up off a table. */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {geoms.map((g) => (
          <div
            key={g.table.id}
            data-testid={`table-drop-${g.table.id}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const guestId = e.dataTransfer.getData("guestId");
              if (guestId) onAssign(guestId, g.table.id);
            }}
            style={{
              position: "absolute",
              left: g.displayX - g.width / 2,
              top: g.displayY - g.height / 2,
              width: g.width,
              height: g.height,
              pointerEvents: "auto",
            }}
          >
            <button
              type="button"
              data-testid={`fix-table-${g.table.id}`}
              onClick={() => onToggleTableFixed(g.table.id, !g.table.fixed)}
              title={g.table.fixed ? "Desbloquear mesa" : "Fixar mesa (ignorada pelo Generate)"}
              style={{
                position: "absolute",
                top: -10,
                left: -10,
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: g.table.fixed ? "1px solid #b45309" : "1px solid #cbd5e1",
                background: g.table.fixed ? "#fffbeb" : "#fff",
                cursor: "pointer",
                fontSize: 12,
                lineHeight: 1,
                padding: 0,
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            >
              {g.table.fixed ? "🔒" : "🔓"}
            </button>
            <div
              style={{
                position: "absolute",
                top: g.height + 6,
                left: -40,
                width: g.width + 80,
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                justifyContent: "center",
              }}
            >
              {g.table.guests.map((guest) => {
                const color = colorByGuest[guest.id];
                return (
                <span
                  key={guest.id}
                  draggable
                  data-testid={`guest-chip-${guest.id}`}
                  data-color={color ?? ""}
                  onDragStart={(e) => e.dataTransfer.setData("guestId", guest.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const draggedId = e.dataTransfer.getData("guestId");
                    if (draggedId && draggedId !== guest.id) onSwap(draggedId, guest.id);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1.3,
                    background: color ? `${color}1a` : guest.locked ? "#fffbeb" : "#fff",
                    border: guest.locked ? "2px solid #b45309" : "1px solid #cbd5e1",
                    borderLeft: color ? `4px solid ${color}` : undefined,
                    borderRadius: 6,
                    padding: color ? "3px 8px 3px 6px" : "3px 8px",
                    cursor: "grab",
                    whiteSpace: "nowrap",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                  }}
                >
                  {guest.name}
                  <button
                    type="button"
                    data-testid={`lock-guest-${guest.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleGuestLock(guest.id, !guest.locked);
                    }}
                    title={guest.locked ? "Desbloquear convidado" : "Bloquear convidado (ignorado pelo Generate)"}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 12,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    {guest.locked ? "🔒" : "🔓"}
                  </button>
                </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableShape({ geom, overCapacity }: { geom: TableGeom; overCapacity: boolean }) {
  const { table, shape, displayX, displayY, width, height } = geom;
  const stroke = overCapacity ? "#dc2626" : table.fixed ? "#b45309" : "#111827";
  const strokeWidth = overCapacity ? 3 : table.fixed ? 2.5 : 1.5;
  const fill = overCapacity ? "#fee2e2" : "#fef3c7";
  const dash = !overCapacity && table.fixed ? [6, 3] : undefined;
  const labelWidth = 150;

  const tableLabel = table.label ?? `#${table.id.slice(0, 6)}`;
  const occupancyLabel = `${table.guests.length}/${table.capacity}`;

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
          dash={dash}
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
          dash={dash}
        />
      )}
      <Text
        x={displayX - labelWidth / 2}
        y={displayY - 16}
        width={labelWidth}
        align="center"
        text={table.fixed ? `🔒 ${tableLabel}` : tableLabel}
        fontSize={13}
        fill="#374151"
      />
      <Text
        x={displayX - labelWidth / 2}
        y={displayY + 1}
        width={labelWidth}
        align="center"
        text={occupancyLabel}
        fontSize={18}
        fontStyle="bold"
        fill={overCapacity ? "#dc2626" : "#111827"}
      />
    </>
  );
}
