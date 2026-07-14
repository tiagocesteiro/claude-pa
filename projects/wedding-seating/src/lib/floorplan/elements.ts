/** Plan 18 Task 8 — extra room elements (dance floor, bar, ...): labelled, colored
 * rectangles drawn on a floor plan as decorative fixtures. They live in the same
 * image-natural pixel space as tables/zones, but are NOT tables — the seating engine
 * and the spacing/zone warning checks never see them (callers simply don't feed
 * `elements` into those functions). */
export interface RoomElement {
  /** Client-generated id — used for React keys/selection while editing; not part of
   * the plan's literal `{x,y,w,h,label,color}` shape, but harmless extra JSON. */
  id: string;
  /** Top-left corner, image-natural pixels (same convention as a Konva Rect with no offset). */
  x: number;
  y: number;
  /** Size, image-natural pixels. */
  w: number;
  h: number;
  label: string;
  /** Hex color (e.g. "#60a5fa") used for both the fill and the border. */
  color: string;
}

function isRoomElement(v: unknown): v is RoomElement {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.x === "number" &&
    typeof e.y === "number" &&
    typeof e.w === "number" &&
    typeof e.h === "number" &&
    typeof e.label === "string" &&
    typeof e.color === "string"
  );
}

/** Parses a FloorPlan's `elements` JSON column into a list of room elements. Mirrors
 * how zones are parsed elsewhere (safe JSON.parse; malformed/absent data or anything
 * that isn't an array of well-formed elements yields an empty array — never throws). */
export function parseElements(json: string | null | undefined): RoomElement[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRoomElement);
  } catch {
    return [];
  }
}

/** Serializes a room-element list back to the FloorPlan's JSON column shape. An empty
 * list serializes to `null` (same "nothing to store" convention the zone editor uses),
 * so an empty array round-trips through parseElements/serializeElements as `[]`. */
export function serializeElements(elements: RoomElement[]): string | null {
  return elements.length > 0 ? JSON.stringify(elements) : null;
}
