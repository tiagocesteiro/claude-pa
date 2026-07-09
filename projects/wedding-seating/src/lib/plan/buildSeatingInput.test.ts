import { describe, it, expect } from "vitest";
import { buildSeatingInput } from "./buildSeatingInput";

it("maps guests, tables and constraints to SeatingInput", () => {
  const input = buildSeatingInput(
    [
      { id: "g1", name: "Ana", groupId: "fam", assignedTableId: null, locked: false, extraGroups: null },
      { id: "g2", name: "Bruno", groupId: "fam", assignedTableId: null, locked: false, extraGroups: null },
    ],
    [{ id: "t1", capacity: 8, fixed: false }],
    [{ type: "separate", guestAId: "g1", guestBId: "g2" }]
  );
  expect(input.guests).toEqual([
    { id: "g1", name: "Ana", groupId: "fam", groupIds: ["fam"] },
    { id: "g2", name: "Bruno", groupId: "fam", groupIds: ["fam"] },
  ]);
  expect(input.tables).toEqual([{ id: "t1", capacity: 8, fixed: false, fixedGuestIds: [] }]);
  expect(input.constraints).toEqual([{ type: "separate", a: "g1", b: "g2" }]);
});

it("treats guests at a FIXED table as fixed occupants and removes them from the movable pool", () => {
  const input = buildSeatingInput(
    [
      { id: "bride", name: "Noiva", groupId: null, assignedTableId: "head", locked: false, extraGroups: null },
      { id: "groom", name: "Noivo", groupId: null, assignedTableId: "head", locked: false, extraGroups: null },
      { id: "g1", name: "Ana", groupId: null, assignedTableId: null, locked: false, extraGroups: null },
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
    [{ id: "g1", name: "Ana", groupId: null, assignedTableId: null, locked: false, extraGroups: null }],
    [{ id: "head", capacity: 4, fixed: true }],
    []
  );
  expect(input.tables[0].fixedGuestIds).toEqual([]);
  expect(input.guests.map((g) => g.id)).toEqual(["g1"]);
});

it("treats a LOCKED guest at a non-fixed table as a fixed occupant", () => {
  const input = buildSeatingInput(
    [
      { id: "g1", name: "A", groupId: null, assignedTableId: "t1", locked: true, extraGroups: null },
      { id: "g2", name: "B", groupId: null, assignedTableId: null, locked: false, extraGroups: null },
    ],
    [{ id: "t1", capacity: 8, fixed: false }],
    []
  );
  expect(input.tables[0].fixedGuestIds).toEqual(["g1"]);
  expect(input.guests.map((g) => g.id)).toEqual(["g2"]); // g1 pinned, not movable
});

it("builds ordered groupIds from primary + extraGroups JSON", () => {
  const input = buildSeatingInput(
    [{ id: "g1", name: "A", groupId: "fam", assignedTableId: null, locked: false, extraGroups: JSON.stringify(["fac", "trab"]) }],
    [],
    []
  );
  expect(input.guests[0].groupIds).toEqual(["fam", "fac", "trab"]);
});

it("groupIds is [groupId] when extraGroups is null", () => {
  const input = buildSeatingInput(
    [{ id: "g1", name: "A", groupId: "fam", assignedTableId: null, locked: false, extraGroups: null }],
    [],
    []
  );
  expect(input.guests[0].groupIds).toEqual(["fam"]);
});

it("dedupes groupIds first-seen order when extraGroups repeats the primary or itself", () => {
  const input = buildSeatingInput(
    [{ id: "g1", name: "A", groupId: "fam", assignedTableId: null, locked: false, extraGroups: JSON.stringify(["fam", "fac", "fac"]) }],
    [],
    []
  );
  expect(input.guests[0].groupIds).toEqual(["fam", "fac"]);
});

it("groupIds is [] when groupId is null and extraGroups is null", () => {
  const input = buildSeatingInput(
    [{ id: "g1", name: "A", groupId: null, assignedTableId: null, locked: false, extraGroups: null }],
    [],
    []
  );
  expect(input.guests[0].groupIds).toEqual([]);
});
