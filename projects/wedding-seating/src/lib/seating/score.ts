import type { Assignment, Guest, SeatingConstraint, SeatingInput, SeatTable } from "./types";
import { occupantsByTable } from "./constraints";

export const WEIGHTS = { together: 100, groupSpread: 10, balance: 1 } as const;

export function groupSpread(assignment: Assignment, guests: Guest[]): number {
  const tablesByGroup = new Map<string, Set<string>>();
  for (const g of guests) {
    if (g.groupId == null) continue;
    const tableId = assignment[g.id];
    if (tableId === undefined) continue;
    if (!tablesByGroup.has(g.groupId)) tablesByGroup.set(g.groupId, new Set());
    tablesByGroup.get(g.groupId)!.add(tableId);
  }
  let spread = 0;
  for (const set of tablesByGroup.values()) {
    spread += set.size - 1;
  }
  return spread;
}

export function satisfiedTogether(
  assignment: Assignment,
  constraints: SeatingConstraint[]
): number {
  return constraints.filter(
    (c) =>
      c.type === "together" &&
      assignment[c.a] !== undefined &&
      assignment[c.a] === assignment[c.b]
  ).length;
}

export function fillSpread(assignment: Assignment, tables: SeatTable[]): number {
  const occ = occupantsByTable(assignment, tables);
  const fills = Object.values(occ)
    .map((ids) => ids.length)
    .filter((n) => n > 0);
  if (fills.length < 2) return 0;
  return Math.max(...fills) - Math.min(...fills);
}

export function scoreAssignment(assignment: Assignment, input: SeatingInput): number {
  return (
    satisfiedTogether(assignment, input.constraints) * WEIGHTS.together -
    groupSpread(assignment, input.guests) * WEIGHTS.groupSpread -
    fillSpread(assignment, input.tables) * WEIGHTS.balance
  );
}
