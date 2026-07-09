export interface Pt {
  x: number;
  y: number;
}

/**
 * Determines if a point is inside a polygon using the ray-casting algorithm.
 * A polygon with < 3 points returns true (no boundary = everything inside).
 */
export function pointInPolygon(p: Pt, polygon: Pt[]): boolean {
  // No boundary = everything is inside
  if (polygon.length < 3) {
    return true;
  }

  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    // Check if point's y-coordinate is within the edge's y-range
    const intersect =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Returns the IDs of tables whose center is outside the polygon.
 * Returns empty array when polygon has < 3 points (no boundary).
 */
export function outOfBoundsTables(
  tables: { id: string; x: number; y: number }[],
  polygon: Pt[]
): string[] {
  // No boundary = no tables are out of bounds
  if (polygon.length < 3) {
    return [];
  }

  return tables
    .filter((table) => !pointInPolygon({ x: table.x, y: table.y }, polygon))
    .map((table) => table.id);
}
