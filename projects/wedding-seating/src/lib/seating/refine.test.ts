import { describe, it, expect } from "vitest";
import { refine } from "./refine";
import { scoreAssignment } from "./score";
import { isHardValid } from "./constraints";
import type { SeatingInput, Assignment } from "./types";

const input: SeatingInput = {
  guests: [
    { id: "g1", name: "A", groupId: "grp1" },
    { id: "g2", name: "B", groupId: "grp1" },
  ],
  tables: [
    { id: "t1", capacity: 4, fixed: false, fixedGuestIds: [] },
    { id: "t2", capacity: 4, fixed: false, fixedGuestIds: [] },
  ],
  constraints: [],
};

it("improves a deliberately split group by moving one guest", () => {
  const start: Assignment = { g1: "t1", g2: "t2" }; // group split
  const before = scoreAssignment(start, input);
  const after = refine(start, input);
  expect(scoreAssignment(after, input)).toBeGreaterThan(before);
  expect(after.g1).toBe(after.g2); // now together
});

it("never breaks hard validity", () => {
  const start: Assignment = { g1: "t1", g2: "t2" };
  const out = refine(start, input);
  expect(isHardValid(out, input)).toBe(true);
});

it("leaves an already-optimal assignment unchanged in score", () => {
  const start: Assignment = { g1: "t1", g2: "t1" };
  const before = scoreAssignment(start, input);
  const out = refine(start, input);
  expect(scoreAssignment(out, input)).toBe(before);
});

it("does not mutate the input assignment object", () => {
  const start: Assignment = { g1: "t1", g2: "t2" };
  refine(start, input);
  expect(start).toEqual({ g1: "t1", g2: "t2" });
});
