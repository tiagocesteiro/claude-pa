"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";
import {
  ROLE_LABELS,
  REQUIREMENT_STATUS_LABELS,
  SERVICE_STATUS_LABELS,
  PROVIDER_LABELS,
} from "@/lib/labels";

interface AuditEvent {
  id: string;
  actorRole: string;
  actorLabel: string;
  action: string;
  entityType: string;
  summary: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  createdAt: string;
}

const ROLE_TONE: Record<string, "accent" | "neutral" | "warning" | "success"> = {
  venue: "accent",
  couple: "success",
  supplier: "warning",
  admin: "neutral",
};

const FIELD_LABELS: Record<string, string> = {
  status: "estado",
  providerType: "fornecido por",
  supplierId: "fornecedor",
  title: "título",
  detail: "detalhe",
  name: "nome",
};

/** Render a changed value in a human way (status codes → PT labels, null → "—"). */
function fmtValue(field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  const s = String(v);
  if (field === "status") return REQUIREMENT_STATUS_LABELS[s] ?? SERVICE_STATUS_LABELS[s] ?? s;
  if (field === "providerType") return PROVIDER_LABELS[s] ?? s;
  if (field === "supplierId") return "fornecedor atribuído";
  return s;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** The wedding's activity timeline (scoped server-side per role). Read-only. */
export default function ActivityFeed({ weddingId, title = "Atividade" }: { weddingId: string; title?: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/weddings/${weddingId}/activity`);
      if (res.ok) setEvents(((await res.json()) as { events: AuditEvent[] }).events ?? []);
      setLoading(false);
    })();
  }, [weddingId]);

  return (
    <Card style={{ marginBottom: 20 }}>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>{title}</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Registo de todas as alterações e trocas de informação. Nada se perde.
      </p>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>A carregar…</p>
      ) : events.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Ainda sem atividade registada.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {events.map((e) => {
            const changed = e.changes ? Object.entries(e.changes) : [];
            return (
              <li key={e.id} style={{ borderLeft: "2px solid var(--border)", paddingLeft: 12 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <Badge tone={ROLE_TONE[e.actorRole] ?? "neutral"}>{ROLE_LABELS[e.actorRole] ?? e.actorRole}</Badge>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{e.actorLabel}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>{fmtWhen(e.createdAt)}</span>
                </div>
                <div style={{ fontSize: 13, marginTop: 2 }}>{e.summary}</div>
                {changed.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0", display: "flex", flexDirection: "column", gap: 2 }}>
                    {changed.map(([field, { from, to }]) => (
                      <li key={field} style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {FIELD_LABELS[field] ?? field}: <s>{fmtValue(field, from)}</s> → <strong style={{ color: "var(--text)" }}>{fmtValue(field, to)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
