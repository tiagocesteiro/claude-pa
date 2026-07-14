import { describe, it, expect } from "vitest";
import { computeSnap } from "./snap";

describe("computeSnap", () => {
  it("snaps x to another table's centre-x when within threshold", () => {
    const dragged = { x: 105, y: 50 };
    const others = [{ x: 100, y: 400 }];
    const result = computeSnap(dragged, others, 8);
    expect(result.x).toBe(100);
    expect(result.y).toBe(50); // y untouched — no y-alignment nearby
    expect(result.guides).toEqual({ vertical: 100 });
  });

  it("snaps y to another table's centre-y when within threshold", () => {
    const dragged = { x: 300, y: 208 };
    const others = [{ x: 700, y: 200 }];
    const result = computeSnap(dragged, others, 8);
    expect(result.x).toBe(300);
    expect(result.y).toBe(200);
    expect(result.guides).toEqual({ horizontal: 200 });
  });

  it("leaves the position alone and emits no guides when nothing is within threshold", () => {
    const dragged = { x: 300, y: 300 };
    const others = [{ x: 100, y: 100 }];
    const result = computeSnap(dragged, others, 8);
    expect(result).toEqual({ x: 300, y: 300, guides: {} });
  });

  it("picks the nearest candidate when multiple others are within threshold", () => {
    const dragged = { x: 100, y: 500 };
    const others = [
      { x: 105, y: 900 }, // 5px away
      { x: 102, y: 900 }, // 2px away — nearest, should win
      { x: 107, y: 900 }, // 7px away
    ];
    const result = computeSnap(dragged, others, 8);
    expect(result.x).toBe(102);
    expect(result.guides.vertical).toBe(102);
  });

  it("can snap both axes at once, independently, to different neighbours", () => {
    const dragged = { x: 203, y: 397 };
    const others = [
      { x: 200, y: 900 }, // aligns x
      { x: 900, y: 400 }, // aligns y
    ];
    const result = computeSnap(dragged, others, 8);
    expect(result).toEqual({ x: 200, y: 400, guides: { vertical: 200, horizontal: 400 } });
  });

  it("does not snap when the nearest candidate is exactly at the threshold boundary plus one", () => {
    const dragged = { x: 100, y: 100 };
    const others = [{ x: 109, y: 100 }]; // 9px away, threshold 8
    const result = computeSnap(dragged, others, 8);
    expect(result.x).toBe(100);
    expect(result.guides.vertical).toBeUndefined();
  });

  it("snaps exactly at the threshold boundary (inclusive)", () => {
    const dragged = { x: 100, y: 100 };
    const others = [{ x: 108, y: 100 }]; // exactly 8px away, threshold 8
    const result = computeSnap(dragged, others, 8);
    expect(result.x).toBe(108);
    expect(result.guides.vertical).toBe(108);
  });

  it("returns no guides and the original centre when there are no other tables", () => {
    const dragged = { x: 50, y: 50 };
    const result = computeSnap(dragged, [], 8);
    expect(result).toEqual({ x: 50, y: 50, guides: {} });
  });
});
