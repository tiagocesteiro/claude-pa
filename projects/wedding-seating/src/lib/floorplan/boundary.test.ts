import { describe, it, expect } from "vitest";
import { pointInPolygon, outOfBoundsTables } from "./boundary";

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

it("point-in-polygon for a square", () => {
  expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
  expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
});

it("no boundary (<3 pts) treats everything as inside", () => {
  expect(pointInPolygon({ x: 999, y: 999 }, [])).toBe(true);
  expect(outOfBoundsTables([{ id: "t1", x: 999, y: 999 }], [])).toEqual([]);
});

it("flags tables outside the polygon", () => {
  const tables = [
    { id: "in", x: 5, y: 5 },
    { id: "out", x: 20, y: 20 },
  ];
  expect(outOfBoundsTables(tables, square)).toEqual(["out"]);
});
