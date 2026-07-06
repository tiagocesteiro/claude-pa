import { describe, it, expect } from "vitest";
import type { SeatingInput, SeatingResult } from "./types";

describe("types", () => {
  it("accepts a well-formed SeatingInput and SeatingResult", () => {
    const input: SeatingInput = {
      guests: [{ id: "g1", name: "Ana", groupId: "grp1" }],
      tables: [{ id: "t1", capacity: 8, fixed: false, fixedGuestIds: [] }],
      constraints: [{ type: "separate", a: "g1", b: "g2" }],
    };
    const result: SeatingResult = { assignment: { g1: "t1" }, score: 0, warnings: [] };
    expect(input.guests.length).toBe(1);
    expect(result.assignment.g1).toBe("t1");
  });
});
