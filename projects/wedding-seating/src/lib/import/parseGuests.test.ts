import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { parseGuestWorkbook } from "./parseGuests";

async function makeWorkbook(rows: (string | undefined)[][], headers: string[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Convidados");
  ws.addRow(headers);
  for (const r of rows) ws.addRow(r);
  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}

it("parses name + group columns (accent/case-insensitive headers)", async () => {
  const buf = await makeWorkbook(
    [
      ["Ana Silva", "Família"],
      ["Bruno Costa", "Faculdade"],
    ],
    ["Nome", "Grupo"]
  );
  const rows = await parseGuestWorkbook(buf);
  expect(rows).toEqual([
    { name: "Ana Silva", group: "Família" },
    { name: "Bruno Costa", group: "Faculdade" },
  ]);
});

it("trims whitespace and skips rows with empty name", async () => {
  const buf = await makeWorkbook(
    [
      ["  Carla  ", "  Amigos  "],
      ["", "Ignored"],
      ["   ", "AlsoIgnored"],
    ],
    ["nome", "grupo"]
  );
  const rows = await parseGuestWorkbook(buf);
  expect(rows).toEqual([{ name: "Carla", group: "Amigos" }]);
});

it("omits group when the column is missing or empty", async () => {
  const buf = await makeWorkbook([["Diogo", ""], ["Eva", undefined]], ["name", "group"]);
  const rows = await parseGuestWorkbook(buf);
  expect(rows).toEqual([{ name: "Diogo" }, { name: "Eva" }]);
});

it("returns [] when there is no name column", async () => {
  const buf = await makeWorkbook([["x", "y"]], ["foo", "bar"]);
  expect(await parseGuestWorkbook(buf)).toEqual([]);
});
