"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button, Input, Badge } from "@/components/ui";
import { SERVICE_KIND_LABELS, REQUIREMENT_KIND_LABELS } from "@/lib/labels";

interface ReqData { tables?: number; linearMeters?: number; time?: string }
interface Template {
  id: string;
  kind: string;
  service: string | null;
  title: string;
  detail: string | null;
  data: ReqData | null;
}

const SERVICES = ["catering", "dj", "band", "photo", "video", "decor", "flowers", "cake", "transport", "other"];

function targetLabel(service: string | null): string {
  return service ? SERVICE_KIND_LABELS[service] ?? service : "Noivos";
}

/** Venue-side: manage reusable request/instruction templates. Sent to a wedding's
 * suppliers from the per-wedding view. */
export default function RequirementTemplatesCatalog({ venueId }: { venueId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [kind, setKind] = useState<"request" | "question">("request");
  const [service, setService] = useState("catering");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/venues/${venueId}/requirement-templates`);
    if (res.ok) setTemplates(((await res.json()) as { templates: Template[] }).templates ?? []);
  }, [venueId]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/venues/${venueId}/requirement-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, service: service === "couple" ? null : service, title: title.trim(), detail: detail.trim() || null }),
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
    <Card>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Pedidos template</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Instruções e pedidos reutilizáveis. Em cada casamento, envia-los aos fornecedores certos com um clique.
      </p>

      {templates.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {templates.map((t) => (
            <li key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ flex: "1 1 220px" }}>
                <Badge tone={t.kind === "question" ? "accent" : "neutral"}>{REQUIREMENT_KIND_LABELS[t.kind] ?? t.kind}</Badge>{" "}
                <strong>{t.title}</strong>{" "}
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>→ {targetLabel(t.service)}</span>
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
          <select className="input" value={service} onChange={(e) => setService(e.target.value)}>
            {SERVICES.map((s) => <option key={s} value={s}>{SERVICE_KIND_LABELS[s] ?? s}</option>)}
            <option value="couple">Noivos</option>
          </select>
        </label>
        <label style={{ fontSize: 13, flex: "1 1 200px" }}>
          Título <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex.: Confirmar nº de mesas + metros lineares" style={{ width: "100%" }} />
        </label>
        <Button variant="primary" onClick={add} disabled={busy || !title.trim()}>Adicionar</Button>
      </div>
      <label style={{ fontSize: 13, display: "block", marginTop: 8 }}>
        <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Detalhe / instrução (opcional)" style={{ width: "100%" }} />
      </label>
      {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{error}</p>}
    </Card>
  );
}
