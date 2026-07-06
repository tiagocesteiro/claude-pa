import { describe, it, expect } from "vitest";
import { placeGreedy } from "./place";
import { tablesOverCapacity, separationViolations } from "./constraints";
import type { SeatingInput } from "./types";

it("keeps a group together when it fits", () => {
  const input: SeatingInput = {
    guests: [
      { id: "g1", name: "A", groupId: "grp1" },
      { id: "g2", name: "B", groupId: "grp1" },
      { id: "g3", name: "C", groupId: "grp1" },
    ],
    tables: [
      { id: "t1", capacity: 4, fixed: false, fixedGuestIds: [] },
      { id: "t2", capacity: 4, fixed: false, fixedGuestIds: [] },
    ],
    constraints: [],
  };
  const a = placeGreedy(input);
  expect(a.g1).toBe(a.g2);
  expect(a.g2).toBe(a.g3);
});

it("never over-fills a table", () => {
  const input: SeatingInput = {
    guests: Array.from({ length: 5 }, (_, i) => ({
      id: `g${i}`,
      name: `G${i}`,
      groupId: null,
    })),
    tables: [{ id: "t1", capacity: 3, fixed: false, fixedGuestIds: [] }, { id: "t2", capacity: 3, fixed: false, fixedGuestIds: [] }],
    constraints: [],
  };
  const a = placeGreedy(input);
  expect(tablesOverCapacity(a, input.tables).length).toBe(0);
});

it("respects fixed-table remaining capacity", () => {
  const input: SeatingInput = {
    guests: [
      { id: "g1", name: "A", groupId: null },
      { id: "g2", name: "B", groupId: null },
    ],
    tables: [{ id: "t1", capacity: 2, fixed: true, fixedGuestIds: ["gf"] }, { id: "t2", capacity: 2, fixed: false, fixedGuestIds: [] }],
    constraints: [],
  };
  const a = placeGreedy(input);
  // t1 has 1 free seat (capacity 2 - 1 fixed); both g1,g2 cannot both go to t1
  expect(tablesOverCapacity(a, input.tables).length).toBe(0);
});

it("does not create separation violations when avoidable", () => {
  const input: SeatingInput = {
    guests: [
      { id: "g1", name: "A", groupId: null },
      { id: "g2", name: "B", groupId: null },
    ],
    tables: [{ id: "t1", capacity: 4, fixed: false, fixedGuestIds: [] }, { id: "t2", capacity: 4, fixed: false, fixedGuestIds: [] }],
    constraints: [{ type: "separate", a: "g1", b: "g2" }],
  };
  const a = placeGreedy(input);
  expect(separationViolations(a, input.constraints).length).toBe(0);
});
