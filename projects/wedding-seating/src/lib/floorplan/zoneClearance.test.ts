import { describe, it, expect } from "vitest";
import { pointSegmentDistance, resolveInsideZone } from "./zoneClearance";

describe("pointSegmentDistance", () => {
  it("returns perpendicular distance when the projection falls within the segment", () => {
    expect(pointSegmentDistance({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
  });

  it("returns distance to the nearest endpoint when the projection falls beyond the segment", () => {
    // Projection of (-3, 4) onto the infinite line y=0 is (-3, 0), before the
    // segment's start (0,0) — nearest point is the endpoint itself.
    expect(pointSegmentDistance({ x: -3, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
  });

  it("returns 0 for a point exactly on the segment", () => {
    expect(pointSegmentDistance({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(0);
  });

  it("falls back to point-to-point distance for a degenerate (zero-length) segment", () => {
    expect(pointSegmentDistance({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(5);
  });
});

describe("resolveInsideZone", () => {
  const rect = [
    { x: 0, y: 0 },
    { x: 400, y: 0 },
    { x: 400, y: 300 },
    { x: 0, y: 300 },
  ];

  it("pushes a centre near a wall inward to exactly `clearance` off that wall", () => {
    const result = resolveInsideZone({ x: 5, y: 150 }, 30, [rect]);
    expect(result.ok).toBe(true);
    expect(result.x).toBeCloseTo(30, 5);
    expect(result.y).toBeCloseTo(150, 5);
  });

  it("leaves a centre comfortably inside (beyond clearance of every wall) unchanged", () => {
    const result = resolveInsideZone({ x: 200, y: 150 }, 30, [rect]);
    expect(result.ok).toBe(true);
    expect(result.x).toBeCloseTo(200, 5);
    expect(result.y).toBeCloseTo(150, 5);
  });

  it("returns ok:false and the centre unchanged when it falls outside every zone", () => {
    const result = resolveInsideZone({ x: 500, y: 500 }, 30, [rect]);
    expect(result).toEqual({ x: 500, y: 500, ok: false });
  });

  it("pushes a corner-adjacent centre off both walls it's close to", () => {
    const result = resolveInsideZone({ x: 5, y: 5 }, 30, [rect]);
    expect(result.ok).toBe(true);
    expect(result.x).toBeCloseTo(30, 5);
    expect(result.y).toBeCloseTo(30, 5);
  });

  it("ignores zones that are still being drawn (< 3 points)", () => {
    const result = resolveInsideZone({ x: 200, y: 150 }, 30, [[{ x: 0, y: 0 }]]);
    expect(result.ok).toBe(false);
  });

  it("picks the zone that actually contains the centre when multiple zones are given", () => {
    const other = [
      { x: 1000, y: 1000 },
      { x: 1400, y: 1000 },
      { x: 1400, y: 1300 },
      { x: 1000, y: 1300 },
    ];
    const result = resolveInsideZone({ x: 5, y: 150 }, 30, [other, rect]);
    expect(result.ok).toBe(true);
    expect(result.x).toBeCloseTo(30, 5);
    expect(result.y).toBeCloseTo(150, 5);
  });

  it("is a no-op when clearance is 0", () => {
    const result = resolveInsideZone({ x: 1, y: 1 }, 0, [rect]);
    expect(result).toEqual({ x: 1, y: 1, ok: true });
  });
});
