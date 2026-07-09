export interface Guest {
  id: string;
  name: string;
  groupId: string | null;
  /** Ordered by priority (index 0 = primary). Overrides groupId for scoring when present. */
  groupIds?: string[];
}

export interface SeatTable {
  id: string;
  capacity: number;
  fixed: boolean;
  fixedGuestIds: string[];
}

export type ConstraintType = "together" | "separate";

export interface SeatingConstraint {
  type: ConstraintType;
  a: string; // guest id
  b: string; // guest id
}

export interface SeatingInput {
  guests: Guest[];
  tables: SeatTable[];
  constraints: SeatingConstraint[];
}

export type Assignment = Record<string, string>; // guestId -> tableId

export type WarningKind =
  | "group-split"
  | "together-split"
  | "separate-unsatisfiable"
  | "insufficient-capacity";

export interface Warning {
  kind: WarningKind;
  message: string;
  groupId?: string;
  guestIds?: [string, string];
}

export interface SeatingResult {
  assignment: Assignment;
  score: number;
  warnings: Warning[];
}
