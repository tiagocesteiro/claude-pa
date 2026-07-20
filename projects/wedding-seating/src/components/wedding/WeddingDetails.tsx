"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input } from "@/components/ui";

interface Venue {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
  service: string | null;
  contact: string | null;
}

interface WeddingDetail {
  id: string;
  couple: string;
  date: string | null;
  venueId: string | null;
  partner1: string | null;
  partner1Email: string | null;
  partner1Phone: string | null;
  partner2: string | null;
  partner2Email: string | null;
  partner2Phone: string | null;
  guestEstimate: number | null;
  notes: string | null;
}

const label: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 13,
  color: "var(--text-muted)",
};

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export default function WeddingDetails({ weddingId }: { weddingId: string }) {
  const [wedding, setWedding] = useState<WeddingDetail | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [couple, setCouple] = useState("");
  const [date, setDate] = useState("");
  const [venueId, setVenueId] = useState("");
  const [partner1, setPartner1] = useState("");
  const [partner1Email, setPartner1Email] = useState("");
  const [partner1Phone, setPartner1Phone] = useState("");
  const [partner2, setPartner2] = useState("");
  const [partner2Email, setPartner2Email] = useState("");
  const [partner2Phone, setPartner2Phone] = useState("");
  const [guestEstimate, setGuestEstimate] = useState("");
  const [notes, setNotes] = useState("");

  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supName, setSupName] = useState("");
  const [supService, setSupService] = useState("");
  const [supContact, setSupContact] = useState("");

  const loadWedding = useCallback(async () => {
    const res = await fetch(`/api/weddings/${weddingId}`);
    if (!res.ok) {
      setError("Não foi possível carregar o casamento.");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as WeddingDetail;
    setWedding(data);
    setCouple(data.couple ?? "");
    setDate(toDateInputValue(data.date));
    setVenueId(data.venueId ?? "");
    setPartner1(data.partner1 ?? "");
    setPartner1Email(data.partner1Email ?? "");
    setPartner1Phone(data.partner1Phone ?? "");
    setPartner2(data.partner2 ?? "");
    setPartner2Email(data.partner2Email ?? "");
    setPartner2Phone(data.partner2Phone ?? "");
    setGuestEstimate(data.guestEstimate == null ? "" : String(data.guestEstimate));
    setNotes(data.notes ?? "");
    setLoading(false);
  }, [weddingId]);

  const loadSuppliers = useCallback(async () => {
    const res = await fetch(`/api/weddings/${weddingId}/suppliers`);
    if (res.ok) setSuppliers(((await res.json()) as { suppliers: Supplier[] }).suppliers ?? []);
  }, [weddingId]);

  useEffect(() => {
    loadWedding();
    loadSuppliers();
    (async () => {
      const res = await fetch("/api/venues");
      if (res.ok) setVenues((await res.json()) as Venue[]);
    })();
  }, [loadWedding, loadSuppliers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/weddings/${weddingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couple,
          date: date || null,
          venueId: venueId || null,
          partner1: partner1 || null,
          partner1Email: partner1Email || null,
          partner1Phone: partner1Phone || null,
          partner2: partner2 || null,
          partner2Email: partner2Email || null,
          partner2Phone: partner2Phone || null,
          guestEstimate: guestEstimate === "" ? null : Number(guestEstimate),
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        setError("Falha ao guardar. Tenta novamente.");
        return;
      }
      await loadWedding();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function addSupplier() {
    if (!supName.trim()) return;
    const res = await fetch(`/api/weddings/${weddingId}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: supName.trim(), service: supService.trim() || null, contact: supContact.trim() || null }),
    });
    if (res.ok) {
      setSupName("");
      setSupService("");
      setSupContact("");
      await loadSuppliers();
    }
  }

  async function removeSupplier(id: string) {
    const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    if (res.ok) await loadSuppliers();
  }

  if (loading) return <p>A carregar...</p>;
  if (!wedding) return <p style={{ color: "#dc2626" }}>{error ?? "Casamento não encontrado."}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <label style={label}>
            Casal
            <input value={couple} onChange={(e) => setCouple(e.target.value)} required />
          </label>
          <label style={label}>
            Data
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label style={label}>
            Quinta
            <select value={venueId} onChange={(e) => setVenueId(e.target.value)}>
              <option value="">Sem quinta</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </label>
          <label style={label}>
            Nº estimado de convidados
            <input type="number" min={0} value={guestEstimate} onChange={(e) => setGuestEstimate(e.target.value)} />
          </label>
          <label style={label}>
            Parceiro 1 — nome
            <input value={partner1} onChange={(e) => setPartner1(e.target.value)} />
          </label>
          <label style={label}>
            Parceiro 2 — nome
            <input value={partner2} onChange={(e) => setPartner2(e.target.value)} />
          </label>
          <label style={label}>
            Parceiro 1 — email
            <input type="email" value={partner1Email} onChange={(e) => setPartner1Email(e.target.value)} />
          </label>
          <label style={label}>
            Parceiro 2 — email
            <input type="email" value={partner2Email} onChange={(e) => setPartner2Email(e.target.value)} />
          </label>
          <label style={label}>
            Parceiro 1 — telefone
            <input value={partner1Phone} onChange={(e) => setPartner1Phone(e.target.value)} />
          </label>
          <label style={label}>
            Parceiro 2 — telefone
            <input value={partner2Phone} onChange={(e) => setPartner2Phone(e.target.value)} />
          </label>
        </div>

        <label style={{ ...label, marginBottom: 16 }}>
          Notas
          <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: "vertical" }} />
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="submit" disabled={saving}>{saving ? "A guardar..." : "Guardar"}</button>
          {saved && <span style={{ color: "var(--accent)" }}>Guardado.</span>}
          {error && <span style={{ color: "#dc2626" }}>{error}</span>}
        </div>
      </form>

      {/* Suppliers */}
      <Card>
        <h2 style={{ marginTop: 0 }}>Fornecedores</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
          Adiciona os fornecedores do casamento. Podes atribuir-lhes tarefas em cada momento.
        </p>
        {suppliers.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            {suppliers.map((s) => (
              <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1 }}>
                  <strong>{s.name}</strong>
                  {s.service && <span style={{ color: "var(--text-muted)" }}> · {s.service}</span>}
                  {s.contact && <span style={{ color: "var(--text-muted)" }}> · {s.contact}</span>}
                </span>
                <Button variant="ghost" onClick={() => removeSupplier(s.id)}>Remover</Button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
          <label style={{ fontSize: 13 }}>
            Nome <Input value={supName} onChange={(e) => setSupName(e.target.value)} style={{ width: 160 }} />
          </label>
          <label style={{ fontSize: 13 }}>
            Serviço <Input value={supService} onChange={(e) => setSupService(e.target.value)} placeholder="Catering, DJ…" style={{ width: 140 }} />
          </label>
          <label style={{ fontSize: 13 }}>
            Contacto <Input value={supContact} onChange={(e) => setSupContact(e.target.value)} placeholder="email / telefone" style={{ width: 160 }} />
          </label>
          <Button variant="primary" onClick={addSupplier} disabled={!supName.trim()}>Adicionar</Button>
        </div>
      </Card>
    </div>
  );
}
