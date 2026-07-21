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

/** Smallest positive integer found in a cell — quantity sets like
 * "peq. x22 / Med. x21 / Alt. x18" collapse to 18 (the limiting count). Empty /
 * "-" / no digits → null. */
function minQty(text: string): number | null {
  const nums = (text.match(/\d+/g) ?? []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? Math.min(...nums) : null;
}

/**
 * Parse a decoration catalog workbook into items. Handles TWO layouts, per sheet:
 *
 *  • **Header layout** (clean template): row 1 has a "Nome"/"Name" header (+ optional
 *    Quantidade/Categoria/Preço). Data from row 2.
 *  • **Inventory layout** (no header, e.g. a real venue inventory): each SHEET is a
 *    category (its name), images sit in the left column, the next column is the item
 *    NAME and the one after is the QUANTITY (free text like "x 32"). Merged
 *    title/section rows (text in the image column) are skipped.
 *
 * Embedded images are matched to their nearest named row. ALL sheets are read.
 */
export async function parseDecorWorkbook(data: ArrayBuffer | Buffer): Promise<DecorImportRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const media = ((wb.model as unknown as { media?: { extension?: string; buffer?: Buffer }[] }).media) ?? [];

  const out: DecorImportRow[] = [];
  const qtyHeaders = new Set(["quantidade", "qtd", "quantity", "qty", "qtde"]);
  const catHeaders = new Set(["categoria", "category", "tipo"]);
  const priceHeaders = new Set(["preco", "price", "valor", "custo"]);

  for (const ws of wb.worksheets) {
    // --- detect a header row ---
    let nameCol = -1;
    let qtyCol = -1;
    let catCol = -1;
    let priceCol = -1;
    ws.getRow(1).eachCell((cell, col) => {
      const h = norm(cell.text ?? "");
      if (h === "nome" || h === "name" || h === "produto" || h === "item") nameCol = col;
      else if (qtyHeaders.has(h)) qtyCol = col;
      else if (catHeaders.has(h)) catCol = col;
      else if (priceHeaders.has(h)) priceCol = col;
    });
    const headerMode = nameCol !== -1;

    const imgs = ws.getImages();
    const imageCol0 = imgs.length ? Math.min(...imgs.map((i) => i.range?.tl?.nativeCol ?? 0)) : 0;
    const imageCol = imageCol0 + 1; // 1-based column that holds the images

    if (!headerMode) {
      // Inventory layout: image | name | quantity.
      nameCol = imageCol + 1;
      qtyCol = imageCol + 2;
    }

    // --- named data rows ---
    const dataStart = headerMode ? 2 : 1;
    const named: number[] = [];
    for (let r = dataStart; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const name = (row.getCell(nameCol).text ?? "").trim();
      // In inventory layout, a merged title/section row fills the image column with
      // text — skip those (data rows leave that column empty, the image floats over it).
      if (!headerMode && (row.getCell(imageCol).text ?? "").trim()) continue;
      if (!name) continue;
      named.push(r);
    }
    const namedSet = new Set(named);

    // --- map images to their nearest named row (anchors are ±1 imprecise) ---
    const imageByRow = new Map<number, { bytes: Uint8Array; extension: string }>();
    for (const im of imgs) {
      const m = media[Number(im.imageId)];
      if (!m?.buffer) continue;
      const nativeRow = im.range?.tl?.nativeRow ?? 0;
      const target = nativeRow + 1;
      let pick: number | null = null;
      for (const off of [0, -1, 1]) {
        if (namedSet.has(target + off)) {
          pick = target + off;
          break;
        }
      }
      if (pick != null && !imageByRow.has(pick)) {
        imageByRow.set(pick, { bytes: new Uint8Array(m.buffer), extension: m.extension || "png" });
      }
    }

    const sheetCategory = ws.name.trim();
    for (const r of named) {
      const row = ws.getRow(r);
      const item: DecorImportRow = { name: (row.getCell(nameCol).text ?? "").trim() || "Item" };

      if (headerMode && catCol !== -1) {
        const c = (row.getCell(catCol).text ?? "").trim();
        if (c) item.category = c;
      } else if (!headerMode && sheetCategory) {
        item.category = sheetCategory;
      }

      const q = minQty(row.getCell(qtyCol).text ?? "");
      if (q != null) item.quantity = q;

      if (headerMode && priceCol !== -1) {
        const t = (row.getCell(priceCol).text ?? "").trim();
        if (t) {
          const p = Number(t.replace(",", "."));
          if (Number.isFinite(p)) item.price = p;
        }
      }

      const img = imageByRow.get(r);
      if (img) item.image = img;

      out.push(item);
    }
  }
  return out;
}
