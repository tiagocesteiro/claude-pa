import type { Point } from "./geometry";

export interface SnapGuides {
  /** Natural-pixel x of the active vertical alignment guide (dragged centre-x snapped to it). */
  vertical?: number;
  /** Natural-pixel y of the active horizontal alignment guide (dragged centre-y snapped to it). */
  horizontal?: number;
}

export interface SnapResult extends Point {
  guides: SnapGuides;
}

/**
 * AutoCAD-style centre-alignment snap (Plan 18 Task 9): given a dragged table's
 * centre and the centres of every OTHER table on the same layout, snaps the
 * dragged centre's x to the nearest other centre-x within `thresholdPx` (and
 * independently for y), so tables line up into neat rows/columns while dragging.
 *
 * - Each axis is evaluated independently — a table can snap on both axes at once
 *   (to the same or different neighbours), just one axis, or neither.
 * - When multiple others fall within the threshold on an axis, the NEAREST one wins.
 * - Pure + deterministic: does not mutate `dragged`/`others`, no Konva/DOM involved —
 *   the caller (FloorPlanCanvas) is responsible for applying the returned centre to
 *   the dragged node and rendering guide lines at `guides.vertical`/`guides.horizontal`.
 */
export function computeSnap(dragged: Point, others: Point[], thresholdPx: number): SnapResult {
  let bestX: { dist: number; value: number } | null = null;
  let bestY: { dist: number; value: number } | null = null;

  for (const other of others) {
    const dx = Math.abs(other.x - dragged.x);
    if (dx <= thresholdPx && (!bestX || dx < bestX.dist)) {
      bestX = { dist: dx, value: other.x };
    }
    const dy = Math.abs(other.y - dragged.y);
    if (dy <= thresholdPx && (!bestY || dy < bestY.dist)) {
      bestY = { dist: dy, value: other.y };
    }
  }

  const guides: SnapGuides = {};
  if (bestX) guides.vertical = bestX.value;
  if (bestY) guides.horizontal = bestY.value;

  return {
    x: bestX ? bestX.value : dragged.x,
    y: bestY ? bestY.value : dragged.y,
    guides,
  };
}
