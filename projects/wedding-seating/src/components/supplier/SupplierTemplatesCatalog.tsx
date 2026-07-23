"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button, Input, Badge } from "@/components/ui";
import { REQUIREMENT_KIND_LABELS } from "@/lib/labels";

interface Template {
  id: string;
  kind: string;
  targetRole: string | null;
  title: string;
  detail: string | null;
}

const TARGET_LABELS: Record<string, string> = { venue: "Quinta", couple: "Noivos" };

/** Supplier-side: manage reusable request/question templates. Sent to a wedding's
 * venue (or couple) from the supplier's per-wedding view. */
export default function SupplierTemplatesCatalog() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [kind, setKind] = useState<"request" | "question">("request");
  const [targetRole, setTargetRole] = useState<"venue" | "couple">("venue");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/supplier/requirement-templates");
    if (res.ok) setTemplates(((await res.json()) as { templates: Template[] }).templates ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/supplier/requirement-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, targetRole, title: title.trim(), detail: detail.trim() || null }),
      });
      if (!res.ok) throw new Error();
      setTitle("");
      setDetail("");
      await load();
    } catch {
      setError("Não foi possível criar o template.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/requirement-templates/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginTop: 20 }}>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Os meus pedidos template</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Pedidos e dúvidas reutilizáveis. Em cada casamento, envia-los à quinta ou aos noivos com um clique.
      </p>

      {templates.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {templates.map((t) => (
            <li key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ flex: "1 1 220px" }}>
                <Badge tone={t.kind === "question" ? "accent" : "neutral"}>{REQUIREMENT_KIND_LABELS[t.kind] ?? t.kind}</Badge>{" "}
                <strong>{t.title}</strong>{" "}
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>→ {TARGET_LABELS[t.targetRole ?? "venue"] ?? "Quinta"}</span>
                {t.detail && <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{t.detail}</span>}
              </span>
              <Button variant="ghost" onClick={() => remove(t.id)} disabled={busy}>Remover</Button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
        <label style={{ fontSize: 13 }}>
          Tipo{" "}
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as "request" | "question")}>
            <option value="request">Pedido</option>
            <option value="question">Dúvida</option>
          </select>
        </label>
        <label style={{ fontSize: 13 }}>
          Para{" "}
          <select className="input" value={targetRole} onChange={(e) => setTargetRole(e.target.value as "venue" | "couple")}>
            <option value="venue">Quinta</option>
            <option value="couple">Noivos</option>
          </select>
        </label>
        <label style={{ fontSize: 13, flex: "1 1 200px" }}>
          Título <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex.: Preciso de acesso 2h antes" style={{ width: "100%" }} />
        </label>
        <Button variant="primary" onClick={add} disabled={busy || !title.trim()}>Adicionar</Button>
      </div>
      <label style={{ fontSize: 13, display: "block", marginTop: 8 }}>
        <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Detalhe (opcional)" style={{ width: "100%" }} />
      </label>
      {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{error}</p>}
    </Card>
  );
}
