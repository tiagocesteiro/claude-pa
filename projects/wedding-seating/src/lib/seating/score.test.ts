import { describe, it, expect } from "vitest";
import { groupReward, GROUP_WEIGHTS, satisfiedTogether, fillSpread, scoreAssignment, WEIGHTS } from "./score";
import type { Guest, SeatTable, SeatingInput } from "./types";

const guests: Guest[] = [
  { id: "g1", name: "A", groupId: "grp1" },
  { id: "g2", name: "B", groupId: "grp1" },
  { id: "g3", name: "C", groupId: "grp1" },
];

it("groupReward rewards seating a guest with a same-group member", () => {
  const guests = [
    { id: "g1", name: "A", groupId: "fam" },
    { id: "g2", name: "B", groupId: "fam" },
  ];
  // both at t1 → each earns primary weight
  expect(groupReward({ g1: "t1", g2: "t1" }, guests)).toBe(GROUP_WEIGHTS[0] * 2);
  // split → neither has a same-group tablemate → 0
  expect(groupReward({ g1: "t1", g2: "t2" }, guests)).toBe(0);
});

it("groupReward honors priority order via groupIds", () => {
  // g1's primary is "fam" (with nobody), secondary "fac" (with g2)
  const guests = [
    { id: "g1", name: "A", groupId: "fam", groupIds: ["fam", "fac"] },
    { id: "g2", name: "B", groupId: "fac", groupIds: ["fac"] },
  ];
  // both at t1: g1 shares "fac" with g2 → secondary weight; g2 shares "fac" with g1 → primary weight
  expect(groupReward({ g1: "t1", g2: "t1" }, guests)).toBe(GROUP_WEIGHTS[1] + GROUP_WEIGHTS[0]);
});

it("satisfiedTogether counts pairs sharing a table", () => {
  const n = satisfiedTogether({ g1: "t1", g2: "t1" }, [{ type: "together", a: "g1", b: "g2" }]);
  expect(n).toBe(1);
});

it("scoreAssignment rewards togetherness and group reward, penalises fill imbalance", () => {
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
  // together: 1*100 + groupReward(all 3 share grp1, each earns GROUP_WEIGHTS[0]=10 -> 30) - fillSpread(0)*1 = 130
  // split: 1*100 + groupReward(g1,g2 share table & grp1 -> each 10 = 20; g3 alone -> 0) - fillSpread(2-1=1)*1 = 119
  expect(together).toBe(130);
  expect(split).toBe(119);
  expect(WEIGHTS.together).toBe(100);
});
