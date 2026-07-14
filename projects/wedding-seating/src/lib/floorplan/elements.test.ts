import { describe, it, expect } from "vitest";
import { parseElements, serializeElements, type RoomElement } from "./elements";

describe("elements", () => {
  it("round-trips a list of room elements through serialize/parse", () => {
    const elements: RoomElement[] = [
      { id: "e1", x: 10, y: 20, w: 100, h: 60, label: "Pista de dança", color: "#60a5fa" },
      { id: "e2", x: 200, y: 40, w: 80, h: 40, label: "Bar", color: "#f97316" },
    ];
    const json = serializeElements(elements);
    expect(json).not.toBeNull();
    expect(parseElements(json)).toEqual(elements);
  });

  it("serializes an empty list to null (nothing to store)", () => {
    expect(serializeElements([])).toBeNull();
  });

  it("parses null/undefined/empty string as an empty array", () => {
    expect(parseElements(null)).toEqual([]);
    expect(parseElements(undefined)).toEqual([]);
    expect(parseElements("")).toEqual([]);
  });

  it("parses malformed JSON as an empty array", () => {
    expect(parseElements("{not json")).toEqual([]);
  });

  it("parses non-array JSON as an empty array", () => {
    expect(parseElements(JSON.stringify({ foo: "bar" }))).toEqual([]);
  });

  it("filters out entries that don't match the RoomElement shape", () => {
    const json = JSON.stringify([
      { id: "ok", x: 1, y: 2, w: 3, h: 4, label: "Bar", color: "#fff" },
      { id: "missing-fields", x: 1 },
      "not an object",
      null,
    ]);
    expect(parseElements(json)).toEqual([
      { id: "ok", x: 1, y: 2, w: 3, h: 4, label: "Bar", color: "#fff" },
    ]);
  });
});
