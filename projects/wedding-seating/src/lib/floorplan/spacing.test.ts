import { describe, it, expect } from "vitest";
import { spacingViolations, underMinTables } from "./spacing";

it("flags tables closer than the minimum spacing", () => {
  // two 1m-wide tables (halfExtent .5m each), centers 200px apart at 100px/m = 2m; gap = 2 - .5 - .5 = 1m
  const tables = [
    { id: "t1", x: 0, y: 0, width: 1, depth: 1, shape: "round", capacity: 8 },
    { id: "t2", x: 200, y: 0, width: 1, depth: 1, shape: "round", capacity: 8 },
  ];
  expect(spacingViolations(tables, 1.5, 100).length).toBe(1); // gap 1m < 1.5m
  expect(spacingViolations(tables, 0.5, 100).length).toBe(0); // gap 1m ≥ .5m
});

it("flags used tables below their min capacity", () => {
  const under = underMinTables({ t1: 3, t2: 8 }, [{ id: "t1", minCapacity: 6 }, { id: "t2", minCapacity: 6 }]);
  expect(under).toEqual(["t1"]);
});
