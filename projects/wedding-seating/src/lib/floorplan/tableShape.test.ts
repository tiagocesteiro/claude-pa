import { describe, it, expect } from "vitest";
import { tableRenderSize } from "./tableShape";

it("computes round table pixel size from diameter (width) and scale", () => {
  const size = tableRenderSize({ shape: "round", width: 1.5, depth: 1.5, capacity: 8 }, 50);
  expect(size).toEqual({ shape: "round", wPx: 75, hPx: 75 });
});

it("computes oval table pixel size — wPx from width (large), hPx from depth (small)", () => {
  const size = tableRenderSize({ shape: "oval", width: 1.8, depth: 1.2, capacity: 8 }, 50);
  expect(size).toEqual({ shape: "oval", wPx: 90, hPx: 60 });
});

it("computes rect table pixel size — wPx from width (length), hPx from depth (short side)", () => {
  const size = tableRenderSize({ shape: "rect", width: 2.4, depth: 1.0, capacity: 6 }, 50);
  expect(size).toEqual({ shape: "rect", wPx: 120, hPx: 50 });
});

it("uses a fixed default square size for round when scale is 0", () => {
  const size = tableRenderSize({ shape: "round", width: 1.5, depth: 1.5, capacity: 8 }, 0);
  expect(size.shape).toBe("round");
  expect(size.wPx).toBe(size.hPx);
  expect(size.wPx).toBeGreaterThan(0);
});

it("preserves aspect ratio for oval/rect when scale is 0 and dimensions are known", () => {
  const size = tableRenderSize({ shape: "rect", width: 2.4, depth: 1.0, capacity: 6 }, 0);
  expect(size.wPx).toBeGreaterThan(size.hPx);
  expect(size.wPx / size.hPx).toBeCloseTo(2.4 / 1.0, 5);
});

it("falls back to a square default when scale is 0 and dimensions are unknown", () => {
  const size = tableRenderSize({ shape: "rect", capacity: 6 }, 0);
  expect(size.wPx).toBe(size.hPx);
  expect(size.wPx).toBeGreaterThan(0);
});

it("falls back to DEFAULT_TABLE_METRES when width/depth are absent (scale > 0)", () => {
  const size = tableRenderSize({ shape: "round", capacity: 8 }, 50);
  expect(size).toEqual({ shape: "round", wPx: 75, hPx: 75 }); // 1.5m * 50
});

it("is deterministic — same input yields the same output", () => {
  const table = { shape: "oval", width: 1.8, depth: 1.2, capacity: 8 };
  expect(tableRenderSize(table, 50)).toEqual(tableRenderSize(table, 50));
});

it("normalizes an unknown shape string to rect", () => {
  const size = tableRenderSize({ shape: "square", width: 1.0, depth: 1.0, capacity: 4 }, 50);
  expect(size.shape).toBe("rect");
});
