"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, Card, Badge, Input, Field } from "@/components/ui";

interface LayoutRow {
  id: string;
  name: string;
  isFinal: boolean;
  floorPlanId: string | null;
  tableCount: number;
  seatedCount: number;
}

interface TemplateRow {
  id: string;
  name: string;
  venueId: string;
  minGuests: number;
  maxGuests: number;
}

export default function LayoutsIndexPage() {
  const params = useParams<{ id: string }>();
  const weddingId = params.id;

  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create-form state.
  const [tplId, setTplId] = useState("");
  const [tplName, setTplName] = useState("");
  const [blankName, setBlankName] = useState("");
  const [blankW, setBlankW] = useState("12");
  const [blankD, setBlankD] = useState("10");

  const loadLayouts = useCallback(async () => {
    const res = await fetch(`/api/weddings/${weddingId}/layouts`);
    if (!res.ok) return;
    const data = (await res.json()) as { layouts: LayoutRow[] };
    setLayouts(data.layouts ?? []);
  }, [weddingId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Wedding venueId (to filter the template picker) + templates + layouts.
      const [wRes, tRes] = await Promise.all([
        fetch("/api/weddings"),
        fetch("/api/templates"),
      ]);
      if (!cancelled && wRes.ok) {
        const all = (await wRes.json()) as { id: string; venueId: string | null }[];
        setVenueId(all.find((w) => w.id === weddingId)?.venueId ?? null);
      }
      if (!cancelled && tRes.ok) {
        setTemplates(((await tRes.json()) as TemplateRow[]) ?? []);
      }
      await loadLayouts();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load on mount
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [weddingId, loadLayouts]);

  const venueTemplates = templates.filter((t) => venueId && t.venueId === venueId);

  async function post(body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/layouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(b?.error ?? "erro");
      }
      await loadLayouts();
      setTplId("");
      setTplName("");
      setBlankName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar o layout.");
    } finally {
      setBusy(false);
    }
  }

  function createFromTemplate() {
    if (!tplId) return;
    void post({ source: "template", templateId: tplId, name: tplName.trim() || undefined });
  }

  function createBlank() {
    const width = Number(blankW);
    const depth = Number(blankD);
    if (!(width > 0 && depth > 0)) {
      setError("Indica comprimento e largura válidos (metros).");
      return;
    }
    void post({ source: "blank", name: blankName.trim() || "Nova sala", width, depth, scale: 50 });
  }

  async function markFinal(id: string) {
    setBusy(true);
    await fetch(`/api/weddings/${weddingId}/layouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFinal: true }),
    });
    await loadLayouts();
    setBusy(false);
  }

  async function rename(id: string, current: string) {
    const name = window.prompt("Novo nome do layout:", current);
    if (name == null || !name.trim()) return;
    setBusy(true);
    await fetch(`/api/weddings/${weddingId}/layouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    await loadLayouts();
    setBusy(false);
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Apagar o layout "${name}"? A sentada deste layout perde-se.`)) return;
    setBusy(true);
    await fetch(`/api/weddings/${weddingId}/layouts/${id}`, { method: "DELETE" });
    await loadLayouts();
    setBusy(false);
  }

  return (
    <div>
      <h2>Layouts da sala</h2>
      <p style={{ color: "var(--text-muted)", maxWidth: 640 }}>
        Cria uma ou mais disposições de mesas. Cada layout tem a sua própria sentada, e podes marcar
        um como <strong>final</strong> — é esse que a quinta vê e que sai na visão geral e no PDF.
      </p>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      {loading && <p style={{ color: "var(--text-muted)" }}>A carregar…</p>}

      {/* Existing layouts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "16px 0" }}>
        {layouts.map((l) => (
          <Card key={l.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 220px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: 16 }}>{l.name}</strong>
                  {l.isFinal && <Badge tone="accent">Final</Badge>}
                  {l.floorPlanId ? (
                    <Badge tone="neutral">Do template</Badge>
                  ) : (
                    <Badge tone="neutral">Sala em branco</Badge>
                  )}
                </div>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {l.tableCount} mesa{l.tableCount === 1 ? "" : "s"} · {l.seatedCount} sentado
                  {l.seatedCount === 1 ? "" : "s"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href={`/admin/wedding/${weddingId}/plan/${l.id}`}>
                  <Button variant="primary">Abrir</Button>
                </Link>
                {!l.isFinal && (
                  <Button variant="secondary" onClick={() => markFinal(l.id)} disabled={busy}>
                    Marcar final
                  </Button>
                )}
                <Button variant="ghost" onClick={() => rename(l.id, l.name)} disabled={busy}>
                  Renomear
                </Button>
                <Button variant="ghost" onClick={() => remove(l.id, l.name)} disabled={busy}>
                  Apagar
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {!loading && layouts.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>Ainda não há layouts. Cria o primeiro abaixo.</p>
        )}
      </div>

      {/* Create new */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>A partir de um template</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>
            Copia as mesas de um arranjo da quinta. Depois podes adicionar ou remover mesas.
          </p>
          {venueTemplates.length === 0 ? (
            <p style={{ fontSize: 13 }}>Sem templates disponíveis para a tua quinta.</p>
          ) : (
            <>
              <Field label="Template">
                <select className="input" value={tplId} onChange={(e) => setTplId(e.target.value)}>
                  <option value="">Escolhe…</option>
                  {venueTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.minGuests}–{t.maxGuests} convidados)
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nome (opcional)">
                <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="ex.: Plano A" />
              </Field>
              <Button variant="primary" onClick={createFromTemplate} disabled={busy || !tplId}>
                Criar layout
              </Button>
            </>
          )}
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>Sala em branco</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>
            Define o tamanho da sala (metros) e adiciona tu as mesas — sem planta.
          </p>
          <Field label="Nome (opcional)">
            <Input value={blankName} onChange={(e) => setBlankName(e.target.value)} placeholder="ex.: Salão" />
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Comprimento (m)">
              <Input type="number" min="1" value={blankW} onChange={(e) => setBlankW(e.target.value)} />
            </Field>
            <Field label="Largura (m)">
              <Input type="number" min="1" value={blankD} onChange={(e) => setBlankD(e.target.value)} />
            </Field>
          </div>
          <Button variant="primary" onClick={createBlank} disabled={busy}>
            Criar layout
          </Button>
        </Card>
      </div>
    </div>
  );
}
