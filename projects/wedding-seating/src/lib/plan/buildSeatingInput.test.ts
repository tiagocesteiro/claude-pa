import { describe, it, expect } from "vitest";
import { buildSeatingInput } from "./buildSeatingInput";

it("maps guests, tables and constraints to SeatingInput", () => {
  const input = buildSeatingInput(
    [
      { id: "g1", name: "Ana", groupId: "fam", assignedTableId: null, locked: false },
      { id: "g2", name: "Bruno", groupId: "fam", assignedTableId: null, locked: false },
    ],
    [{ id: "t1", capacity: 8, fixed: false }],
    [{ type: "separate", guestAId: "g1", guestBId: "g2" }]
  );
  expect(input.guests).toEqual([
    { id: "g1", name: "Ana", groupId: "fam" },
    { id: "g2", name: "Bruno", groupId: "fam" },
  ]);
  expect(input.tables).toEqual([{ id: "t1", capacity: 8, fixed: false, fixedGuestIds: [] }]);
  expect(input.constraints).toEqual([{ type: "separate", a: "g1", b: "g2" }]);
});

it("treats guests at a FIXED table as fixed occupants and removes them from the movable pool", () => {
  const input = buildSeatingInput(
    [
      { id: "bride", name: "Noiva", groupId: null, assignedTableId: "head", locked: false },
      { id: "groom", name: "Noivo", groupId: null, assignedTableId: "head", locked: false },
      { id: "g1", name: "Ana", groupId: null, assignedTableId: null, locked: false },
    ],
    [
      { id: "head", capacity: 4, fixed: true },
      { id: "t1", capacity: 8, fixed: false },
    ],
    []
  );
  const head = input.tables.find((t) => t.id === "head")!;
  expect(head.fixedGuestIds.sort()).toEqual(["bride", "groom"]);
  // fixed occupants are NOT in the movable pool
  expect(input.guests.map((g) => g.id)).toEqual(["g1"]);
});

it("a fixed table with no occupants exposes empty fixedGuestIds and keeps all guests movable", () => {
  const input = buildSeatingInput(
    [{ id: "g1", name: "Ana", groupId: null, assignedTableId: null, locked: false }],
    [{ id: "head", capacity: 4, fixed: true }],
    []
  );
  expect(input.tables[0].fixedGuestIds).toEqual([]);
  expect(input.guests.map((g) => g.id)).toEqual(["g1"]);
});

it("treats a LOCKED guest at a non-fixed table as a fixed occupant", () => {
  const input = buildSeatingInput(
    [
      { id: "g1", name: "A", groupId: null, assignedTableId: "t1", locked: true },
      { id: "g2", name: "B", groupId: null, assignedTableId: null, locked: false },
    ],
    [{ id: "t1", capacity: 8, fixed: false }],
    []
  );
  expect(input.tables[0].fixedGuestIds).toEqual(["g1"]);
  expect(input.guests.map((g) => g.id)).toEqual(["g2"]); // g1 pinned, not movable
});
