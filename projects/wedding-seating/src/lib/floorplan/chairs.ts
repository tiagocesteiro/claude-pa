import { metresToPixels } from "./geometry";

export interface ChairTableInput {
  x: number;
  y: number;
  capacity: number;
  shape: string;
  /** Metres — same convention as the Prisma Table model. Optional: falls back to the
   * same default natural-pixel dimensions PlanCanvas uses for the table shape itself. */
  width?: number | null;
  depth?: number | null;
}

export interface ChairPoint {
  x: number;
  y: number;
}

// Mirrors PlanCanvas's own table-shape constants (natural pixels) so chairs default to
// a sensible ring/box around the table even when no real width/depth is known.
const DEFAULT_ROUND_RADIUS = 46;
const DEFAULT_RECT_WIDTH = 130;
const DEFAULT_RECT_HEIGHT = 70;

// How far outside the table edge chairs sit, in natural pixels.
const CHAIR_OFFSET = 18;

/**
 * Evenly spaced chair positions around a table's perimeter, in natural pixels
 * (same coordinate space as the table's own x/y). Always returns exactly
 * `table.capacity` points. Pure and deterministic — same input, same output.
 *
 * `scale` converts the table's width/depth (metres) into natural pixels, the
 * same px/metre convention as `metresToPixels`/`scaleFromReference`. When
 * width/depth are absent, the table's on-canvas default size is used instead.
 */
export function chairPositions(table: ChairTableInput, scale: number): ChairPoint[] {
  const n = Math.max(0, Math.floor(table.capacity));
  if (n === 0) return [];

  if (table.shape === "round") {
    const diameter =
      table.width && table.width > 0 ? metresToPixels(table.width, scale) : DEFAULT_ROUND_RADIUS * 2;
    const chairRadius = diameter / 2 + CHAIR_OFFSET;
    const points: ChairPoint[] = [];
    for (let i = 0; i < n; i++) {
      // Start at the top (12 o'clock) and go clockwise, matching screen-space
      // (y grows downward) so the layout reads naturally.
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      points.push({
        x: table.x + chairRadius * Math.cos(angle),
        y: table.y + chairRadius * Math.sin(angle),
      });
    }
    return points;
  }

  // Rectangular (or any non-round shape): distribute chairs by arc length around
  // the four edges of a slightly larger rectangle (table size + chair offset).
  const width =
    table.width && table.width > 0 ? metresToPixels(table.width, scale) : DEFAULT_RECT_WIDTH;
  const height =
    table.depth && table.depth > 0 ? metresToPixels(table.depth, scale) : DEFAULT_RECT_HEIGHT;
  const halfW = width / 2 + CHAIR_OFFSET;
  const halfH = height / 2 + CHAIR_OFFSET;
  const perimeter = 4 * halfW + 4 * halfH;

  const points: ChairPoint[] = [];
  for (let i = 0; i < n; i++) {
    const dist = (perimeter * i) / n;
    const rel = pointOnRectPerimeter(halfW, halfH, dist);
    points.push({ x: table.x + rel.x, y: table.y + rel.y });
  }
  return points;
}

/** Walks clockwise from the top-left corner of a `2*halfW x 2*halfH` rectangle
 * centered on the origin, returning the point `dist` natural pixels along the
 * perimeter (wrapping via modulo so any `dist` is valid). */
function pointOnRectPerimeter(halfW: number, halfH: number, dist: number): ChairPoint {
  const topLen = 2 * halfW;
  const rightLen = 2 * halfH;
  const bottomLen = 2 * halfW;
  const perimeter = 2 * topLen + 2 * rightLen;
  let d = ((dist % perimeter) + perimeter) % perimeter;

  if (d < topLen) return { x: -halfW + d, y: -halfH };
  d -= topLen;
  if (d < rightLen) return { x: halfW, y: -halfH + d };
  d -= rightLen;
  if (d < bottomLen) return { x: halfW - d, y: halfH };
  d -= bottomLen;
  return { x: -halfW, y: halfH - d };
}
