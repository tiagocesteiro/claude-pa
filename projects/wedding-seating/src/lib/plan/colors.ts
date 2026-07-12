// Soft, harmonious palette (lighter + more appealing than raw web-primaries).
// Consistent lightness/saturation for a cohesive wedding feel, with enough hue
// separation to stay distinguishable as small chair dots.
export const PALETTE: string[] = [
  "#6C9BD1", // dusty blue
  "#6FBF9B", // sage green
  "#E8B04B", // warm gold
  "#E88B7D", // coral
  "#A98BD1", // lilac
  "#5FBCCB", // aqua
  "#E39BC4", // blush pink
  "#A9C266", // olive
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
