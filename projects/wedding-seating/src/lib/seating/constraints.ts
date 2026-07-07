import type { Assignment, SeatingConstraint, SeatingInput, SeatTable } from "./types";

export function occupantsByTable(
  assignment: Assignment,
  tables: SeatTable[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const t of tables) {
    result[t.id] = [...t.fixedGuestIds];
  }
  for (const [guestId, tableId] of Object.entries(assignment)) {
    if (!result[tableId]) result[tableId] = [];
    result[tableId].push(guestId);
  }
  return result;
}

export function tablesOverCapacity(
  assignment: Assignment,
  tables: SeatTable[]
): SeatTable[] {
  const occ = occupantsByTable(assignment, tables);
  return tables.filter((t) => (occ[t.id]?.length ?? 0) > t.capacity);
}

export function tableOfGuest(
  guestId: string,
  assignment: Assignment,
  tables: SeatTable[]
): string | undefined {
  if (assignment[guestId] !== undefined) return assignment[guestId];
  for (const t of tables) {
    if (t.fixedGuestIds.includes(guestId)) return t.id;
  }
  return undefined;
}

export function separationViolations(
  assignment: Assignment,
  constraints: SeatingConstraint[],
  tables: SeatTable[] = []
): SeatingConstraint[] {
  return constraints.filter((c) => {
    if (c.type !== "separate") return false;
    const ta = tableOfGuest(c.a, assignment, tables);
    const tb = tableOfGuest(c.b, assignment, tables);
    return ta !== undefined && ta === tb;
  });
}

export function isHardValid(assignment: Assignment, input: SeatingInput): boolean {
  return (
    tablesOverCapacity(assignment, input.tables).length === 0 &&
    separationViolations(assignment, input.constraints, input.tables).length === 0
  );
}
