import { describe, it, expect } from "vitest";
import {
  tablesOverCapacity,
  separationViolations,
  isHardValid,
  occupantsByTable,
} from "./constraints";
import type { SeatingInput, SeatTable, SeatingConstraint, Assignment } from "./types";

const tables: SeatTable[] = [
  { id: "t1", capacity: 2, fixed: false, fixedGuestIds: [] },
  { id: "t2", capacity: 2, fixed: true, fixedGuestIds: ["gf"] },
];

it("counts fixed guests toward occupancy", () => {
  const occ = occupantsByTable({ g1: "t2" }, tables);
  expect(occ.t2.sort()).toEqual(["g1", "gf"]);
});

it("flags tables over capacity including fixed guests", () => {
  // t2 has fixed gf + placed g1 + g2 = 3 > capacity 2
  const over = tablesOverCapacity({ g1: "t2", g2: "t2" }, tables);
  expect(over.map((t) => t.id)).toEqual(["t2"]);
});

it("detects separation violations", () => {
  const constraints: SeatingConstraint[] = [{ type: "separate", a: "g1", b: "g2" }];
  const viol = separationViolations({ g1: "t1", g2: "t1" }, constraints);
  expect(viol.length).toBe(1);
});

it("ignores separated guests at different tables", () => {
  const constraints: SeatingConstraint[] = [{ type: "separate", a: "g1", b: "g2" }];
  const viol = separationViolations({ g1: "t1", g2: "t2" }, constraints);
  expect(viol.length).toBe(0);
});

it("isHardValid is false when a separation is violated", () => {
  const input: SeatingInput = {
    guests: [],
    tables,
    constraints: [{ type: "separate", a: "g1", b: "g2" }],
  };
  const assignment: Assignment = { g1: "t1", g2: "t1" };
  expect(isHardValid(assignment, input)).toBe(false);
});
