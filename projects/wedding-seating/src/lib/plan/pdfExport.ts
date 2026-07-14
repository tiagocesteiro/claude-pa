// Pure helpers backing the couple overview's "Exportar PDF" button (Plan 18, Wave 3
// Task 10). Kept framework-free (no jsPDF/Konva imports) so they're trivially unit
// testable — the PDF assembly itself (image capture + jsPDF calls) lives inline in
// CoupleView, which is the thing that actually needs the browser/canvas.

/** ASCII-safe, filesystem-friendly slug: lowercase, diacritics stripped, non
 * alphanumerics collapsed to single hyphens, no leading/trailing hyphen. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (combining diacritical marks)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Filename for a moment's exported PDF: "<couple>-<momento>.pdf", slugified. Falls
 * back to "planta" when a slug collapses to empty (e.g. a name with no ASCII
 * letters/digits), so a table/moment always downloads with a sane name. */
export function buildPdfFilename(couple: string, momentLabel: string): string {
  const coupleSlug = slugify(couple) || "casamento";
  const momentSlug = slugify(momentLabel) || "planta";
  return `${coupleSlug}-${momentSlug}.pdf`;
}

/** Minimal guest/table shapes the grouping needs — matches (a subset of) PlanGuest/
 * PlanTable from usePlan without importing them, so this stays dependency-free. */
export interface NameListGuest {
  id: string;
  name: string;
  assignedTableId: string | null;
}

export interface NameListTable {
  id: string;
  name?: string | null;
}

export interface TableNameGroup {
  tableId: string;
  /** Table's custom name when set, else "Mesa N" (1-based position in `tables`). */
  label: string;
  /** Seated guests' names, in the order they appear in `guests`. */
  names: string[];
}

/** Groups seated guests by their assigned table, in the tables' own order. Tables
 * with no seated guests are omitted (nothing to list). Unassigned guests (no
 * `assignedTableId`, or pointing at a table not in `tables`) are skipped. */
export function groupGuestsByTable(guests: NameListGuest[], tables: NameListTable[]): TableNameGroup[] {
  const namesByTable = new Map<string, string[]>();
  for (const g of guests) {
    if (!g.assignedTableId) continue;
    const list = namesByTable.get(g.assignedTableId);
    if (list) list.push(g.name);
    else namesByTable.set(g.assignedTableId, [g.name]);
  }
  const groups: TableNameGroup[] = [];
  tables.forEach((t, i) => {
    const names = namesByTable.get(t.id);
    if (!names || names.length === 0) return;
    const label = t.name?.trim() ? t.name : `Mesa ${i + 1}`;
    groups.push({ tableId: t.id, label, names });
  });
  return groups;
}
