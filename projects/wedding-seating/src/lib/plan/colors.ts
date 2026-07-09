export const PALETTE: string[] = [
  "#2563eb", // blue
  "#16a34a", // green
  "#d97706", // amber
  "#dc2626", // red
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#db2777", // pink
  "#65a30d", // lime
];

export type AttributeKey = "ageGroup" | "gender" | "dietary";

export interface AttrGuest {
  id: string;
  ageGroup: string | null;
  gender: string | null;
  dietary: string | null;
}

export function buildColorMap(
  guests: AttrGuest[],
  attr: AttributeKey
): { legend: { value: string; color: string }[]; colorByGuest: Record<string, string> } {
  const order: string[] = [];
  const colorOfValue = new Map<string, string>();
  for (const g of guests) {
    const v = g[attr];
    if (v == null || v === "") continue;
    if (!colorOfValue.has(v)) {
      colorOfValue.set(v, PALETTE[order.length % PALETTE.length]);
      order.push(v);
    }
  }
  const colorByGuest: Record<string, string> = {};
  for (const g of guests) {
    const v = g[attr];
    if (v != null && v !== "" && colorOfValue.has(v)) colorByGuest[g.id] = colorOfValue.get(v)!;
  }
  return { legend: order.map((value) => ({ value, color: colorOfValue.get(value)! })), colorByGuest };
}
