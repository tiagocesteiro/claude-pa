import { pixelDistance } from "./geometry";

export const DEFAULT_TABLE_METRES = 1.5;

export interface SpacingTable {
  id: string;
  x: number;
  y: number;
  width?: number | null;
  depth?: number | null;
  shape: string;
  capacity: number;
}

export interface SpacingViolation {
  a: string;
  b: string;
  gapMetres: number;
}

function halfExtent(table: SpacingTable): number {
  const dims = [table.width, table.depth].filter(
    (v): v is number => v != null
  );
  const size = dims.length > 0 ? Math.max(...dims) : DEFAULT_TABLE_METRES;
  return size / 2;
}

export function spacingViolations(
  tables: SpacingTable[],
  minSpacingMetres: number,
  scale: number
): SpacingViolation[] {
  const violations: SpacingViolation[] = [];
  const sorted = [...tables].sort((t1, t2) => (t1.id < t2.id ? -1 : t1.id > t2.id ? 1 : 0));

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const t1 = sorted[i];
      const t2 = sorted[j];
      const centreDistanceMetres = pixelDistance(t1, t2) / scale;
      const gapMetres = centreDistanceMetres - halfExtent(t1) - halfExtent(t2);
      if (gapMetres < minSpacingMetres) {
        violations.push({ a: t1.id, b: t2.id, gapMetres });
      }
    }
  }

  return violations;
}

export interface UnderMinTable {
  id: string;
  minCapacity?: number | null;
}

export function underMinTables(
  occupancyByTableId: Record<string, number>,
  tables: UnderMinTable[]
): string[] {
  return tables
    .filter((table) => {
      const occupancy = occupancyByTableId[table.id] ?? 0;
      return (
        occupancy >= 1 &&
        table.minCapacity != null &&
        occupancy < table.minCapacity
      );
    })
    .map((table) => table.id);
}
