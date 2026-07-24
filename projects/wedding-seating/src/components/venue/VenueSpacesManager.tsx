"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Badge } from "@/components/ui";
import { imageUrlFor } from "@/lib/images";

interface Space { id: string; name: string; image: string | null; }
interface FloorPlan { id: string; venueId: string; spaceId: string | null; name: string | null; image: string; }
interface Template { id: string; venueId: string; spaceId: string | null; name: string; }

/** The Espaços hub: the venue defines each space (photo), its 2D floor plans, and
 * its layout templates — all nested under the space. A wedding then just picks a
 * space + a template per moment. */
export default function VenueSpacesManager({ venueId }: { venueId: string }) {
  const router = useRouter();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    const [sp, fp, tp] = await Promise.all([
      fetch(`/api/venues/${venueId}/spaces`),
      fetch(`/api/floorplans`),
      fetch(`/api/venues/${venueId}/templates`),
    ]);
    if (sp.ok) setSpaces(((await sp.json()) as { spaces: Space[] }).spaces ?? []);
    if (fp.ok) setFloorPlans(((await fp.json()) as FloorPlan[]).filter((x) => x.venueId === venueId));
    if (tp.ok) setTemplates((await tp.json()) as Template[]);
  }, [venueId]);

  useEffect(() => { load(); }, [load]);

  async function addSpace() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/spaces`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) { setName(""); await load(); }
    } finally { setBusy(false); }
  }
  async function uploadPhoto(spaceId: string, file: File) {
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      await fetch(`/api/spaces/${spaceId}/image`, { method: "POST", body: fd });
      await load();
    } finally { setBusy(false); }
  }
  async function removeSpace(spaceId: string, label: string) {
    if (!window.confirm(`Remover o espaço «${label}»? As plantas e templates ficam sem espaço.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/spaces/${spaceId}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally { setBusy(false); }
  }
  async function newFloorPlan(spaceId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/floorplans`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, spaceId, image: "", scale: 0, width: 0, depth: 0, name: null }),
      });
      if (res.ok) { const fp = await res.json(); router.push(`/admin/floorplan/${fp.id}`); }
    } finally { setBusy(false); }
  }
  async function assignPlan(planId: string, spaceId: string) {
    if (!spaceId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/floorplans/${planId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spaceId }) });
      if (res.ok) await load();
    } finally { setBusy(false); }
  }
  async function assignTemplate(templateId: string, spaceId: string) {
    if (!spaceId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/templates/${templateId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spaceId }) });
      if (res.ok) await load();
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <h2 style={{ marginTop: 0, marginBottom: 4 }}>Espaços da quinta</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
          Cada espaço tem uma foto, plantas 2D e templates de layout. Nos casamentos, atribui um espaço (e um template) a cada momento.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <label style={{ fontSize: 13, flex: "1 1 220px" }}>Novo espaço <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Jardim da cerimónia" style={{ width: "100%" }} onKeyDown={(e) => { if (e.key === "Enter") addSpace(); }} /></label>
          <Button variant="primary" onClick={addSpace} disabled={busy || !name.trim()}>Adicionar</Button>
        </div>
      </Card>

      {spaces.map((s) => {
        const plans = floorPlans.filter((f) => f.spaceId === s.id);
        const tpls = templates.filter((t) => t.spaceId === s.id);
        return (
          <Card key={s.id}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div style={{ width: 200, flexShrink: 0 }}>
                {s.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrlFor(s.image)} alt={s.name} style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 10, display: "block" }} />
                ) : (
                  <div style={{ height: 130, borderRadius: 10, background: "var(--surface-2, rgba(0,0,0,0.04))", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>sem foto</div>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input ref={(el) => { fileInputs.current[s.id] = el; }} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(s.id, f); }} />
                  <Button variant="ghost" size="sm" onClick={() => fileInputs.current[s.id]?.click()} disabled={busy}>{s.image ? "Trocar foto" : "Foto"}</Button>
                  <Button variant="ghost" size="sm" onClick={() => removeSpace(s.id, s.name)} disabled={busy}>Remover</Button>
                </div>
              </div>

              <div style={{ flex: "1 1 320px", minWidth: 260 }}>
                <h3 style={{ margin: "0 0 8px" }}>{s.name}</h3>

                {/* Plantas 2D */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ fontSize: 13 }}>Plantas 2D</strong>
                    <Button variant="secondary" size="sm" onClick={() => newFloorPlan(s.id)} disabled={busy}>+ Nova planta</Button>
                  </div>
                  {plans.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "4px 0 0" }}>Sem plantas.</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0", display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {plans.map((p) => (
                        <li key={p.id}>
                          <Link href={`/admin/floorplan/${p.id}`} style={{ fontSize: 13 }}>
                            <Badge tone="neutral">{p.name || "Planta"}{!p.image ? " (por desenhar)" : ""}</Badge>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Templates */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ fontSize: 13 }}>Templates de layout</strong>
                    <Link href={`/admin/venue/${venueId}/templates?space=${s.id}`} style={{ fontSize: 13 }}>Gerir templates →</Link>
                  </div>
                  {tpls.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "4px 0 0" }}>Sem templates.</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0", display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {tpls.map((t) => <li key={t.id}><Badge tone="neutral">{t.name}</Badge></li>)}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Recover pre-existing plantas/templates that have no space yet */}
      {(() => {
        const orphanPlans = floorPlans.filter((f) => !f.spaceId);
        const orphanTemplates = templates.filter((t) => !t.spaceId);
        if (orphanPlans.length === 0 && orphanTemplates.length === 0) return null;
        return (
          <Card>
            <h3 style={{ marginTop: 0, marginBottom: 4 }}>Sem espaço (antigos)</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
              Plantas e templates que criaste antes dos espaços. Atribui cada um ao seu espaço para os recuperares.
            </p>
            {orphanPlans.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <strong style={{ fontSize: 13 }}>Plantas 2D</strong>
                <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                  {orphanPlans.map((p) => (
                    <li key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Link href={`/admin/floorplan/${p.id}`} style={{ flex: "1 1 160px", fontSize: 13 }}>{p.name || "Planta"}{!p.image ? " (por desenhar)" : ""}</Link>
                      <select className="input" defaultValue="" onChange={(e) => assignPlan(p.id, e.target.value)} disabled={busy} style={{ width: 180 }}>
                        <option value="">— atribuir a espaço —</option>
                        {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {orphanTemplates.length > 0 && (
              <div>
                <strong style={{ fontSize: 13 }}>Templates de layout</strong>
                <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                  {orphanTemplates.map((t) => (
                    <li key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ flex: "1 1 160px", fontSize: 13 }}>{t.name}</span>
                      <select className="input" defaultValue="" onChange={(e) => assignTemplate(t.id, e.target.value)} disabled={busy} style={{ width: 180 }}>
                        <option value="">— atribuir a espaço —</option>
                        {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        );
      })()}
    </div>
  );
}
