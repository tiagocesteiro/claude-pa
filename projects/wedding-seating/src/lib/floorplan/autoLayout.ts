import type { Point } from "./geometry";

export interface AutoGridOptions {
  originX: number;
  originY: number;
  cellPx: number;
  /** Number of columns per row. Defaults to `Math.ceil(Math.sqrt(count))`. */
  cols?: number;
}

/**
 * Deterministic row-major grid of `count` points in natural-pixel space,
 * starting at (originX, originY) and stepping by cellPx in both axes.
 */
export function autoGridPositions(count: number, opts: AutoGridOptions): Point[] {
  if (count <= 0) return [];
  const cols = opts.cols ?? Math.ceil(Math.sqrt(count));
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    points.push({
      x: opts.originX + col * opts.cellPx,
      y: opts.originY + row * opts.cellPx,
    });
  }
  return points;
}
