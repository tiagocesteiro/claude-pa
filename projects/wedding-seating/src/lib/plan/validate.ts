import type { Assignment } from "@/lib/seating";
import { tablesOverCapacity, separationViolations } from "@/lib/seating";
import { buildSeatingInput, type GuestRowInput, type TableRowInput, type ConstraintRowInput } from "./buildSeatingInput";

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
  const assignment = assignmentFromGuests(guests);
  return {
    overCapacity: tablesOverCapacity(assignment, input.tables).map((t) => t.id),
    separated: separationViolations(assignment, input.constraints, input.tables).map((c) => ({
      a: c.a,
      b: c.b,
    })),
  };
}
