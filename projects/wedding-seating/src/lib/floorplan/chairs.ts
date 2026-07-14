import { tableRenderSize } from "./tableShape";

export interface ChairTableInput {
  x: number;
  y: number;
  capacity: number;
  shape: string;
  /** Metres — same convention as the Prisma Table model. Optional: falls back to the
   * same default natural-pixel dimensions PlanCanvas uses for the table shape itself. */
  width?: number | null;
  depth?: number | null;
  /** Rect tables only ("cabeceiras"): whether the two SHORT ends get chairs. Defaults
   * to true (today's behavior) when unset/null. Ignored for round/oval tables. */
  heads?: boolean | null;
}

export interface ChairPoint {
  x: number;
  y: number;
}

// How far outside the table edge chairs sit, in natural pixels.
const CHAIR_OFFSET = 18;

/**
 * Evenly spaced chair positions around a table's real outline, in natural
 * pixels (same coordinate space as the table's own x/y). Always returns
 * exactly `table.capacity` points. Pure and deterministic — same input, same
 * output.
 *
 * The outline itself comes from `tableRenderSize`, which resolves shape +
 * width/depth (metres) x `scale` into real pixel extents (falling back to
 * sensible defaults when dimensions/scale are absent). round/oval tables get
 * an elliptical ring of chairs; rect tables get chairs distributed around the
 * four edges of the rectangle.
 */
export function chairPositions(table: ChairTableInput, scale: number): ChairPoint[] {
  const n = Math.max(0, Math.floor(table.capacity));
  if (n === 0) return [];

  const { shape, wPx, hPx } = tableRenderSize(table, scale);

  if (shape === "round" || shape === "oval") {
    const rx = wPx / 2 + CHAIR_OFFSET;
    const ry = hPx / 2 + CHAIR_OFFSET;
    const points: ChairPoint[] = [];
    for (let i = 0; i < n; i++) {
      // Start at the top (12 o'clock) and go clockwise, matching screen-space
      // (y grows downward) so the layout reads naturally.
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      points.push({
        x: table.x + rx * Math.cos(angle),
        y: table.y + ry * Math.sin(angle),
      });
    }
    return points;
  }

  // Rectangular: distribute chairs by arc length around the four edges of a
  // slightly larger rectangle (table size + chair offset).
  const halfW = wPx / 2 + CHAIR_OFFSET;
  const halfH = hPx / 2 + CHAIR_OFFSET;

  // "Cabeceiras" off: no chairs on the two SHORT ends — just the top/bottom
  // (long) edges. wPx/hPx come from tableRenderSize, where width is always the
  // long side (length) and depth the short side, so the short ends are the
  // left/right edges (length halfH*2) and the long edges are top/bottom
  // (length halfW*2) — walked here instead of the full-perimeter helper below.
  if (table.heads === false) {
    const points: ChairPoint[] = [];
    for (let i = 0; i < n; i++) {
      const dist = (4 * halfW * i) / n;
      const rel = pointOnRectLongSides(halfW, halfH, dist);
      points.push({ x: table.x + rel.x, y: table.y + rel.y });
    }
    return points;
  }

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

/** Same idea as `pointOnRectPerimeter`, but walking only the top and bottom
 * (long) edges — used when a rect table has no chairs on its short ends
 * ("cabeceiras" off). `dist` wraps over `4 * halfW` (top edge + bottom edge,
 * each `2 * halfW` long). */
function pointOnRectLongSides(halfW: number, halfH: number, dist: number): ChairPoint {
  const edgeLen = 2 * halfW;
  const total = 2 * edgeLen;
  let d = ((dist % total) + total) % total;

  if (d < edgeLen) return { x: -halfW + d, y: -halfH };
  d -= edgeLen;
  return { x: halfW - d, y: halfH };
}
