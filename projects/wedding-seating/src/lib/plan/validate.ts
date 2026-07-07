import type { Assignment } from "@/lib/seating";
import { tablesOverCapacity, separationViolations } from "@/lib/seating";
import { buildSeatingInput, type GuestRowInput, type TableRowInput, type ConstraintRowInput } from "./buildSeatingInput";

// Includes every assigned guest (fixed-table occupants included). Display helper only —
// do NOT use this for capacity/violation checks, since fixed-table occupants are already
// represented via `fixedGuestIds` in buildSeatingInput's engine tables.
export function assignmentFromGuests(guests: GuestRowInput[]): Assignment {
  const a: Assignment = {};
  for (const g of guests) {
    if (g.assignedTableId) a[g.id] = g.assignedTableId;
  }
  return a;
}

export interface PlanViolations {
  overCapacity: string[];
  separated: { a: string; b: string }[];
}

export function planViolations(
  guests: GuestRowInput[],
  tables: TableRowInput[],
  constraints: ConstraintRowInput[]
): PlanViolations {
  const input = buildSeatingInput(guests, tables, constraints);
  // Build the assignment map from MOVABLE guests only. Guests seated at a fixed table (or
  // LOCKED to their current table) are already counted via `fixedGuestIds` on the engine
  // table (see buildSeatingInput), so including them here too would double-count them
  // against capacity.
  const fixedTableIds = new Set(tables.filter((t) => t.fixed).map((t) => t.id));
  const assignment: Assignment = {};
  for (const g of guests) {
    if (g.assignedTableId && !(fixedTableIds.has(g.assignedTableId) || g.locked)) {
      assignment[g.id] = g.assignedTableId;
    }
  }
  return {
    overCapacity: tablesOverCapacity(assignment, input.tables).map((t) => t.id),
    separated: separationViolations(assignment, input.constraints, input.tables).map((c) => ({
      a: c.a,
      b: c.b,
    })),
  };
}
