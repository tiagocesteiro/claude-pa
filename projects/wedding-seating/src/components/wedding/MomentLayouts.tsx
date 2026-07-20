"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Badge, Input, Field } from "@/components/ui";
import { imageUrlFor } from "@/lib/images";

/** Client-safe parse of a template's photos JSON column → string[]. */
function parsePhotos(json: string | null): string[] {
  if (!json) return [];
  try {
    const p = JSON.parse(json);
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

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
  photos: string | null;
}

/** The layouts of ONE moment — create (from a venue template or a blank room),
 * mark final, rename, delete, open in the editor. `hasSeating` only changes the
 * copy shown (whether "sentados" is meaningful). */
export default function MomentLayouts({
  weddingId,
  momentId,
  hasSeating,
}: {
  weddingId: string;
  momentId: string;
  hasSeating: boolean;
}) {
  const [layouts, setLayouts] = useState<LayoutRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tplId, setTplId] = useState("");
  const [tplName, setTplName] = useState("");
  const [blankName, setBlankName] = useState("");
  const [blankW, setBlankW] = useState("12");
  const [blankD, setBlankD] = useState("10");

  const loadLayouts = useCallback(async () => {
    const res = await fetch(`/api/moments/${momentId}/layouts`);
    if (!res.ok) return;
    setLayouts(((await res.json()) as { layouts: LayoutRow[] }).layouts ?? []);
  }, [momentId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [wRes, tRes] = await Promise.all([fetch(`/api/weddings/${weddingId}`), fetch("/api/templates")]);
      if (!cancelled && wRes.ok) setVenueId(((await wRes.json()) as { venueId: string | null }).venueId);
      if (!cancelled && tRes.ok) setTemplates(((await tRes.json()) as TemplateRow[]) ?? []);
      await loadLayouts();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [weddingId, momentId, loadLayouts]);

  const venueTemplates = templates.filter((t) => venueId && t.venueId === venueId);

  async function post(body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/moments/${momentId}/layouts`, {
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

  function createBlank() {
    const width = Number(blankW);
    const depth = Number(blankD);
    if (!(width > 0 && depth > 0)) {
      setError("Indica comprimento e largura válidos (metros).");
      return;
    }
    void post({ source: "blank", name: blankName.trim() || "Nova sala", width, depth, scale: 50 });
  }

  async function patch(id: string, body: unknown) {
    setBusy(true);
    await fetch(`/api/moments/${momentId}/layouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await loadLayouts();
    setBusy(false);
  }

  async function rename(id: string, current: string) {
    const name = window.prompt("Novo nome do layout:", current);
    if (name == null || !name.trim()) return;
    await patch(id, { name: name.trim() });
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Apagar o layout "${name}"?`)) return;
    setBusy(true);
    await fetch(`/api/moments/${momentId}/layouts/${id}`, { method: "DELETE" });
    await loadLayouts();
    setBusy(false);
  }

  return (
    <div>
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      {loading && <p style={{ color: "var(--text-muted)" }}>A carregar…</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "8px 0 16px" }}>
        {layouts.map((l) => (
          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "8px 12px", background: "var(--surface)" }}>
            <div style={{ flex: "1 1 200px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong>{l.name}</strong>
                {l.isFinal && <Badge tone="accent">Final</Badge>}
                <Badge tone="neutral">{l.floorPlanId ? "Do template" : "Sala em branco"}</Badge>
              </div>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {l.tableCount} mesa{l.tableCount === 1 ? "" : "s"}
                {hasSeating ? ` · ${l.seatedCount} sentado${l.seatedCount === 1 ? "" : "s"}` : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Link href={`/admin/wedding/${weddingId}/plan/${l.id}`}>
                <Button variant="primary">Abrir</Button>
              </Link>
              {!l.isFinal && (
                <Button variant="secondary" onClick={() => patch(l.id, { isFinal: true })} disabled={busy}>
                  Marcar final
                </Button>
              )}
              <Button variant="ghost" onClick={() => rename(l.id, l.name)} disabled={busy}>Renomear</Button>
              <Button variant="ghost" onClick={() => remove(l.id, l.name)} disabled={busy}>Apagar</Button>
            </div>
          </div>
        ))}
        {!loading && layouts.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Ainda não há layouts para este momento. Cria um abaixo.</p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <Card pad="sm">
          <strong>A partir de um template</strong>
          {venueTemplates.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sem templates da tua quinta.</p>
          ) : (
            <>
              <Field label="Template">
                <select className="input" value={tplId} onChange={(e) => setTplId(e.target.value)}>
                  <option value="">Escolhe…</option>
                  {venueTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.minGuests}–{t.maxGuests})</option>
                  ))}
                </select>
              </Field>
              {(() => {
                const sel = venueTemplates.find((t) => t.id === tplId);
                const photos = sel ? parsePhotos(sel.photos) : [];
                if (!sel) return null;
                return photos.length > 0 ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {photos.map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p}
                        src={imageUrlFor(p)}
                        alt={sel.name}
                        style={{ width: 110, height: 82, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Sem fotos de exemplo.</p>
                );
              })()}
              <Field label="Nome (opcional)">
                <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="ex.: Plano A" />
              </Field>
              <Button variant="primary" onClick={() => post({ source: "template", templateId: tplId, name: tplName.trim() || undefined })} disabled={busy || !tplId}>
                Criar layout
              </Button>
            </>
          )}
        </Card>

        <Card pad="sm">
          <strong>Sala em branco</strong>
          <Field label="Nome (opcional)">
            <Input value={blankName} onChange={(e) => setBlankName(e.target.value)} placeholder="ex.: Salão" />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Comprimento (m)">
              <Input type="number" min="1" value={blankW} onChange={(e) => setBlankW(e.target.value)} />
            </Field>
            <Field label="Largura (m)">
              <Input type="number" min="1" value={blankD} onChange={(e) => setBlankD(e.target.value)} />
            </Field>
          </div>
          <Button variant="primary" onClick={createBlank} disabled={busy}>Criar layout</Button>
        </Card>
      </div>
    </div>
  );
}
