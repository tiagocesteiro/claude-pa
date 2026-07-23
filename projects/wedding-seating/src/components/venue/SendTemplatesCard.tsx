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

/** Venue-side: pick from the venue's request templates and send them to this
 * wedding's suppliers (each becomes a requirement). `onSent` refreshes the ledger. */
export default function SendTemplatesCard({ weddingId, onSent }: { weddingId: string; onSent?: () => void }) {
  const [templates, setTemplates] = useState<ResolvedTemplate[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/weddings/${weddingId}/requirement-templates`);
    if (res.ok) setTemplates(((await res.json()) as { templates: ResolvedTemplate[] }).templates ?? []);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedIds = Object.entries(checked).filter(([, v]) => v).map(([k]) => k);

  async function send() {
    if (selectedIds.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/requirement-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateIds: selectedIds }),
      });
      if (!res.ok) throw new Error();
      const { created } = (await res.json()) as { created: number };
      setChecked({});
      setMsg(`Enviado${created === 1 ? "" : "s"} ${created} pedido${created === 1 ? "" : "s"}.`);
      onSent?.();
    } catch {
      setMsg("Não foi possível enviar.");
    } finally {
      setBusy(false);
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

  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Enviar pedidos template</h2>
        <Button variant="primary" size="sm" onClick={send} disabled={busy || selectedIds.length === 0}>
          Enviar selecionados ({selectedIds.length})
        </Button>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>
        Cada template escolhido vira um pedido enviado ao fornecedor correspondente.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
        {templates.map((t) => (
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
                <strong>{t.title}</strong>{" "}
                <span style={{ fontSize: 13, color: t.hasTarget ? "var(--text-muted)" : "#d97706" }}>→ {t.targetLabel}</span>
                {t.detail && <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{t.detail}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {msg && <p style={{ fontSize: 13, marginTop: 8, color: "var(--accent-strong, #54704c)" }}>{msg}</p>}
    </Card>
  );
}
