"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { REQUIREMENT_KIND_LABELS } from "@/lib/labels";

interface ResolvedTemplate {
  id: string;
  kind: string;
  service: string | null;
  title: string;
  detail: string | null;
  targetLabel: string;
  hasTarget: boolean;
}

interface Group {
  key: string;
  label: string;
  hasTarget: boolean;
  templates: ResolvedTemplate[];
}

/** Group the resolved templates by their recipient (a supplier, or the couple),
 * preserving order — so each fornecedor's requests form a separate block. */
function groupByTarget(templates: ResolvedTemplate[]): Group[] {
  const groups: Group[] = [];
  const byKey = new Map<string, Group>();
  for (const t of templates) {
    const key = t.service ? `svc:${t.service}|${t.targetLabel}` : "couple";
    let g = byKey.get(key);
    if (!g) {
      g = { key, label: t.targetLabel, hasTarget: t.hasTarget, templates: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    g.templates.push(t);
  }
  return groups;
}

/** Venue-side: send request templates to this wedding's suppliers. Templates are
 * SEPARATED per recipient (fornecedor / noivos); the venue picks which to send in
 * each block and sends that block on its own. `onSent` refreshes the ledger. */
export default function SendTemplatesCard({ weddingId, onSent }: { weddingId: string; onSent?: () => void }) {
  const [templates, setTemplates] = useState<ResolvedTemplate[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/weddings/${weddingId}/requirement-templates`);
    if (res.ok) setTemplates(((await res.json()) as { templates: ResolvedTemplate[] }).templates ?? []);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendGroup(g: Group) {
    const ids = g.templates.filter((t) => checked[t.id]).map((t) => t.id);
    if (ids.length === 0) return;
    setBusyKey(g.key);
    setMsg((m) => ({ ...m, [g.key]: "" }));
    try {
      const res = await fetch(`/api/weddings/${weddingId}/requirement-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateIds: ids }),
      });
      if (!res.ok) throw new Error();
      const { created } = (await res.json()) as { created: number };
      setChecked((c) => {
        const next = { ...c };
        for (const id of ids) delete next[id];
        return next;
      });
      setMsg((m) => ({ ...m, [g.key]: `Enviado${created === 1 ? "" : "s"} ${created} pedido${created === 1 ? "" : "s"} a ${g.label}.` }));
      onSent?.();
    } catch {
      setMsg((m) => ({ ...m, [g.key]: "Não foi possível enviar." }));
    } finally {
      setBusyKey(null);
    }
  }

  if (templates.length === 0) {
    return (
      <Card style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0, marginBottom: 4 }}>Enviar pedidos template</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
          Ainda não tens templates. Cria-os na página da tua quinta (secção &ldquo;Pedidos template&rdquo;).
        </p>
      </Card>
    );
  }

  const groups = groupByTarget(templates);

  return (
    <Card style={{ marginBottom: 20 }}>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Enviar pedidos template</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Separados por destinatário. Escolhe quais enviar a cada um.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {groups.map((g) => {
          const selected = g.templates.filter((t) => checked[t.id]).length;
          return (
            <div key={g.key} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ color: g.hasTarget ? "inherit" : "#d97706" }}>{g.label}</strong>
                <Button variant="primary" size="sm" onClick={() => sendGroup(g)} disabled={busyKey !== null || selected === 0}>
                  Enviar ({selected})
                </Button>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                {g.templates.map((t) => (
                  <li key={t.id}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!checked[t.id]}
                        onChange={(e) => setChecked((c) => ({ ...c, [t.id]: e.target.checked }))}
                        style={{ marginTop: 4 }}
                      />
                      <span style={{ flex: 1 }}>
                        <Badge tone={t.kind === "question" ? "accent" : "neutral"}>{REQUIREMENT_KIND_LABELS[t.kind] ?? t.kind}</Badge>{" "}
                        <strong>{t.title}</strong>
                        {t.detail && <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{t.detail}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {msg[g.key] && <p style={{ fontSize: 13, marginTop: 8, color: "var(--accent-strong, #54704c)" }}>{msg[g.key]}</p>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
