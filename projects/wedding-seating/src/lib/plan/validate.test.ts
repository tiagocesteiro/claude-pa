import { describe, it, expect } from "vitest";
import { assignmentFromGuests, planViolations } from "./validate";

const tables = [
  { id: "t1", capacity: 2, fixed: false },
  { id: "t2", capacity: 2, fixed: false },
];

it("builds an assignment map from assigned guests only", () => {
  const a = assignmentFromGuests([
    { id: "g1", name: "A", groupId: null, assignedTableId: "t1", locked: false },
    { id: "g2", name: "B", groupId: null, assignedTableId: null, locked: false },
  ]);
  expect(a).toEqual({ g1: "t1" });
});

it("detects over-capacity and separated-together violations", () => {
  const guests = [
    { id: "g1", name: "A", groupId: null, assignedTableId: "t1", locked: false },
    { id: "g2", name: "B", groupId: null, assignedTableId: "t1", locked: false },
    { id: "g3", name: "C", groupId: null, assignedTableId: "t1", locked: false }, // 3 at cap-2 table
  ];
  const v = planViolations(guests, tables, [{ type: "separate", guestAId: "g1", guestBId: "g2" }]);
  expect(v.overCapacity).toContain("t1");
  expect(v.separated.length).toBe(1);
});

it("does not double-count guests seated at a FIXED table (no false over-capacity)", () => {
  const tables = [{ id: "head", capacity: 2, fixed: true }];
  const guests = [
    { id: "bride", name: "Noiva", groupId: null, assignedTableId: "head", locked: false },
    { id: "groom", name: "Noivo", groupId: null, assignedTableId: "head", locked: false },
  ];
  const v = planViolations(guests, tables, []);
  expect(v.overCapacity).toEqual([]); // 2 fixed occupants == capacity 2, not over
});
