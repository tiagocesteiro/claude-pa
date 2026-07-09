import { describe, it, expect } from "vitest";
import { buildColorMap, PALETTE } from "./colors";

const guests = [
  { id: "g1", ageGroup: "adult", gender: "F", dietary: null },
  { id: "g2", ageGroup: "child", gender: "M", dietary: "Vegan" },
  { id: "g3", ageGroup: "adult", gender: null, dietary: "Vegan" },
];

it("maps distinct attribute values to palette colors with a legend", () => {
  const { legend, colorByGuest } = buildColorMap(guests, "ageGroup");
  expect(legend).toEqual([
    { value: "adult", color: PALETTE[0] },
    { value: "child", color: PALETTE[1] },
  ]);
  expect(colorByGuest.g1).toBe(PALETTE[0]);
  expect(colorByGuest.g2).toBe(PALETTE[1]);
  expect(colorByGuest.g3).toBe(PALETTE[0]);
});

it("omits guests with a null value for the attribute", () => {
  const { colorByGuest } = buildColorMap(guests, "dietary");
  expect(colorByGuest.g1).toBeUndefined(); // dietary null
  expect(colorByGuest.g2).toBe(PALETTE[0]); // "Vegan" first-seen
  expect(colorByGuest.g3).toBe(PALETTE[0]);
});
