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

// "group" colors by the guest's primary group (groupId), not a literal AttrGuest field —
// resolved via attrValue below so callers with no group concept (e.g. legacy tests) don't
// need to add a "group" property to satisfy the AttrGuest shape.
export type AttributeKey = "ageGroup" | "gender" | "dietary" | "group";

export interface AttrGuest {
  id: string;
  ageGroup: string | null;
  gender: string | null;
  dietary: string | null;
  /** Primary group id, used only when attr === "group". Optional/absent guests
   * (or guests with no group) are skipped, same as a null ageGroup/gender/dietary. */
  groupId?: string | null;
}

function attrValue(g: AttrGuest, attr: AttributeKey): string | null {
  if (attr === "group") return g.groupId ?? null;
  return g[attr];
}

export function buildColorMap(
  guests: AttrGuest[],
  attr: AttributeKey
): { legend: { value: string; color: string }[]; colorByGuest: Record<string, string> } {
  const order: string[] = [];
  const colorOfValue = new Map<string, string>();
  for (const g of guests) {
    const v = attrValue(g, attr);
    if (v == null || v === "") continue;
    if (!colorOfValue.has(v)) {
      colorOfValue.set(v, PALETTE[order.length % PALETTE.length]);
      order.push(v);
    }
  }
  const colorByGuest: Record<string, string> = {};
  for (const g of guests) {
    const v = attrValue(g, attr);
    if (v != null && v !== "" && colorOfValue.has(v)) colorByGuest[g.id] = colorOfValue.get(v)!;
  }
  return { legend: order.map((value) => ({ value, color: colorOfValue.get(value)! })), colorByGuest };
}
