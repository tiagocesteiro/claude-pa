import { describe, it, expect } from "vitest";
import { slugify, buildPdfFilename, groupGuestsByTable } from "./pdfExport";

describe("slugify", () => {
  it("lowercases and hyphenates non-alphanumeric runs", () => {
    expect(slugify("Ana & Bruno")).toBe("ana-bruno");
  });

  it("strips diacritics", () => {
    expect(slugify("José & María")).toBe("jose-maria");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  Jantar!  ")).toBe("jantar");
  });
});

describe("buildPdfFilename", () => {
  it("builds a slugified <couple>-<momento>.pdf filename", () => {
    expect(buildPdfFilename("Ana & Bruno", "Jantar")).toBe("ana-bruno-jantar.pdf");
  });

  it("falls back to sane defaults when a slug collapses to empty", () => {
    expect(buildPdfFilename("!!!", "???")).toBe("casamento-planta.pdf");
  });
});

describe("groupGuestsByTable", () => {
  const tables = [
    { id: "t1", name: null },
    { id: "t2", name: "Mesa dos noivos" },
    { id: "t3", name: null },
  ];

  it("groups seated guests by table, in table order, using custom names when set", () => {
    const guests = [
      { id: "g1", name: "Ana", assignedTableId: "t2" },
      { id: "g2", name: "Bruno", assignedTableId: "t1" },
      { id: "g3", name: "Carla", assignedTableId: "t1" },
    ];
    expect(groupGuestsByTable(guests, tables)).toEqual([
      { tableId: "t1", label: "Mesa 1", names: ["Bruno", "Carla"] },
      { tableId: "t2", label: "Mesa dos noivos", names: ["Ana"] },
    ]);
  });

  it("omits tables with no seated guests", () => {
    const guests = [{ id: "g1", name: "Ana", assignedTableId: "t2" }];
    const groups = groupGuestsByTable(guests, tables);
    expect(groups.map((g) => g.tableId)).toEqual(["t2"]);
  });

  it("skips unassigned guests and guests assigned to an unknown table", () => {
    const guests = [
      { id: "g1", name: "Ana", assignedTableId: null },
      { id: "g2", name: "Bruno", assignedTableId: "ghost" },
    ];
    expect(groupGuestsByTable(guests, tables)).toEqual([]);
  });

  it("returns an empty list when there are no tables or guests", () => {
    expect(groupGuestsByTable([], [])).toEqual([]);
  });
});
