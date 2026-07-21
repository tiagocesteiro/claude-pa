import ExcelJS from "exceljs";

export interface DecorImportRow {
  name: string;
  quantity?: number;
  category?: string;
  price?: number;
  image?: { bytes: Uint8Array; extension: string };
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Parse a decoration catalog workbook: a header row + rows with a NAME column, a
 * QUANTITY column, optional CATEGORY/PRICE, and (typically) one embedded IMAGE per
 * row. Embedded images are matched to their anchored spreadsheet row. Name column
 * is required; rows are yielded if they have a name and/or an image.
 */
export async function parseDecorWorkbook(data: ArrayBuffer | Buffer): Promise<DecorImportRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  let nameCol = -1;
  let qtyCol = -1;
  let catCol = -1;
  let priceCol = -1;
  const qtyHeaders = new Set(["quantidade", "qtd", "quantity", "qty", "qtde"]);
  const catHeaders = new Set(["categoria", "category", "tipo"]);
  const priceHeaders = new Set(["preco", "price", "valor", "custo"]);
  ws.getRow(1).eachCell((cell, col) => {
    const h = norm(cell.text ?? "");
    if (h === "nome" || h === "name" || h === "produto" || h === "item") nameCol = col;
    else if (qtyHeaders.has(h)) qtyCol = col;
    else if (catHeaders.has(h)) catCol = col;
    else if (priceHeaders.has(h)) priceCol = col;
  });
  if (nameCol === -1) return [];

  // Map embedded images to their anchored spreadsheet row (1-based). `tl.nativeRow`
  // is 0-based (header row = 0), so spreadsheet row = nativeRow + 1.
  const media = ((wb.model as unknown as { media?: { extension?: string; buffer?: Buffer }[] }).media) ?? [];
  const imageByRow = new Map<number, { bytes: Uint8Array; extension: string }>();
  for (const img of ws.getImages()) {
    const m = media[Number(img.imageId)];
    if (!m?.buffer) continue;
    const tl = img.range?.tl as { nativeRow?: number; row?: number } | undefined;
    const nativeRow = tl?.nativeRow ?? Math.floor(tl?.row ?? 0);
    const rowNum = nativeRow + 1;
    if (!imageByRow.has(rowNum)) {
      imageByRow.set(rowNum, { bytes: new Uint8Array(m.buffer), extension: m.extension || "png" });
    }
  }

  const rows: DecorImportRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = (row.getCell(nameCol).text ?? "").trim();
    const image = imageByRow.get(r);
    if (!name && !image) continue;

    const out: DecorImportRow = { name: name || "Item" };
    if (qtyCol !== -1) {
      const t = (row.getCell(qtyCol).text ?? "").trim();
      const q = t ? Number(t.replace(",", ".")) : NaN;
      if (Number.isFinite(q) && q > 0) out.quantity = Math.floor(q);
    }
    if (catCol !== -1) {
      const c = (row.getCell(catCol).text ?? "").trim();
      if (c) out.category = c;
    }
    if (priceCol !== -1) {
      const t = (row.getCell(priceCol).text ?? "").trim();
      if (t) {
        const p = Number(t.replace(",", "."));
        if (Number.isFinite(p)) out.price = p;
      }
    }
    if (image) out.image = image;
    rows.push(out);
  }
  return rows;
}
