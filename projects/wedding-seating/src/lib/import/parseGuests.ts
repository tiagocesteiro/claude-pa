import ExcelJS from "exceljs";

export interface GuestRow {
  name: string;
  group?: string;
  ageGroup?: "adult" | "child" | "senior";
  gender?: string;
  dietary?: string;
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function normAge(value: string): "adult" | "child" | "senior" | undefined {
  const v = norm(value);
  if (v === "adulto") return "adult";
  if (v === "crianca") return "child";
  if (v === "idoso") return "senior";
  return undefined;
}

export async function parseGuestWorkbook(data: ArrayBuffer | Buffer): Promise<GuestRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  let nameCol = -1;
  let groupCol = -1;
  let ageGroupCol = -1;
  let genderCol = -1;
  let dietaryCol = -1;
  const ageGroupHeaders = new Set(["faixa", "faixa etaria", "idade", "escalao"]);
  const genderHeaders = new Set(["genero", "sexo"]);
  const dietaryHeaders = new Set(["alergias", "intolerancias", "dieta", "alimentar", "restricoes"]);
  ws.getRow(1).eachCell((cell, col) => {
    const h = norm(cell.text ?? "");
    if (h === "nome" || h === "name") nameCol = col;
    else if (h === "grupo" || h === "group") groupCol = col;
    else if (ageGroupHeaders.has(h)) ageGroupCol = col;
    else if (genderHeaders.has(h)) genderCol = col;
    else if (dietaryHeaders.has(h)) dietaryCol = col;
  });
  if (nameCol === -1) return [];

  const rows: GuestRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = (row.getCell(nameCol).text ?? "").trim();
    if (!name) continue;
    const group = groupCol !== -1 ? (row.getCell(groupCol).text ?? "").trim() : "";
    const ageGroupRaw = ageGroupCol !== -1 ? (row.getCell(ageGroupCol).text ?? "").trim() : "";
    const ageGroup = ageGroupRaw ? normAge(ageGroupRaw) : undefined;
    const gender = genderCol !== -1 ? (row.getCell(genderCol).text ?? "").trim() : "";
    const dietary = dietaryCol !== -1 ? (row.getCell(dietaryCol).text ?? "").trim() : "";

    const entry: GuestRow = { name };
    if (group) entry.group = group;
    if (ageGroup) entry.ageGroup = ageGroup;
    if (gender) entry.gender = gender;
    if (dietary) entry.dietary = dietary;
    rows.push(entry);
  }
  return rows;
}
