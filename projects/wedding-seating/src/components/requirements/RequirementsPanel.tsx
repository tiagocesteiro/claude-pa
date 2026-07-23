"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button, Input, Badge } from "@/components/ui";
import { REQUIREMENT_KIND_LABELS, requirementStatusLabel } from "@/lib/labels";

interface Comment {
  id: string;
  authorRole: string;
  text: string;
  createdAt: string;
}
interface ReqData {
  tables?: number;
  linearMeters?: number;
  time?: string;
}
interface Requirement {
  id: string;
  title: string;
  kind: string; // request | question
  detail: string | null;
  data: ReqData | null;
  status: string; // open | agreed | done
  fromRole: string;
  toRole: string | null;
  toSupplierId: string | null;
  canAgree: boolean;
  agreedByRole: string | null;
  agreedAt: string | null;
  service: { kind: string; name: string | null } | null;
  moment: { title: string | null; kind: string | null } | null;
  comments: Comment[];
  createdAt: string;
}

/** Render the structured fields as short chips ("8 mesas", "12 m", "19:00"). */
function dataChips(d: ReqData | null): string[] {
  if (!d) return [];
  const out: string[] = [];
  if (typeof d.tables === "number") out.push(`${d.tables} mesas`);
  if (typeof d.linearMeters === "number") out.push(`${d.linearMeters} m lineares`);
  if (d.time) out.push(d.time);
  return out;
}

const KIND_LABELS: Record<string, string> = {
  catering: "Catering", dj: "DJ", band: "Banda", photo: "Fotografia", video: "Vídeo",
  decor: "Decoração", flowers: "Flores", cake: "Bolo", transport: "Transporte", other: "Outro",
  ceremony: "Cerimónia", cocktail: "Cocktail", dinner: "Jantar", dance: "Dança",
};
const ROLE_LABELS: Record<string, string> = { venue: "Quinta", couple: "Noivos", supplier: "Fornecedor" };
function serviceLabel(kind: string, name: string | null): string {
  return name ?? KIND_LABELS[kind] ?? kind;
}
function momentLabel(m: { title: string | null; kind: string | null }): string {
  return m.title ?? (m.kind ? KIND_LABELS[m.kind] ?? m.kind : "Momento");
}

interface SupplierRow { id: string; name: string; }

/**
 * The interactions ledger UI, shared by the venue inbox and the supplier portal.
 * Any participant can raise a requirement, reply, and (when involved) move its
 * status open → agreed → done. The venue additionally picks the target (a
 * supplier slot or the couple); a supplier's requirement defaults to the venue.
 */
export default function RequirementsPanel({
  weddingId,
  role,
  moments = [],
  title = "Requisitos & pedidos",
  reloadKey = 0,
}: {
  weddingId: string;
  role: "venue" | "supplier" | "couple";
  moments?: { id: string; label: string }[];
  title?: string;
  reloadKey?: number;
}) {
  const [items, setItems] = useState<Requirement[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New-requirement form
  const [nKind, setNKind] = useState<"request" | "question">("request");
  const [nTitle, setNTitle] = useState("");
  const [nDetail, setNDetail] = useState("");
  const [nTarget, setNTarget] = useState(""); // venue only: "" | "couple" | supplierId
  const [nMoment, setNMoment] = useState("");
  const [nTables, setNTables] = useState("");
  const [nMeters, setNMeters] = useState("");
  const [nTime, setNTime] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/weddings/${weddingId}/requirements`);
    if (res.ok) setItems(((await res.json()) as { requirements: Requirement[] }).requirements ?? []);
    if (role === "venue") {
      const sr = await fetch(`/api/weddings/${weddingId}/suppliers`);
      if (sr.ok) setSuppliers(((await sr.json()) as { suppliers: SupplierRow[] }).suppliers ?? []);
    }
  }, [weddingId, role]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  function supplierName(id: string | null): string {
    return suppliers.find((s) => s.id === id)?.name ?? "Fornecedor";
  }
  function toLabel(r: Requirement): string {
    if (r.toSupplierId) return supplierName(r.toSupplierId);
    if (r.toRole) return ROLE_LABELS[r.toRole] ?? r.toRole;
    return "—";
  }

  async function create() {
    if (!nTitle.trim()) return;
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = { title: nTitle.trim(), detail: nDetail.trim() || null, kind: nKind };
    if (nMoment) body.momentId = nMoment;
    if (role === "venue" && nTarget) {
      if (nTarget === "couple") body.toRole = "couple";
      else body.toSupplierId = nTarget;
    }
    const data: Record<string, unknown> = {};
    if (nTables.trim()) data.tables = Number(nTables);
    if (nMeters.trim()) data.linearMeters = Number(nMeters);
    if (nTime.trim()) data.time = nTime.trim();
    if (Object.keys(data).length > 0) body.data = data;
    try {
      const res = await fetch(`/api/weddings/${weddingId}/requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setNTitle("");
      setNDetail("");
      setNTarget("");
      setNMoment("");
      setNTables("");
      setNMeters("");
      setNTime("");
      await load();
    } catch {
      setError("Não foi possível criar o requisito.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/requirements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) await load();
      else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error || "Não foi possível atualizar o estado.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/requirements/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(id: string) {
    const text = (reply[id] ?? "").trim();
    if (!text) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/requirements/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        setReply((r) => ({ ...r, [id]: "" }));
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>{title}</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        {role === "supplier"
          ? "Indica à quinta o que precisas (pedido) ou coloca uma dúvida. Segue o estado até ficar resolvido."
          : "Pedidos e dúvidas entre a quinta, os noivos e os fornecedores — a fonte única da verdade."}
      </p>

      {/* New requirement */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginBottom: 14 }}>
        <label style={{ fontSize: 13 }}>
          Tipo{" "}
          <select className="input" value={nKind} onChange={(e) => setNKind(e.target.value as "request" | "question")}>
            <option value="request">Pedido</option>
            <option value="question">Dúvida</option>
          </select>
        </label>
        <label style={{ fontSize: 13, flex: "1 1 200px" }}>
          {nKind === "question" ? "Dúvida" : "Pedido"} <Input value={nTitle} onChange={(e) => setNTitle(e.target.value)} placeholder={nKind === "question" ? "ex.: a quinta fornece toalhas?" : "ex.: 8 mesas + 12 m lineares"} style={{ width: "100%" }} />
        </label>
        {role === "venue" && (
          <label style={{ fontSize: 13 }}>
            Para{" "}
            <select className="input" value={nTarget} onChange={(e) => setNTarget(e.target.value)}>
              <option value="">— destinatário —</option>
              <option value="couple">Noivos</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
        {moments.length > 0 && (
          <label style={{ fontSize: 13 }}>
            Momento{" "}
            <select className="input" value={nMoment} onChange={(e) => setNMoment(e.target.value)}>
              <option value="">— (opcional) —</option>
              {moments.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
        )}
        <Button variant="primary" onClick={create} disabled={busy || !nTitle.trim()}>Criar</Button>
      </div>
      {nKind === "request" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginBottom: 10 }}>
          <label style={{ fontSize: 13 }}>Nº mesas <Input type="number" min="0" value={nTables} onChange={(e) => setNTables(e.target.value)} placeholder="—" style={{ width: 80 }} /></label>
          <label style={{ fontSize: 13 }}>Metros lineares <Input type="number" min="0" value={nMeters} onChange={(e) => setNMeters(e.target.value)} placeholder="—" style={{ width: 90 }} /></label>
          <label style={{ fontSize: 13 }}>Hora <Input type="time" value={nTime} onChange={(e) => setNTime(e.target.value)} style={{ width: 110 }} /></label>
        </div>
      )}
      <label style={{ fontSize: 13, display: "block", marginBottom: 14 }}>
        <Input value={nDetail} onChange={(e) => setNDetail(e.target.value)} placeholder="Detalhe (opcional)" style={{ width: "100%" }} />
      </label>
      {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}

      {items.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem requisitos ainda.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((r) => {
            const statusTone = r.status === "done" ? "success" : r.status === "agreed" ? "neutral" : "warning";
            const statusLabel = requirementStatusLabel(r.kind, r.status);
            return (
              <li key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <Badge tone={r.kind === "question" ? "accent" : "neutral"}>{REQUIREMENT_KIND_LABELS[r.kind] ?? r.kind}</Badge>
                  <strong style={{ flex: "1 1 auto" }}>{r.title}</strong>
                  <Badge tone={statusTone}>{statusLabel}</Badge>
                  {r.status === "agreed" && r.agreedByRole && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      por {ROLE_LABELS[r.agreedByRole] ?? r.agreedByRole}
                      {r.agreedAt ? ` · ${new Date(r.agreedAt).toLocaleDateString("pt-PT")}` : ""}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {ROLE_LABELS[r.fromRole] ?? r.fromRole} → {toLabel(r)}
                  {r.service ? ` · ${serviceLabel(r.service.kind, r.service.name)}` : ""}
                  {r.moment ? ` · ${momentLabel(r.moment)}` : ""}
                </div>
                {dataChips(r.data).length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {dataChips(r.data).map((c) => <Badge key={c} tone="neutral">{c}</Badge>)}
                  </div>
                )}
                {r.detail && <p style={{ margin: "6px 0 0", fontSize: 13 }}>{r.detail}</p>}

                {/* Thread */}
                {r.comments.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 4 }}>
                    {r.comments.map((c) => (
                      <li key={c.id} style={{ fontSize: 13, background: "var(--surface-2, rgba(0,0,0,0.03))", borderRadius: 6, padding: "4px 8px" }}>
                        <strong style={{ fontSize: 12, color: "var(--text-muted)" }}>{ROLE_LABELS[c.authorRole] ?? c.authorRole}:</strong> {c.text}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Actions — handshake: only the counterpart may confirm ("acordar") */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                  {r.status === "open" && r.canAgree && (
                    <Button variant="primary" size="sm" onClick={() => setStatus(r.id, "agreed")} disabled={busy}>Confirmar acordo</Button>
                  )}
                  {r.status !== "done" && (
                    <Button variant="secondary" size="sm" onClick={() => setStatus(r.id, "done")} disabled={busy}>
                      {r.kind === "question" ? "Marcar resolvida" : "Marcar feito"}
                    </Button>
                  )}
                  {r.status !== "open" && (
                    <Button variant="ghost" size="sm" onClick={() => setStatus(r.id, "open")} disabled={busy}>Reabrir</Button>
                  )}
                  <Input
                    value={reply[r.id] ?? ""}
                    onChange={(e) => setReply((x) => ({ ...x, [r.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") sendReply(r.id); }}
                    placeholder="Responder…"
                    style={{ flex: "1 1 160px" }}
                  />
                  <Button variant="secondary" size="sm" onClick={() => sendReply(r.id)} disabled={busy || !(reply[r.id] ?? "").trim()}>Responder</Button>
                  {role === "venue" && <Button variant="ghost" onClick={() => remove(r.id)} disabled={busy}>Remover</Button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
