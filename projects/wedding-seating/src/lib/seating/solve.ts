import type { Assignment, SeatingInput, SeatingResult, Warning } from "./types";
import { placeGreedy } from "./place";
import { refine } from "./refine";
import { scoreAssignment } from "./score";
import { separationViolations } from "./constraints";

function totalRemainingCapacity(input: SeatingInput): number {
  return input.tables.reduce(
    (sum, t) => sum + (t.capacity - t.fixedGuestIds.length),
    0
  );
}

function collectWarnings(assignment: Assignment, input: SeatingInput): Warning[] {
  const warnings: Warning[] = [];

  const placed = Object.keys(assignment).length;
  const unseated = input.guests.length - placed;
  if (unseated > 0) {
    const remaining = totalRemainingCapacity(input);
    const reason =
      input.guests.length > remaining
        ? `only ${remaining} free place(s) for ${input.guests.length} guests`
        : `remaining guest(s) could not be seated without violating a constraint`;
    warnings.push({
      kind: "insufficient-capacity",
      message: `${unseated} guest(s) unseated: ${reason}.`,
    });
  }

  for (const c of separationViolations(assignment, input.constraints)) {
    warnings.push({
      kind: "separate-unsatisfiable",
      message: `Could not separate ${c.a} and ${c.b}; they share a table.`,
    });
  }

  for (const c of input.constraints) {
    if (c.type !== "together") continue;
    if (
      assignment[c.a] === undefined ||
      assignment[c.b] === undefined ||
      assignment[c.a] !== assignment[c.b]
    ) {
      warnings.push({
        kind: "together-split",
        message: `Wanted ${c.a} and ${c.b} together, but they are apart.`,
      });
    }
  }

  const tablesByGroup = new Map<string, Set<string>>();
  for (const g of input.guests) {
    if (g.groupId == null) continue;
    const tid = assignment[g.id];
    if (tid === undefined) continue;
    if (!tablesByGroup.has(g.groupId)) tablesByGroup.set(g.groupId, new Set());
    tablesByGroup.get(g.groupId)!.add(tid);
  }
  for (const [groupId, set] of tablesByGroup) {
    if (set.size > 1) {
      warnings.push({
        kind: "group-split",
        message: `Group ${groupId} is split across ${set.size} tables.`,
      });
    }
  }

  return warnings;
}

export function solveSeating(input: SeatingInput): SeatingResult {
  const initial = placeGreedy(input);
  const assignment = refine(initial, input);
  return {
    assignment,
    score: scoreAssignment(assignment, input),
    warnings: collectWarnings(assignment, input),
  };
}
