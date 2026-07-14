import type { Point } from "./geometry";

export interface EditorTable {
  id: string;
  shape: "round" | "oval" | "rect";
  capacity: number;
  x: number;
  y: number;
  fixed: boolean;
  width?: number | null;
  depth?: number | null;
  minCapacity?: number | null;
  /** Optional human label ("Mesa dos noivos"); falls back to "Mesa N" when unset. */
  name?: string | null;
  /** Rect tables only ("cabeceiras"): seats on the two short ends. Defaults to true. */
  heads?: boolean | null;
}

export interface EditorState {
  tables: EditorTable[];
  selectedId: string | null;
  dirty: boolean;
}

/** Prefilled attributes when a table is placed from a venue's table-type catalog. */
export type TablePreset = Partial<
  Pick<EditorTable, "shape" | "capacity" | "minCapacity" | "width" | "depth">
>;

export type EditorAction =
  | { type: "add-table"; at: Point; preset?: TablePreset }
  | { type: "move-table"; id: string; to: Point }
  | { type: "update-table"; id: string; patch: Partial<Omit<EditorTable, "id">> }
  | { type: "delete-table"; id: string }
  | { type: "select"; id: string | null }
  | { type: "load"; tables: EditorTable[] };

export function initialEditorState(): EditorState {
  return { tables: [], selectedId: null, dirty: false };
}

let counter = 0;
function newId(): string {
  counter += 1;
  return `tmp-${Date.now()}-${counter}`;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "add-table":
      return {
        ...state,
        dirty: true,
        tables: [
          ...state.tables,
          {
            id: newId(),
            shape: action.preset?.shape ?? "round",
            capacity: action.preset?.capacity ?? 8,
            x: action.at.x,
            y: action.at.y,
            fixed: false,
            width: action.preset?.width,
            depth: action.preset?.depth,
            minCapacity: action.preset?.minCapacity,
          },
        ],
      };
    case "move-table":
      return {
        ...state,
        dirty: true,
        tables: state.tables.map((t) => (t.id === action.id ? { ...t, x: action.to.x, y: action.to.y } : t)),
      };
    case "update-table":
      return {
        ...state,
        dirty: true,
        tables: state.tables.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
      };
    case "delete-table":
      return {
        ...state,
        dirty: true,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        tables: state.tables.filter((t) => t.id !== action.id),
      };
    case "select":
      return { ...state, selectedId: action.id };
    case "load":
      return { tables: action.tables, selectedId: null, dirty: false };
  }
}
