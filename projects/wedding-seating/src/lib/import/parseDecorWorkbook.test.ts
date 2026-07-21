import { it, expect } from "vitest";
import ExcelJS from "exceljs";
import { parseDecorWorkbook } from "./parseDecorWorkbook";

async function buildWorkbook(rows: (string | number)[][], headers: string[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Decor");
  ws.addRow(headers);
  rows.forEach((r) => ws.addRow(r));
  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

it("parses name + quantity (+ category/price) columns, PT + EN headers", async () => {
  const buf = await buildWorkbook(
    [
      ["Arco floral", 2, "Flores", 120],
      ["Velas", 30, "Luz", ""],
      ["", 5, "", ""], // no name, no image → skipped
    ],
    ["Nome", "Quantidade", "Categoria", "Preco"]
  );
  const rows = await parseDecorWorkbook(buf);
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({ name: "Arco floral", quantity: 2, category: "Flores", price: 120 });
  expect(rows[1]).toMatchObject({ name: "Velas", quantity: 30, category: "Luz" });
  expect(rows[1].price).toBeUndefined();
});

it("returns [] when there is no name column", async () => {
  const buf = await buildWorkbook([["x", 1]], ["Coluna", "Qtd"]);
  expect(await parseDecorWorkbook(buf)).toEqual([]);
});

it("accepts alternative headers (qtd, item)", async () => {
  const buf = await buildWorkbook([["Passadeira", 1]], ["Item", "Qtd"]);
  const rows = await parseDecorWorkbook(buf);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ name: "Passadeira", quantity: 1 });
});

it("inventory layout: no header, sheet = category, image|name|qty, qty = min of set", async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Castiçais e suportes de vela ");
  ws.addRow(["Inventário", "Inventário", "Inventário"]); // merged title (image col filled) → skipped
  ws.addRow(["", "Castiçais de madeira", "peq. x 26\nMed. x 21\nAlt. x 18"]);
  ws.addRow(["", "Copo vidro transp.", "-"]);
  ws.addRow(["", "Cubos de vidro", "x 17 transparentes\nx 9 azulados"]);
  // a second category sheet
  const ws2 = wb.addWorksheet("Almofadas");
  ws2.addRow(["t", "t", "t"]);
  ws2.addRow(["", "Verde Garrafa", "x 12"]);
  const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;

  const rows = await parseDecorWorkbook(buf);
  expect(rows).toHaveLength(4);
  expect(rows[0]).toMatchObject({ name: "Castiçais de madeira", category: "Castiçais e suportes de vela", quantity: 18 });
  expect(rows[1]).toMatchObject({ name: "Copo vidro transp.", category: "Castiçais e suportes de vela" });
  expect(rows[1].quantity).toBeUndefined(); // "-" → no number
  expect(rows[2]).toMatchObject({ name: "Cubos de vidro", quantity: 9 }); // min(17, 9)
  expect(rows[3]).toMatchObject({ name: "Verde Garrafa", category: "Almofadas", quantity: 12 });
});
