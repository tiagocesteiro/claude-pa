import type { SeatingInput, ConstraintType } from "@/lib/seating";

export interface GuestRowInput {
  id: string;
  name: string;
  groupId: string | null;
  assignedTableId: string | null;
}
export interface TableRowInput {
  id: string;
  capacity: number;
  fixed: boolean;
}
export interface ConstraintRowInput {
  type: string;
  guestAId: string;
  guestBId: string;
}

export function buildSeatingInput(
  guests: GuestRowInput[],
  tables: TableRowInput[],
  constraints: ConstraintRowInput[]
): SeatingInput {
  const fixedTableIds = new Set(tables.filter((t) => t.fixed).map((t) => t.id));

  const fixedByTable = new Map<string, string[]>();
  for (const g of guests) {
    if (g.assignedTableId && fixedTableIds.has(g.assignedTableId)) {
      const list = fixedByTable.get(g.assignedTableId) ?? [];
      list.push(g.id);
      fixedByTable.set(g.assignedTableId, list);
    }
  }

  const engineTables = tables.map((t) => ({
    id: t.id,
    capacity: t.capacity,
    fixed: t.fixed,
    fixedGuestIds: fixedByTable.get(t.id) ?? [],
  }));

  const engineGuests = guests
    .filter((g) => !(g.assignedTableId && fixedTableIds.has(g.assignedTableId)))
    .map((g) => ({ id: g.id, name: g.name, groupId: g.groupId }));

  const engineConstraints = constraints.map((c) => ({
    type: c.type as ConstraintType,
    a: c.guestAId,
    b: c.guestBId,
  }));

  return { guests: engineGuests, tables: engineTables, constraints: engineConstraints };
}
