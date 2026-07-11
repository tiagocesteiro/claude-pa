import { it, expect } from "vitest";
import { autoGridPositions } from "./autoLayout";

it("returns exactly `count` points, row-major, 4 cols for 10, first row at originY, stepping by cellPx", () => {
  const points = autoGridPositions(10, { originX: 100, originY: 100, cellPx: 120 });
  expect(points.length).toBe(10);
  // cols defaults to ceil(sqrt(10)) = 4
  expect(points[0]).toEqual({ x: 100, y: 100 });
  expect(points[1]).toEqual({ x: 220, y: 100 });
  expect(points[2]).toEqual({ x: 340, y: 100 });
  expect(points[3]).toEqual({ x: 460, y: 100 });
  // 5th point starts row 2
  expect(points[4]).toEqual({ x: 100, y: 220 });
  // first row all at originY
  expect(points.slice(0, 4).every((p) => p.y === 100)).toBe(true);
});

it("is deterministic across calls", () => {
  const a = autoGridPositions(7, { originX: 0, originY: 0, cellPx: 50 });
  const b = autoGridPositions(7, { originX: 0, originY: 0, cellPx: 50 });
  expect(a).toEqual(b);
});

it("respects an explicit cols override", () => {
  const points = autoGridPositions(6, { originX: 0, originY: 0, cellPx: 10, cols: 2 });
  expect(points.length).toBe(6);
  expect(points[0]).toEqual({ x: 0, y: 0 });
  expect(points[1]).toEqual({ x: 10, y: 0 });
  expect(points[2]).toEqual({ x: 0, y: 10 }); // wraps after 2 cols
});

it("returns an empty array for count 0", () => {
  expect(autoGridPositions(0, { originX: 0, originY: 0, cellPx: 100 })).toEqual([]);
});
