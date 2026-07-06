import { describe, it, expect } from "vitest";
import { groupSpread, satisfiedTogether, fillSpread, scoreAssignment, WEIGHTS } from "./score";
import type { Guest, SeatTable, SeatingInput } from "./types";

const guests: Guest[] = [
  { id: "g1", name: "A", groupId: "grp1" },
  { id: "g2", name: "B", groupId: "grp1" },
  { id: "g3", name: "C", groupId: "grp1" },
];

it("groupSpread is 0 when a group is fully together", () => {
  expect(groupSpread({ g1: "t1", g2: "t1", g3: "t1" }, guests)).toBe(0);
});

it("groupSpread counts extra tables a group spans", () => {
  // grp1 spans t1 and t2 -> distinctTables 2 -> spread 1
  expect(groupSpread({ g1: "t1", g2: "t1", g3: "t2" }, guests)).toBe(1);
});

it("satisfiedTogether counts pairs sharing a table", () => {
  const n = satisfiedTogether({ g1: "t1", g2: "t1" }, [{ type: "together", a: "g1", b: "g2" }]);
  expect(n).toBe(1);
});

it("scoreAssignment rewards togetherness and penalises spread", () => {
  const input: SeatingInput = {
    guests,
    tables: [
      { id: "t1", capacity: 8, fixed: false, fixedGuestIds: [] },
      { id: "t2", capacity: 8, fixed: false, fixedGuestIds: [] },
    ],
    constraints: [{ type: "together", a: "g1", b: "g2" }],
  };
  const together = scoreAssignment({ g1: "t1", g2: "t1", g3: "t1" }, input);
  const split = scoreAssignment({ g1: "t1", g2: "t1", g3: "t2" }, input);
  expect(together).toBeGreaterThan(split);
  // together: 1*100 - 0 - 0 = 100 ; split: 1*100 - 1*10 - fillSpread(2-1=1)*1 = 89
  expect(together).toBe(100);
  expect(split).toBe(89);
  expect(WEIGHTS.together).toBe(100);
});
