"use client";

import type { EditorTable } from "@/lib/floorplan/editorState";

export interface TableInspectorProps {
  table: EditorTable | undefined;
  onUpdate: (id: string, patch: Partial<Omit<EditorTable, "id">>) => void;
  onDelete: (id: string) => void;
}

export default function TableInspector({ table, onUpdate, onDelete }: TableInspectorProps) {
  if (!table) {
    return (
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <em>Select a table to edit it.</em>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <strong>Table</strong>
      <div style={{ marginTop: 8 }}>
        <label>
          Shape:{" "}
          <select
            value={table.shape}
            onChange={(e) =>
              onUpdate(table.id, { shape: e.target.value as "round" | "oval" | "rect" })
            }
          >
            <option value="round">Round</option>
            <option value="oval">Oval</option>
            <option value="rect">Rectangular</option>
          </select>
        </label>
      </div>
      <div style={{ marginTop: 8 }}>
        <label>
          Capacity:{" "}
          <input
            type="number"
            min={1}
            value={table.capacity}
            onChange={(e) => onUpdate(table.id, { capacity: Number(e.target.value) || 0 })}
          />
        </label>
      </div>
      <div style={{ marginTop: 8 }}>
        <label>
          <input
            type="checkbox"
            checked={table.fixed}
            onChange={(e) => onUpdate(table.id, { fixed: e.target.checked })}
          />{" "}
          Fixed (position locked by the solver)
        </label>
      </div>
      <button
        type="button"
        onClick={() => onDelete(table.id)}
        style={{ marginTop: 12, color: "#dc2626" }}
      >
        Delete table
      </button>
    </div>
  );
}
