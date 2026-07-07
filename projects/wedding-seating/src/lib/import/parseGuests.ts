import ExcelJS from "exceljs";

export interface GuestRow {
  name: string;
  group?: string;
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export async function parseGuestWorkbook(data: ArrayBuffer | Buffer): Promise<GuestRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  let nameCol = -1;
  let groupCol = -1;
  ws.getRow(1).eachCell((cell, col) => {
    const h = norm(String(cell.value ?? ""));
    if (h === "nome" || h === "name") nameCol = col;
    else if (h === "grupo" || h === "group") groupCol = col;
  });
  if (nameCol === -1) return [];

  const rows: GuestRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = String(row.getCell(nameCol).value ?? "").trim();
    if (!name) continue;
    const group = groupCol !== -1 ? String(row.getCell(groupCol).value ?? "").trim() : "";
    rows.push(group ? { name, group } : { name });
  }
  return rows;
}
