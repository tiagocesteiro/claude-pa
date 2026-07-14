import type { Point } from "./geometry";
import { pointInPolygon } from "./boundary";

/**
 * Shortest distance from point `p` to the line SEGMENT `a`-`b` (not the
 * infinite line) — natural pixels, pure/deterministic. Degenerate segments
 * (a === b) fall back to point-to-point distance.
 */
export function pointSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/** Nearest point on segment `a`-`b` to `p` — the same projection/clamp
 * `pointSegmentDistance` uses internally, exposed here so `resolveInsideZone`
 * can push the centre out from that foot point along the wall's normal. */
function closestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return { x: a.x, y: a.y };

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

export interface ResolveInsideZoneResult extends Point {
  /** False when `center` fell outside every zone — caller should treat the
   * move as invalid (keep the last valid position) rather than trust x/y. */
  ok: boolean;
}

/**
 * Resolves `center` so it stays at least `clearance` natural pixels away from
 * every wall of the zone polygon that contains it.
 *
 * - Picks the zone (from `zones`) whose polygon contains `center` (ray-casting
 *   via `pointInPolygon`, same helper the out-of-bounds/out-of-zone checks
 *   use). Zones with fewer than 3 points (still being drawn) are ignored —
 *   they're not a real boundary yet.
 * - If no zone contains `center`, returns it unchanged with `ok: false` — the
 *   caller (drag barrier / add-table placement) decides what "invalid" means.
 * - Otherwise, iteratively pushes the centre INWARD away from any edge whose
 *   distance is < `clearance`: for the nearest point on that edge, the centre
 *   is set to `foot + normalize(center - foot) * clearance` — i.e. exactly
 *   `clearance` away from that wall, along the line from the wall to the
 *   centre's current position (which — since `center` started inside the
 *   polygon — already points inward). Repeats a few passes so a corner
 *   (two close walls) resolves against both, same iterative-passes shape as
 *   `resolveNoOverlap`.
 *
 * Pure and deterministic: never mutates `center`/`zones`.
 */
export function resolveInsideZone(
  center: Point,
  clearance: number,
  zones: Point[][],
  maxIter = 6
): ResolveInsideZoneResult {
  const zone = zones.find((z) => z.length >= 3 && pointInPolygon(center, z));
  if (!zone) return { x: center.x, y: center.y, ok: false };

  let x = center.x;
  let y = center.y;

  for (let iter = 0; iter < maxIter; iter++) {
    let moved = false;

    for (let i = 0, j = zone.length - 1; i < zone.length; j = i++) {
      const a = zone[i];
      const b = zone[j];
      const dist = pointSegmentDistance({ x, y }, a, b);
      if (dist >= clearance) continue;

      const foot = closestPointOnSegment({ x, y }, a, b);
      let dirX = x - foot.x;
      let dirY = y - foot.y;
      let mag = Math.hypot(dirX, dirY);

      if (mag === 0) {
        // Centre lies exactly on the edge — no direction to push along yet.
        // Use the edge's normal and pick whichever side stays inside the
        // polygon (arbitrary otherwise, but deterministic).
        const edgeDx = b.x - a.x;
        const edgeDy = b.y - a.y;
        dirX = -edgeDy;
        dirY = edgeDx;
        mag = Math.hypot(dirX, dirY) || 1;
        const probe = { x: x + (dirX / mag) * 0.01, y: y + (dirY / mag) * 0.01 };
        if (!pointInPolygon(probe, zone)) {
          dirX = -dirX;
          dirY = -dirY;
        }
      }

      x = foot.x + (dirX / mag) * clearance;
      y = foot.y + (dirY / mag) * clearance;
      moved = true;
    }

    if (!moved) break;
  }

  return { x, y, ok: true };
}
