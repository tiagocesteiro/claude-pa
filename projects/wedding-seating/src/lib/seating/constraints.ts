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

export function separationViolations(
  assignment: Assignment,
  constraints: SeatingConstraint[]
): SeatingConstraint[] {
  return constraints.filter(
    (c) =>
      c.type === "separate" &&
      assignment[c.a] !== undefined &&
      assignment[c.a] === assignment[c.b]
  );
}

export function isHardValid(assignment: Assignment, input: SeatingInput): boolean {
  return (
    tablesOverCapacity(assignment, input.tables).length === 0 &&
    separationViolations(assignment, input.constraints).length === 0
  );
}
