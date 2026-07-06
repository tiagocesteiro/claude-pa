import { describe, it, expect } from "vitest";
import { pixelDistance, scaleFromReference, metresToPixels, pixelsToMetres } from "./geometry";

it("pixelDistance is Euclidean", () => {
  expect(pixelDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
});

it("scaleFromReference returns pixels per metre", () => {
  // 100px line == 2 metres => 50 px/m
  expect(scaleFromReference({ x: 0, y: 0 }, { x: 100, y: 0 }, 2)).toBe(50);
});

it("scaleFromReference rejects non-positive length and coincident points", () => {
  expect(() => scaleFromReference({ x: 0, y: 0 }, { x: 100, y: 0 }, 0)).toThrow();
  expect(() => scaleFromReference({ x: 5, y: 5 }, { x: 5, y: 5 }, 2)).toThrow();
});

it("metre/pixel conversions round-trip", () => {
  expect(metresToPixels(3, 50)).toBe(150);
  expect(pixelsToMetres(150, 50)).toBe(3);
});
