"use client";

import type { CSSProperties } from "react";

export interface TableListGuest {
  id: string;
  name: string;
  // ageGroup/gender/dietary are still accepted (callers pass the full guest record)
  // but intentionally unused here — Task 1 (Plan 18) shows names only, per table.
  ageGroup?: string | null;
  gender?: string | null;
  dietary?: string | null;
}

export interface TableListRow {
  id: string;
  /** Stable display label, e.g. "Mesa 1" — derived from table order, not the raw id. */
  label: string;
  occupancy: number;
  capacity: number;
  guests: TableListGuest[];
  overCapacity: boolean;
}

export interface TableListProps {
  rows: TableListRow[];
  unassigned: TableListGuest[];
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "2px solid #d1d5db",
  fontSize: 13,
  color: "#374151",
};

const tdStyle: CSSProperties = {
  padding: "8px 10px",
  verticalAlign: "top",
  fontSize: 14,
};

/** Printable per-table list: one row per table with occupancy and seated guest names by name
 * (not id), plus a trailing row for unassigned guests. Mirrors what the canvas shows, so it
 * can be read/printed without needing to squint at the floor-plan chips. */
export default function TableList({ rows, unassigned }: TableListProps) {
  return (
    <div data-testid="table-list" style={{ marginTop: 24 }}>
      <h3 style={{ marginBottom: 8 }}>Mesas</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Mesa</th>
              <th style={thStyle}>Ocupação</th>
              <th style={thStyle}>Convidados</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                data-testid={`table-list-row-${row.id}`}
                style={{ borderTop: "1px solid #e5e7eb" }}
              >
                <td style={{ ...tdStyle, fontWeight: 600 }}>{row.label}</td>
                <td
                  style={{
                    ...tdStyle,
                    color: row.overCapacity ? "#dc2626" : "#111827",
                    fontWeight: row.overCapacity ? 700 : 400,
                  }}
                >
                  {row.occupancy}/{row.capacity}
                </td>
                <td style={tdStyle}>
                  {row.guests.map((g) => g.name).join(", ") || "—"}
                </td>
              </tr>
            ))}
            <tr data-testid="table-list-row-unassigned" style={{ borderTop: "1px solid #e5e7eb" }}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>Por atribuir</td>
              <td style={tdStyle}>{unassigned.length}</td>
              <td style={tdStyle}>
                {unassigned.map((g) => g.name).join(", ") || "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
