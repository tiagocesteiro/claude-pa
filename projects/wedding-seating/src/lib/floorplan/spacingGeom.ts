import type { Point } from "./geometry";
import { tableRenderSize, type ShapeTable } from "./tableShape";

/**
 * An axis-aligned box in natural-pixel space, centred at (cx, cy) with
 * half-width/half-height `halfW`/`halfH`. Used to represent a table's real
 * render footprint (`tableRenderSize`) expanded by its spacing margin — see
 * `spacingHalfExtents`. Tables in this app never rotate, so axis-aligned box
 * math is exact for the enforcement/collision logic even though the VISUAL
 * boundary drawn on screen is shape-appropriate (rect/ellipse) — see
 * `FloorPlanCanvas`.
 */
export interface SpacingBox {
  id?: string;
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
}

/**
 * A table's spacing half-extents in natural pixels: `tableRenderSize`'s
 * half-width/half-height plus a margin of `minSpacingMetres / 2` on every
 * side. Two tables whose boxes just touch (not overlap) are therefore
 * exactly `minSpacingMetres` apart edge-to-edge — each contributes half the
 * gap.
 *
 * When `scale <= 0` there's no meaningful px/metre conversion (same case
 * `tableRenderSize` handles with its own fixed-pixel fallback), so the
 * margin is treated as 0 — only the fallback pixel size applies, with no
 * additional spacing margin added on top.
 */
export function spacingHalfExtents(
  table: ShapeTable,
  scale: number,
  minSpacingMetres: number
): { halfW: number; halfH: number } {
  const { wPx, hPx } = tableRenderSize(table, scale);
  const margin = scale > 0 ? (minSpacingMetres * scale) / 2 : 0;
  return { halfW: wPx / 2 + margin, halfH: hPx / 2 + margin };
}

/**
 * Strict axis-aligned box overlap test — two boxes that merely TOUCH (equal
 * to the sum of half-extents) are NOT considered overlapping, so a resolved
 * position that lands exactly on another box's edge is accepted as valid.
 */
export function boxesOverlap(a: SpacingBox, b: SpacingBox): boolean {
  return Math.abs(a.cx - b.cx) < a.halfW + b.halfW && Math.abs(a.cy - b.cy) < a.halfH + b.halfH;
}

/**
 * Resolves a desired centre position so it never overlaps any of `others`'
 * spacing boxes, moving it the minimum distance necessary.
 *
 * Iterative minimum-translation resolution: starting from `desired`, each
 * pass checks every other box in order; for any that still overlaps, it
 * computes the axis of least penetration (`penX`/`penY` — how far the boxes
 * currently intersect along each axis) and pushes the centre out along the
 * SMALLER of the two, away from that other box's centre. This repeats
 * (a box resolved against one neighbour can start overlapping a different
 * one) until a full pass finds no overlaps left, or `maxIter` passes have
 * run (a practical bound — pathological configurations could otherwise loop
 * indefinitely).
 *
 * Pure and deterministic: never mutates `desired`/`self`/`others`.
 */
export function resolveNoOverlap(
  desired: Point,
  self: { halfW: number; halfH: number },
  others: SpacingBox[],
  maxIter = 8
): Point {
  let cx = desired.x;
  let cy = desired.y;

  for (let iter = 0; iter < maxIter; iter++) {
    let moved = false;

    for (const other of others) {
      const selfBox: SpacingBox = { cx, cy, halfW: self.halfW, halfH: self.halfH };
      if (!boxesOverlap(selfBox, other)) continue;

      const dx = cx - other.cx;
      const dy = cy - other.cy;
      const penX = self.halfW + other.halfW - Math.abs(dx);
      const penY = self.halfH + other.halfH - Math.abs(dy);
      if (penX <= 0 || penY <= 0) continue; // already non-overlapping on one axis

      if (penX < penY) {
        const sign = dx === 0 ? 1 : Math.sign(dx);
        cx += sign * penX;
      } else {
        const sign = dy === 0 ? 1 : Math.sign(dy);
        cy += sign * penY;
      }
      moved = true;
    }

    if (!moved) break;
  }

  return { x: cx, y: cy };
}
