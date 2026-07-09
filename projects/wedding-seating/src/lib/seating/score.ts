import type { Assignment, Guest, SeatingConstraint, SeatingInput, SeatTable } from "./types";
import { occupantsByTable } from "./constraints";

export const WEIGHTS = { together: 100, balance: 1 } as const;

export const GROUP_WEIGHTS = [10, 5, 2] as const;

export function groupsOf(guest: Guest): string[] {
  const raw = guest.groupIds ?? (guest.groupId != null ? [guest.groupId] : []);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const g of raw) {
    if (!seen.has(g)) {
      seen.add(g);
      result.push(g);
    }
  }
  return result;
}

export function groupReward(assignment: Assignment, guests: Guest[]): number {
  const tableOf = new Map<string, string>();
  for (const g of guests) {
    const tableId = assignment[g.id];
    if (tableId !== undefined) tableOf.set(g.id, tableId);
  }

  let reward = 0;
  for (const g of guests) {
    const myTable = tableOf.get(g.id);
    if (myTable === undefined) continue;
    const myGroups = groupsOf(g);
    for (let i = 0; i < myGroups.length; i++) {
      const groupId = myGroups[i];
      const hasMatch = guests.some((h) => {
        if (h.id === g.id) return false;
        if (tableOf.get(h.id) !== myTable) return false;
        return groupsOf(h).includes(groupId);
      });
      if (hasMatch) {
        const idx = Math.min(i, GROUP_WEIGHTS.length - 1);
        reward += GROUP_WEIGHTS[idx];
        break;
      }
    }
  }
  return reward;
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
    satisfiedTogether(assignment, input.constraints) * WEIGHTS.together +
    groupReward(assignment, input.guests) -
    fillSpread(assignment, input.tables) * WEIGHTS.balance
  );
}
