import { describe, it, expect } from "vitest";
import { spacingHalfExtents, boxesOverlap, resolveNoOverlap, type SpacingBox } from "./spacingGeom";

/** Builds a SpacingBox from a resolved {x,y} centre + half-extents, for asserting
 * post-resolution non-overlap in tests below. */
function asBox(centre: { x: number; y: number }, half: { halfW: number; halfH: number }): SpacingBox {
  return { cx: centre.x, cy: centre.y, halfW: half.halfW, halfH: half.halfH };
}

describe("spacingHalfExtents", () => {
  it("adds half of minSpacing (metres) as margin on every side, in natural pixels", () => {
    // round table, diameter 2m, scale 50px/m -> render diameter 100px, half 50px.
    // minSpacing 1m * scale 50 / 2 = 25px margin.
    const half = spacingHalfExtents({ shape: "round", width: 2, depth: 2, capacity: 8 }, 50, 1);
    expect(half).toEqual({ halfW: 75, halfH: 75 });
  });

  it("handles rect tables with independent width/depth margins", () => {
    // rect 2.4m x 1.0m at scale 50 -> render 120x50, half 60x25; +25px margin each side (1m spacing).
    const half = spacingHalfExtents({ shape: "rect", width: 2.4, depth: 1.0, capacity: 6 }, 50, 1);
    expect(half).toEqual({ halfW: 85, halfH: 50 });
  });

  it("treats margin as 0 when scale <= 0 (no meaningful px/metre conversion)", () => {
    const withoutSpacing = spacingHalfExtents({ shape: "round", capacity: 8 }, 0, 0);
    const withSpacing = spacingHalfExtents({ shape: "round", capacity: 8 }, 0, 2);
    expect(withSpacing).toEqual(withoutSpacing);
  });

  it("returns zero margin when minSpacingMetres is 0", () => {
    const half = spacingHalfExtents({ shape: "round", width: 1.5, depth: 1.5, capacity: 8 }, 50, 0);
    expect(half).toEqual({ halfW: 37.5, halfH: 37.5 });
  });
});

describe("boxesOverlap", () => {
  it("returns true when boxes overlap on both axes", () => {
    const a: SpacingBox = { cx: 0, cy: 0, halfW: 10, halfH: 10 };
    const b: SpacingBox = { cx: 15, cy: 0, halfW: 10, halfH: 10 };
    expect(boxesOverlap(a, b)).toBe(true);
  });

  it("returns false when boxes are merely touching (edge-to-edge, not overlapping)", () => {
    const a: SpacingBox = { cx: 0, cy: 0, halfW: 10, halfH: 10 };
    const b: SpacingBox = { cx: 20, cy: 0, halfW: 10, halfH: 10 }; // exactly touching at x=10
    expect(boxesOverlap(a, b)).toBe(false);
  });

  it("returns false when boxes are clearly separated", () => {
    const a: SpacingBox = { cx: 0, cy: 0, halfW: 10, halfH: 10 };
    const b: SpacingBox = { cx: 100, cy: 100, halfW: 10, halfH: 10 };
    expect(boxesOverlap(a, b)).toBe(false);
  });
});

describe("resolveNoOverlap", () => {
  it("pushes a desired point that's inside a neighbour's box to just-touching outside the nearest edge", () => {
    const desired = { x: 5, y: 3 };
    const self = { halfW: 10, halfH: 10 };
    const other: SpacingBox = { id: "other", cx: 0, cy: 0, halfW: 20, halfH: 20 };
    const resolved = resolveNoOverlap(desired, self, [other]);
    // penX (25) < penY (27) at the desired point, so it resolves along X only.
    expect(resolved).toEqual({ x: 30, y: 3 });
    expect(boxesOverlap(asBox(resolved, self), other)).toBe(false);
  });

  it("returns the desired position unchanged when there is no overlap", () => {
    const desired = { x: 0, y: 0 };
    const self = { halfW: 10, halfH: 10 };
    const other: SpacingBox = { id: "other", cx: 100, cy: 100, halfW: 10, halfH: 10 };
    const resolved = resolveNoOverlap(desired, self, [other]);
    expect(resolved).toEqual({ x: 0, y: 0 });
  });

  it("resolves a point boxed into a corner by two neighbours to a position outside both", () => {
    const self = { halfW: 10, halfH: 10 };
    const right: SpacingBox = { id: "right", cx: 20, cy: 0, halfW: 15, halfH: 15 };
    const below: SpacingBox = { id: "below", cx: 0, cy: 20, halfW: 15, halfH: 15 };
    const desired = { x: 10, y: 10 };
    const resolved = resolveNoOverlap(desired, self, [right, below]);
    expect(resolved).toEqual({ x: 25, y: 25 });
    const selfBox = asBox(resolved, self);
    expect(boxesOverlap(selfBox, right)).toBe(false);
    expect(boxesOverlap(selfBox, below)).toBe(false);
  });

  it("resolves rect-vs-rect boxes the same way as round-approximated-as-box", () => {
    // Rect table's spacing box behaves identically to any other axis-aligned box —
    // resolveNoOverlap doesn't know or care about shape, only halfW/halfH.
    const self = { halfW: 60, halfH: 25 }; // e.g. a 2.4m x 1m rect table, scale 50, no margin
    const other: SpacingBox = { id: "neighbour", cx: 50, cy: 0, halfW: 60, halfH: 25 };
    const desired = { x: 0, y: 0 };
    const resolved = resolveNoOverlap(desired, self, [other]);
    // dy=0 so penY (the y-penetration) is smaller than penX here -> resolves along Y,
    // leaving X untouched — same minimum-translation rule as any other box pair.
    expect(resolved.x).toBe(0);
    expect(resolved.y).not.toBe(0);
    const selfBox = asBox(resolved, self);
    expect(boxesOverlap(selfBox, other)).toBe(false);
  });

  it("leaves two boxes that are already exactly touching unmoved (touching is allowed)", () => {
    const self = { halfW: 10, halfH: 10 };
    const other: SpacingBox = { id: "other", cx: 20, cy: 0, halfW: 10, halfH: 10 }; // touches at x=10
    const desired = { x: 0, y: 0 };
    const resolved = resolveNoOverlap(desired, self, [other]);
    expect(resolved).toEqual({ x: 0, y: 0 });
  });

  it("is a no-op with no other boxes", () => {
    const resolved = resolveNoOverlap({ x: 42, y: 7 }, { halfW: 10, halfH: 10 }, []);
    expect(resolved).toEqual({ x: 42, y: 7 });
  });
});
