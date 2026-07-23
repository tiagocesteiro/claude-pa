"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Button, Input } from "@/components/ui";
import { imageUrlFor } from "@/lib/images";

interface Space {
  id: string;
  name: string;
  image: string | null;
}

/** Venue-side: a reusable library of space/area photos. Each wedding's moments
 * pick one as their hero image in the overview. */
export default function VenueSpacesCatalog({ venueId }: { venueId: string }) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/venues/${venueId}/spaces`);
    if (res.ok) setSpaces(((await res.json()) as { spaces: Space[] }).spaces ?? []);
  }, [venueId]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/venues/${venueId}/spaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      setName("");
      await load();
    } catch {
      setError("Não foi possível adicionar o espaço.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(id: string, file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await fetch(`/api/spaces/${id}/image`, { method: "POST", body: fd });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/spaces/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Espaços da quinta</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Fotos das tuas zonas (jardim, salão, terraço…). Em cada casamento, atribui uma a cada momento — aparece no resumo.
      </p>

      {spaces.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 12px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {spaces.map((s) => (
            <li key={s.id} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              {s.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrlFor(s.image)} alt={s.name} style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ height: 110, background: "var(--surface-2, rgba(0,0,0,0.04))", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
                  sem foto
                </div>
              )}
              <div style={{ padding: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input
                    ref={(el) => { fileInputs.current[s.id] = el; }}
                    type="file" accept="image/*" style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(s.id, f); }}
                  />
                  <Button variant="ghost" size="sm" onClick={() => fileInputs.current[s.id]?.click()} disabled={busy}>{s.image ? "Trocar foto" : "Foto"}</Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(s.id)} disabled={busy}>Remover</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
        <label style={{ fontSize: 13, flex: "1 1 220px" }}>Nome do espaço <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Jardim da cerimónia" style={{ width: "100%" }} /></label>
        <Button variant="primary" onClick={add} disabled={busy || !name.trim()}>Adicionar</Button>
      </div>
      {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{error}</p>}
    </Card>
  );
}
