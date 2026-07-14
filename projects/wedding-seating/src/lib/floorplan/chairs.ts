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

  // Rectangular: seats run ALONG the table's length (the long axis, wPx) and stay
  // WITHIN it — never floating past the ends/corners. The two long edges (top/
  // bottom) hold the bulk of the seats, each spread evenly across the length; the
  // two short ends ("cabeceiras") each get one seat ONLY when `heads` is on (that
  // seat is the person at the head of the table, sitting just beyond the end).
  // wPx/hPx come from tableRenderSize (width = long side = length, depth = short).
  const halfLen = wPx / 2; // half the table length (long axis)
  const sideOffset = hPx / 2 + CHAIR_OFFSET; // perpendicular gap beside the long edges
  const endOffset = wPx / 2 + CHAIR_OFFSET; // gap beyond a short end (head seat)

  const withHeads = table.heads !== false;
  const nHeads = withHeads ? Math.min(2, n) : 0;
  const nSides = n - nHeads;
  const nTop = Math.ceil(nSides / 2);
  const nBottom = nSides - nTop;

  // Evenly space `count` seats across the length, each centred in its slot so no
  // seat ever sits outside [-halfLen, halfLen] (i.e. never past the table ends).
  const alongX = (i: number, count: number): number =>
    count <= 0 ? 0 : -halfLen + ((i + 0.5) * (2 * halfLen)) / count;

  const points: ChairPoint[] = [];
  for (let i = 0; i < nTop; i++) {
    points.push({ x: table.x + alongX(i, nTop), y: table.y - sideOffset });
  }
  for (let i = 0; i < nBottom; i++) {
    points.push({ x: table.x + alongX(i, nBottom), y: table.y + sideOffset });
  }
  if (nHeads >= 1) points.push({ x: table.x - endOffset, y: table.y }); // left head
  if (nHeads >= 2) points.push({ x: table.x + endOffset, y: table.y }); // right head
  return points;
}
