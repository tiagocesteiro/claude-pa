"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";

interface DietaryTable {
  tableId: string;
  tableName: string;
  total: number;
  diets: { label: string; count: number }[];
}
interface DietaryView {
  momentLabel: string | null;
  layoutName: string | null;
  totalSeated: number;
  overall: { label: string; count: number }[];
  tables: DietaryTable[];
}

/** Read-only dietary aggregate for the catering (and the venue): per-table dietary
 * counts of the final dinner layout, recomputed live, with NO guest names. */
export default function DietaryByTableCard({ weddingId }: { weddingId: string }) {
  const [view, setView] = useState<DietaryView | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/weddings/${weddingId}/dietary`);
      if (!res.ok) {
        setDenied(res.status === 403);
        setLoading(false);
        return;
      }
      setView(((await res.json()) as { dietary: DietaryView | null }).dietary);
      setLoading(false);
    })();
  }, [weddingId]);

  if (loading || denied) return null;

  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Dietas por mesa</h2>
        {view && (
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {view.momentLabel ?? "Jantar"}
            {view.layoutName ? ` · ${view.layoutName}` : ""} · {view.totalSeated} sentados
          </span>
        )}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
        Contagem agregada, sem nomes. Atualiza automaticamente com o layout final do jantar.
      </p>

      {!view ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Ainda não há layout final do jantar com convidados sentados.
        </p>
      ) : (
        <>
          {/* Overall */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0 14px" }}>
            {view.overall.map((d) => (
              <Badge key={d.label} tone={d.label === "Sem restrição" ? "neutral" : "accent"}>
                {d.label}: {d.count}
              </Badge>
            ))}
          </div>

          {/* Per table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13, minWidth: 320 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
                  <th style={{ padding: "6px 8px" }}>Mesa</th>
                  <th style={{ padding: "6px 8px" }}>Total</th>
                  <th style={{ padding: "6px 8px" }}>Dietas</th>
                </tr>
              </thead>
              <tbody>
                {view.tables.map((t) => (
                  <tr key={t.tableId} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>{t.tableName}</td>
                    <td style={{ padding: "6px 8px", fontVariantNumeric: "tabular-nums" }}>{t.total}</td>
                    <td style={{ padding: "6px 8px" }}>
                      {t.diets.map((d, i) => (
                        <span key={d.label}>
                          {i > 0 ? " · " : ""}
                          {d.label === "Sem restrição" ? `${d.count} sem restrição` : `${d.count} ${d.label}`}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
