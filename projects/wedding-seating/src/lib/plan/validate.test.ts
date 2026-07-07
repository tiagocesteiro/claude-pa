import { describe, it, expect } from "vitest";
import { assignmentFromGuests, planViolations } from "./validate";

const tables = [
  { id: "t1", capacity: 2, fixed: false },
  { id: "t2", capacity: 2, fixed: false },
];

it("builds an assignment map from assigned guests only", () => {
  const a = assignmentFromGuests([
    { id: "g1", name: "A", groupId: null, assignedTableId: "t1" },
    { id: "g2", name: "B", groupId: null, assignedTableId: null },
  ]);
  expect(a).toEqual({ g1: "t1" });
});

it("detects over-capacity and separated-together violations", () => {
  const guests = [
    { id: "g1", name: "A", groupId: null, assignedTableId: "t1" },
    { id: "g2", name: "B", groupId: null, assignedTableId: "t1" },
    { id: "g3", name: "C", groupId: null, assignedTableId: "t1" }, // 3 at cap-2 table
  ];
  const v = planViolations(guests, tables, [{ type: "separate", guestAId: "g1", guestBId: "g2" }]);
  expect(v.overCapacity).toContain("t1");
  expect(v.separated.length).toBe(1);
});
