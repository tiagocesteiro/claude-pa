import type { Assignment, Guest, SeatingInput, SeatTable } from "./types";
import { occupantsByTable, separationViolations } from "./constraints";

interface GroupBundle {
  key: string;
  guestIds: string[];
}

function bundleGroups(guests: Guest[]): GroupBundle[] {
  const byGroup = new Map<string, string[]>();
  for (const g of guests) {
    const key = g.groupId ?? `__solo__${g.id}`;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(g.id);
  }
  return [...byGroup.entries()]
    .map(([key, guestIds]) => ({ key, guestIds }))
    .sort((a, b) =>
      b.guestIds.length - a.guestIds.length || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
    );
}

function remainingCapacity(
  table: SeatTable,
  assignment: Assignment,
  tables: SeatTable[]
): number {
  const occ = occupantsByTable(assignment, tables);
  return table.capacity - (occ[table.id]?.length ?? 0);
}

function wouldViolateSeparation(
  guestId: string,
  tableId: string,
  assignment: Assignment,
  input: SeatingInput
): boolean {
  const trial: Assignment = { ...assignment, [guestId]: tableId };
  return separationViolations(trial, input.constraints).length >
    separationViolations(assignment, input.constraints).length;
}

function placeGuest(
  guestId: string,
  assignment: Assignment,
  input: SeatingInput
): boolean {
  const candidates = [...input.tables]
    .filter((t) => remainingCapacity(t, assignment, input.tables) > 0)
    .filter((t) => !wouldViolateSeparation(guestId, t.id, assignment, input))
    .sort(
      (a, b) =>
        remainingCapacity(b, assignment, input.tables) -
          remainingCapacity(a, assignment, input.tables) ||
        (a.id < b.id ? -1 : 1)
    );
  if (candidates.length === 0) return false;
  assignment[guestId] = candidates[0].id;
  return true;
}

export function placeGreedy(input: SeatingInput): Assignment {
  const assignment: Assignment = {};
  const bundles = bundleGroups(input.guests);
  for (const bundle of bundles) {
    // Try to seat the whole bundle at one table that fits.
    const fitting = [...input.tables]
      .filter(
        (t) =>
          remainingCapacity(t, assignment, input.tables) >= bundle.guestIds.length
      )
      .filter((t) =>
        bundle.guestIds.every(
          (gid) => !wouldViolateSeparation(gid, t.id, assignment, input)
        )
      )
      .sort(
        (a, b) =>
          remainingCapacity(a, assignment, input.tables) -
            remainingCapacity(b, assignment, input.tables) ||
          (a.id < b.id ? -1 : 1)
      );
    if (fitting.length > 0) {
      for (const gid of bundle.guestIds) assignment[gid] = fitting[0].id;
      continue;
    }
    // Otherwise place guests individually (splits the group).
    for (const gid of bundle.guestIds) {
      placeGuest(gid, assignment, input);
    }
  }
  return assignment;
}
