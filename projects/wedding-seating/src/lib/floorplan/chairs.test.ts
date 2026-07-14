import { it, expect, describe } from "vitest";
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

it("places chairs on a symmetric ring for round tables (x-spread ~= y-spread)", () => {
  const pts = chairPositions({ x: 0, y: 0, capacity: 8, shape: "round", width: 1.5, depth: 1.5 }, 50);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const xSpread = Math.max(...xs) - Math.min(...xs);
  const ySpread = Math.max(...ys) - Math.min(...ys);
  expect(xSpread).toBeCloseTo(ySpread, 5);
});

it("places chairs on an elliptical ring for oval tables — x-spread > y-spread when wider than deep", () => {
  const pts = chairPositions({ x: 0, y: 0, capacity: 8, shape: "oval", width: 2.4, depth: 1.2 }, 50);
  expect(pts).toHaveLength(8);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const xSpread = Math.max(...xs) - Math.min(...xs);
  const ySpread = Math.max(...ys) - Math.min(...ys);
  expect(xSpread).toBeGreaterThan(ySpread);
});

it("places oval chairs exactly on the ellipse ring defined by wPx/hPx + offset (real outline, not a rect box)", () => {
  const CHAIR_OFFSET = 18;
  const wPx = 120; // 2.4 * 50
  const hPx = 60; // 1.2 * 50
  const rx = wPx / 2 + CHAIR_OFFSET;
  const ry = hPx / 2 + CHAIR_OFFSET;
  const pts = chairPositions({ x: 0, y: 0, capacity: 8, shape: "oval", width: 2.4, depth: 1.2 }, 50);
  for (const p of pts) {
    const ellipseValue = (p.x / rx) ** 2 + (p.y / ry) ** 2;
    expect(ellipseValue).toBeCloseTo(1, 5);
  }
});

it("places rect chairs on the real wPx x hPx outline computed from tableRenderSize", () => {
  const pts = chairPositions({ x: 0, y: 0, capacity: 4, shape: "rect", width: 2.4, depth: 1.0 }, 50);
  // wPx=120 hPx=50 (from tableRenderSize) + CHAIR_OFFSET (18) each side.
  const halfW = 120 / 2 + 18;
  const halfH = 50 / 2 + 18;
  for (const p of pts) {
    expect(Math.abs(p.x)).toBeLessThanOrEqual(halfW + 1e-6);
    expect(Math.abs(p.y)).toBeLessThanOrEqual(halfH + 1e-6);
  }
});

describe("heads (cabeceiras) — rect tables only", () => {
  // wPx=120 hPx=50 (from tableRenderSize for width=2.4/depth=1.0 @ scale 50) + 18 offset each side.
  const halfW = 120 / 2 + 18;
  const halfH = 50 / 2 + 18;

  it("heads:true (default) still places chairs on the short ends — matches current behavior", () => {
    const withDefault = chairPositions({ x: 0, y: 0, capacity: 6, shape: "rect", width: 2.4, depth: 1.0 }, 50);
    const withExplicitTrue = chairPositions(
      { x: 0, y: 0, capacity: 6, shape: "rect", width: 2.4, depth: 1.0, heads: true },
      50
    );
    expect(withExplicitTrue).toEqual(withDefault);
    // Sanity: at least one chair sits on a short end (x at +/- halfW) for the default layout.
    const onShortEnd = withDefault.some((p) => Math.abs(Math.abs(p.x) - halfW) < 1e-6);
    expect(onShortEnd).toBe(true);
  });

  it("heads:false returns exactly `capacity` chairs with NONE on the short-end zones", () => {
    const pts = chairPositions(
      { x: 0, y: 0, capacity: 6, shape: "rect", width: 2.4, depth: 1.0, heads: false },
      50
    );
    expect(pts).toHaveLength(6);
    for (const p of pts) {
      // Chairs stay within the long edges' span — never out past the short ends
      // (corners, at exactly +/-halfW, are the far edge of a long side, not the
      // short end itself, since y is always +/-halfH here, never in between).
      expect(Math.abs(p.x)).toBeLessThanOrEqual(halfW + 1e-6);
      // Every chair sits on one of the long (top/bottom) edges.
      expect(Math.abs(Math.abs(p.y) - halfH)).toBeLessThan(1e-6);
    }
    // None of the 6 evenly-spaced chairs land past the corners either (a fully
    // "short end interior" point would need x === halfW AND y strictly between
    // -halfH/halfH — impossible here since every point's y is exactly +/-halfH).
  });

  it("heads:false is ignored for round/oval tables (unaffected by the flag)", () => {
    const withHeadsFalse = chairPositions(
      { x: 0, y: 0, capacity: 8, shape: "round", width: 1.5, depth: 1.5, heads: false },
      50
    );
    const withoutHeads = chairPositions({ x: 0, y: 0, capacity: 8, shape: "round", width: 1.5, depth: 1.5 }, 50);
    expect(withHeadsFalse).toEqual(withoutHeads);
  });
});
