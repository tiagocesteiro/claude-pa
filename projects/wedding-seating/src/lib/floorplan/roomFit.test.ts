import { describe, it, expect } from "vitest";
import { fitRoomScale } from "./roomFit";

it("maps the longer side to targetPx", () => {
  expect(fitRoomScale(12, 8, 900)).toBeCloseTo(75); // 900 / 12
  expect(fitRoomScale(8, 12, 900)).toBeCloseTo(75); // 900 / 12 (largura is longer here)
});

it("preserves aspect ratio via a single scale for both sides", () => {
  const scale = fitRoomScale(12, 8);
  expect(scale * 12).toBeCloseTo(900); // longer side hits targetPx
  expect(scale * 8).toBeCloseTo(600); // shorter side scales proportionally
});

it("defaults targetPx to 900 when omitted", () => {
  expect(fitRoomScale(10, 10)).toBeCloseTo(90);
});

it("returns 0 for non-positive or missing dimensions", () => {
  expect(fitRoomScale(0, 8)).toBe(0);
  expect(fitRoomScale(8, 0)).toBe(0);
  expect(fitRoomScale(-1, 8)).toBe(0);
  expect(fitRoomScale(NaN, 8)).toBe(0);
});

it("returns 0 when targetPx is non-positive", () => {
  expect(fitRoomScale(10, 10, 0)).toBe(0);
});
