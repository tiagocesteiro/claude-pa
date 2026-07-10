import { describe, it, expect } from "vitest";
import { chairPositions } from "./chairs";

it("returns capacity chairs around a round table", () => {
  const pts = chairPositions({ x: 100, y: 100, capacity: 8, shape: "round", width: 1.5, depth: 1.5 }, 50);
  expect(pts).toHaveLength(8);
});

it("keeps round-table chairs within a bounding box around the center", () => {
  const pts = chairPositions({ x: 100, y: 100, capacity: 8, shape: "round", width: 1.5, depth: 1.5 }, 50);
  for (const p of pts) {
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(200);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeLessThanOrEqual(200);
  }
});

it("returns capacity chairs around a rect table, within a bounding box", () => {
  const pts = chairPositions(
    { x: 200, y: 150, capacity: 6, shape: "rect", width: 2, depth: 1 },
    50
  );
  expect(pts).toHaveLength(6);
  for (const p of pts) {
    expect(p.x).toBeGreaterThanOrEqual(100);
    expect(p.x).toBeLessThanOrEqual(300);
    expect(p.y).toBeGreaterThanOrEqual(50);
    expect(p.y).toBeLessThanOrEqual(250);
  }
});

it("falls back to a sensible default radius/size when width/depth are absent", () => {
  const round = chairPositions({ x: 0, y: 0, capacity: 4, shape: "round" }, 50);
  expect(round).toHaveLength(4);
  const rect = chairPositions({ x: 0, y: 0, capacity: 4, shape: "rect" }, 50);
  expect(rect).toHaveLength(4);
});

it("is deterministic — same input yields the same output", () => {
  const table = { x: 100, y: 100, capacity: 8, shape: "round", width: 1.5, depth: 1.5 };
  const a = chairPositions(table, 50);
  const b = chairPositions(table, 50);
  expect(a).toEqual(b);
});

it("returns an empty array for zero capacity", () => {
  expect(chairPositions({ x: 0, y: 0, capacity: 0, shape: "round" }, 50)).toEqual([]);
});

it("distributes chairs evenly around the round table's perimeter (roughly equal spacing)", () => {
  const pts = chairPositions({ x: 0, y: 0, capacity: 4, shape: "round", width: 2, depth: 2 }, 50);
  // 4 chairs evenly spaced on a ring centered at origin should pair up as opposites.
  expect(pts[0].x).toBeCloseTo(-pts[2].x, 5);
  expect(pts[0].y).toBeCloseTo(-pts[2].y, 5);
  expect(pts[1].x).toBeCloseTo(-pts[3].x, 5);
  expect(pts[1].y).toBeCloseTo(-pts[3].y, 5);
});
