"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, Card, Badge, Button, Input, Stat } from "@/components/ui";
import WeddingParticipantsCard from "@/components/venue/WeddingParticipantsCard";
import WeddingServicesCard from "@/components/venue/WeddingServicesCard";
import RequirementsPanel from "@/components/requirements/RequirementsPanel";
import DietaryByTableCard from "@/components/catering/DietaryByTableCard";

interface Material {
  id: string;
  name: string;
  quantity: number;
  note: string | null;
}
interface Moment {
  id: string;
  kind: string | null;
  title: string | null;
  startTime: string | null;
  hasSeating: boolean;
  finalLayout: { name: string; tableCount: number; seatedCount: number } | null;
  decor: { name: string; category: string | null; quantity: number }[];
  materials: Material[];
  pendingTasks: { text: string; assignee: string; supplierId: string | null }[];
}
interface View {
  id: string;
  couple: string;
  date: string | null;
  guestEstimate: number | null;
  guests: { total: number; confirmed: number; pending: number; declined: number };
  suppliers: { id: string; name: string }[];
  moments: Moment[];
}

const KIND_LABELS: Record<string, string> = { ceremony: "Cerimónia", cocktail: "Cocktail", dinner: "Jantar", dance: "Dança" };
function momentTitle(m: Moment): string {
  return m.title ?? (m.kind ? KIND_LABELS[m.kind] ?? m.kind : "Momento");
}
function parseHM(s: string | null): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Item label = "categoria - nome" (falls back to the name when no category). */
function decorLabel(d: { name: string; category: string | null }): string {
  return d.category ? `${d.category} - ${d.name}` : d.name;
}

export default function VenueWeddingView({ weddingId }: { weddingId: string }) {
  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMomentId, setActiveMomentId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { name: string; qty: string; note: string }>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/venue/weddings/${weddingId}`);
    if (!res.ok) {
      setError(res.status === 403 || res.status === 404 ? "Sem acesso a este casamento." : "Não foi possível carregar.");
      setLoading(false);
      return;
    }
    setView((await res.json()) as View);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  function draftOf(momentId: string) {
    return drafts[momentId] ?? { name: "", qty: "1", note: "" };
  }
  function setDraft(momentId: string, patch: Partial<{ name: string; qty: string; note: string }>) {
    setDrafts((d) => ({ ...d, [momentId]: { ...draftOf(momentId), ...patch } }));
  }

  async function addMaterial(momentId: string) {
    const d = draftOf(momentId);
    if (!d.name.trim()) return;
    const res = await fetch(`/api/moments/${momentId}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: d.name.trim(), quantity: Number(d.qty) || 1, note: d.note.trim() || null }),
    });
    if (res.ok) {
      setDrafts((prev) => ({ ...prev, [momentId]: { name: "", qty: "1", note: "" } }));
      await load();
    }
  }
  async function removeMaterial(id: string) {
    const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  function assigneeLabel(a: string, supplierId: string | null): string {
    if (a === "couple") return "Noivos";
    if (a === "venue") return "Quinta";
    return view?.suppliers.find((s) => s.id === supplierId)?.name ?? "Fornecedor";
  }

  if (loading) return <PageShell size="lg"><p>A carregar...</p></PageShell>;
  if (!view) return <PageShell size="lg"><p style={{ color: "#dc2626" }}>{error ?? "Não encontrado."}</p></PageShell>;

  // Chronological moments (timed first).
  const moments = [...view.moments].sort((a, b) => {
    const ta = parseHM(a.startTime);
    const tb = parseHM(b.startTime);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return ta - tb;
  });

  // Material summary aggregated across the whole wedding.
  const decorTotals = new Map<string, number>();
  const materialTotals = new Map<string, number>();
  for (const m of view.moments) {
    for (const d of m.decor) decorTotals.set(decorLabel(d), (decorTotals.get(decorLabel(d)) ?? 0) + d.quantity);
    for (const mat of m.materials) materialTotals.set(mat.name, (materialTotals.get(mat.name) ?? 0) + mat.quantity);
  }

  const totalPending = view.moments.reduce((n, m) => n + m.pendingTasks.length, 0);

  return (
    <PageShell size="lg">
      <p style={{ marginBottom: 8 }}>
        <Link href="/admin" style={{ color: "var(--text-muted)" }}>&larr; Início</Link>
      </p>
      <h1 style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        {view.couple}
        <span style={{ fontSize: 15, fontWeight: 400, color: "var(--text-muted)" }}>
          {view.date ? new Date(view.date).toLocaleDateString("pt-PT") : "sem data"}
        </span>
      </h1>

      {/* Overview */}
      <Card style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Visão geral</h2>
        <div className="stat-row" style={{ gap: 20, flexWrap: "wrap" }}>
          <Stat value={view.guests.total} label="Convidados" />
          <Stat value={view.guests.confirmed} label="Confirmados" />
          <Stat value={view.guests.pending} label="Pendentes" />
          {view.guestEstimate != null && <Stat value={view.guestEstimate} label="Estimativa" />}
          <Stat value={totalPending} label="Tarefas pendentes" />
        </div>
      </Card>

      {/* Participants & invites */}
      <WeddingParticipantsCard weddingId={view.id} />

      {/* Services & responsibility matrix */}
      <WeddingServicesCard weddingId={view.id} />

      {/* Interactions ledger (SSOT) */}
      <RequirementsPanel
        weddingId={view.id}
        role="venue"
        moments={moments.map((m) => ({ id: m.id, label: momentTitle(m) }))}
      />

      {/* Dietary aggregate (catering) — renders only when there's a final dinner seating */}
      <DietaryByTableCard weddingId={view.id} />

      {/* Material summary */}
      <Card style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Resumo de material</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>Decoração (escolhida pelos noivos)</h3>
            {decorTotals.size === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem decoração.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {[...decorTotals].map(([name, qty]) => (
                  <li key={name}>{name}{qty > 1 ? ` ×${qty}` : ""}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>Material extra (da quinta)</h3>
            {materialTotals.size === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem material extra.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {[...materialTotals].map(([name, qty]) => (
                  <li key={name}>{name}{qty > 1 ? ` ×${qty}` : ""}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {/* Per moment — one tab per moment */}
      <h2>Momentos</h2>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {moments.map((m) => {
          const active = (activeMomentId ?? moments[0]?.id) === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveMomentId(m.id)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: active ? "var(--accent)" : "var(--surface)",
                color: active ? "#fff" : "var(--text)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                whiteSpace: "nowrap",
              }}
            >
              {momentTitle(m)}
              {m.startTime ? ` · ${m.startTime}` : ""}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {moments
          .filter((m) => (activeMomentId ?? moments[0]?.id) === m.id)
          .map((m) => (
          <Card key={m.id}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>{momentTitle(m)}</h3>
              {m.startTime && <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{m.startTime}</span>}
              {m.finalLayout ? (
                <Badge tone="neutral">
                  {m.finalLayout.name} · {m.finalLayout.tableCount} mesas
                  {m.hasSeating ? ` · ${m.finalLayout.seatedCount} sentados` : ""}
                </Badge>
              ) : (
                <Badge tone="warning">Sem layout final</Badge>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 12 }}>
              <div>
                <h4 style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-muted)" }}>Decoração</h4>
                {m.decor.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 13 }}>—</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                    {m.decor.map((d, i) => <li key={i}>{decorLabel(d)}{d.quantity > 1 ? ` ×${d.quantity}` : ""}</li>)}
                  </ul>
                )}
              </div>
              <div>
                <h4 style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-muted)" }}>Tarefas pendentes</h4>
                {m.pendingTasks.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 13 }}>—</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                    {m.pendingTasks.map((t, i) => (
                      <li key={i}>{t.text} <span style={{ color: "var(--text-muted)" }}>({assigneeLabel(t.assignee, t.supplierId)})</span></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Extra material (venue-only) */}
            <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <h4 style={{ margin: "0 0 6px", fontSize: 13 }}>Material extra <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(só visível à quinta)</span></h4>
              {m.materials.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 8px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {m.materials.map((mat) => (
                    <li key={mat.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <span style={{ flex: 1 }}>
                        {mat.name}{mat.quantity > 1 ? ` ×${mat.quantity}` : ""}
                        {mat.note && <span style={{ color: "var(--text-muted)" }}> · {mat.note}</span>}
                      </span>
                      <Button variant="ghost" onClick={() => removeMaterial(mat.id)}>Remover</Button>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
                <label style={{ fontSize: 13 }}>Material <Input value={draftOf(m.id).name} onChange={(e) => setDraft(m.id, { name: e.target.value })} placeholder="ex.: Tomadas triplas" style={{ width: 180 }} /></label>
                <label style={{ fontSize: 13 }}>Qtd <Input type="number" min="1" value={draftOf(m.id).qty} onChange={(e) => setDraft(m.id, { qty: e.target.value })} style={{ width: 64 }} /></label>
                <label style={{ fontSize: 13 }}>Nota <Input value={draftOf(m.id).note} onChange={(e) => setDraft(m.id, { note: e.target.value })} placeholder="opcional" style={{ width: 150 }} /></label>
                <Button variant="secondary" onClick={() => addMaterial(m.id)} disabled={!draftOf(m.id).name.trim()}>Adicionar</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
