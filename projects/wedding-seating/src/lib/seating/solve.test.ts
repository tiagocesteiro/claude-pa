import { describe, it, expect } from "vitest";
import { solveSeating } from "./solve";
import { isHardValid } from "./constraints";
import type { SeatingInput } from "./types";

it("seats a simple wedding with all hard constraints satisfied", () => {
  const input: SeatingInput = {
    guests: [
      { id: "g1", name: "A", groupId: "fam" },
      { id: "g2", name: "B", groupId: "fam" },
      { id: "g3", name: "C", groupId: "friends" },
      { id: "g4", name: "D", groupId: "friends" },
    ],
    tables: [
      { id: "t1", capacity: 2, fixed: false, fixedGuestIds: [] },
      { id: "t2", capacity: 2, fixed: false, fixedGuestIds: [] },
    ],
    constraints: [{ type: "separate", a: "g1", b: "g3" }],
  };
  const result = solveSeating(input);
  expect(isHardValid(result.assignment, input)).toBe(true);
  expect(Object.keys(result.assignment).length).toBe(4);
});

it("warns on insufficient capacity", () => {
  const input: SeatingInput = {
    guests: [
      { id: "g1", name: "A", groupId: null },
      { id: "g2", name: "B", groupId: null },
      { id: "g3", name: "C", groupId: null },
    ],
    tables: [{ id: "t1", capacity: 2, fixed: false, fixedGuestIds: [] }],
    constraints: [],
  };
  const result = solveSeating(input);
  expect(result.warnings.some((w) => w.kind === "insufficient-capacity")).toBe(true);
});

it("warns when a together pair cannot share a table", () => {
  const input: SeatingInput = {
    guests: [
      { id: "g1", name: "A", groupId: null },
      { id: "g2", name: "B", groupId: null },
    ],
    tables: [
      { id: "t1", capacity: 1, fixed: false, fixedGuestIds: [] },
      { id: "t2", capacity: 1, fixed: false, fixedGuestIds: [] },
    ],
    constraints: [{ type: "together", a: "g1", b: "g2" }],
  };
  const result = solveSeating(input);
  expect(result.warnings.some((w) => w.kind === "together-split")).toBe(true);
});

it("respects fixed tables without moving pre-seated guests", () => {
  const input: SeatingInput = {
    guests: [{ id: "g1", name: "A", groupId: null }],
    tables: [
      { id: "head", capacity: 4, fixed: true, fixedGuestIds: ["bride", "groom"] },
      { id: "t2", capacity: 4, fixed: false, fixedGuestIds: [] },
    ],
    constraints: [],
  };
  const result = solveSeating(input);
  // pre-seated guests are not part of the solver assignment
  expect(result.assignment["bride"]).toBeUndefined();
  expect(isHardValid(result.assignment, input)).toBe(true);
});
