import { metresToPixels } from "./geometry";
import { DEFAULT_TABLE_METRES } from "./spacing";

export type TableShapeKind = "round" | "oval" | "rect";

export interface ShapeTable {
  shape: string;
  width?: number | null;
  depth?: number | null;
  capacity: number;
}

export interface TableRenderSize {
  shape: TableShapeKind;
  wPx: number;
  hPx: number;
}

/** Fixed pixel size used when no meaningful scale is available (scale <= 0). */
const DEFAULT_SIZE_PX = 92;

function normalizeShape(shape: string): TableShapeKind {
  return shape === "round" || shape === "oval" ? shape : "rect";
}

function positiveOrNull(v: number | null | undefined): number | null {
  return v != null && v > 0 ? v : null;
}

/**
 * Pure, deterministic computation of a table's real render size in natural
 * pixels, based on its shape and metre dimensions (width/depth) x scale.
 *
 * - round: wPx = hPx = diameterPx (from `width`, falling back to `depth`, then
 *   `DEFAULT_TABLE_METRES`).
 * - oval: wPx from `width` (large axis), hPx from `depth` (small axis) — each
 *   independently falling back to `DEFAULT_TABLE_METRES` when absent.
 * - rect: wPx from `width` (length), hPx from `depth` (short side) — same
 *   fallback rule as oval.
 *
 * When `scale <= 0` there is no meaningful px/metre conversion, so a fixed
 * default pixel size is used instead: `DEFAULT_SIZE_PX` square for round, or
 * for oval/rect the aspect ratio of the known width/depth is preserved
 * (scaled so the larger side equals `DEFAULT_SIZE_PX`); if width/depth are
 * both absent, a square default is used instead.
 */
export function tableRenderSize(table: ShapeTable, scale: number): TableRenderSize {
  const shape = normalizeShape(table.shape);
  const width = positiveOrNull(table.width);
  const depth = positiveOrNull(table.depth);

  if (scale <= 0) {
    if (shape === "round") {
      return { shape, wPx: DEFAULT_SIZE_PX, hPx: DEFAULT_SIZE_PX };
    }
    if (width != null && depth != null) {
      const larger = Math.max(width, depth);
      const factor = DEFAULT_SIZE_PX / larger;
      return { shape, wPx: width * factor, hPx: depth * factor };
    }
    return { shape, wPx: DEFAULT_SIZE_PX, hPx: DEFAULT_SIZE_PX };
  }

  if (shape === "round") {
    const diameterMetres = width ?? depth ?? DEFAULT_TABLE_METRES;
    const diameterPx = metresToPixels(diameterMetres, scale);
    return { shape, wPx: diameterPx, hPx: diameterPx };
  }

  const widthMetres = width ?? DEFAULT_TABLE_METRES;
  const depthMetres = depth ?? DEFAULT_TABLE_METRES;
  return {
    shape,
    wPx: metresToPixels(widthMetres, scale),
    hPx: metresToPixels(depthMetres, scale),
  };
}
