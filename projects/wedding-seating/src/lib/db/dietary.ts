import { prisma } from "./client";

/**
 * The catering dietary aggregate: for the FINAL layout of a seated moment (the
 * dinner), guests' dietary needs COUNTED per table — never any names. RGPD: this
 * is the only channel that exposes dietary (special-category) data to a supplier,
 * and it does so aggregated + pseudonymized by table. See `assertDietaryAccess`
 * in access.ts (venue/admin + the catering supplier only).
 */

export interface DietaryTable {
  tableId: string;
  tableName: string;
  total: number;
  diets: { label: string; count: number }[];
}
export interface DietaryView {
  momentLabel: string | null;
  layoutName: string | null;
  totalSeated: number;
  overall: { label: string; count: number }[];
  tables: DietaryTable[];
}

const NO_RESTRICTION = "Sem restrição";
const KIND_LABELS: Record<string, string> = { ceremony: "Cerimónia", cocktail: "Cocktail", dinner: "Jantar", dance: "Dança" };

/** Free-text dietary value → display label; empty/whitespace → "Sem restrição". */
function dietLabel(d: string | null | undefined): string {
  const t = (d ?? "").trim();
  return t === "" ? NO_RESTRICTION : t;
}

/** Count labels case-insensitively (display first-seen casing); "Sem restrição"
 * first, then alphabetical. */
function tally(labels: string[]): { label: string; count: number }[] {
  const byKey = new Map<string, { label: string; count: number }>();
  for (const l of labels) {
    const key = l.toLocaleLowerCase("pt-PT");
    const e = byKey.get(key);
    if (e) e.count++;
    else byKey.set(key, { label: l, count: 1 });
  }
  return [...byKey.values()].sort((a, b) => {
    if (a.label === NO_RESTRICTION) return -1;
    if (b.label === NO_RESTRICTION) return 1;
    return a.label.localeCompare(b.label, "pt-PT");
  });
}

export async function getDietaryByTable(weddingId: string): Promise<DietaryView | null> {
  const layout = await prisma.weddingLayout.findFirst({
    where: { weddingId, isFinal: true, moment: { hasSeating: true } },
    orderBy: { createdAt: "asc" },
    select: {
      name: true,
      moment: { select: { title: true, kind: true } },
      tables: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          layoutSeats: { select: { guest: { select: { dietary: true } } } },
        },
      },
    },
  });
  if (!layout) return null;

  const momentLabel =
    layout.moment?.title ?? (layout.moment?.kind ? KIND_LABELS[layout.moment.kind] ?? layout.moment.kind : null);

  const overallLabels: string[] = [];
  const tables: DietaryTable[] = layout.tables
    .map((t, i) => {
      const labels = t.layoutSeats.map((s) => dietLabel(s.guest.dietary));
      overallLabels.push(...labels);
      return {
        tableId: t.id,
        tableName: t.name?.trim() ? t.name : `Mesa ${i + 1}`,
        total: labels.length,
        diets: tally(labels),
      };
    })
    .filter((t) => t.total > 0); // omit empty tables

  return {
    momentLabel,
    layoutName: layout.name,
    totalSeated: overallLabels.length,
    overall: tally(overallLabels),
    tables,
  };
}
