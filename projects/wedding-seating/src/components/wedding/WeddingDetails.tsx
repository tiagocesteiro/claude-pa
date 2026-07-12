"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Mirrors MOMENT_KINDS in src/lib/db/moments.ts — duplicated (not imported) so this
// client component doesn't pull the server-only Prisma module into the browser bundle.
const MOMENT_KINDS = ["ceremony", "cocktail", "dinner", "dance"] as const;
type MomentKind = (typeof MOMENT_KINDS)[number];

const MOMENT_LABELS: Record<MomentKind, string> = {
  ceremony: "Cerimónia",
  cocktail: "Cocktail",
  dinner: "Jantar",
  dance: "Dança",
};

interface Venue {
  id: string;
  name: string;
  location: string | null;
  createdAt: string;
}

interface FloorPlan {
  id: string;
  venueId: string;
  createdAt: string;
}

interface Moment {
  id: string;
  kind: MomentKind;
  floorPlanId: string | null;
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
  moments: Moment[];
}

const label: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 13,
  color: "var(--text-muted)",
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function WeddingDetails({ weddingId }: { weddingId: string }) {
  const [wedding, setWedding] = useState<WeddingDetail | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
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

  async function loadWedding() {
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
    setGuestEstimate(data.guestEstimate === null || data.guestEstimate === undefined ? "" : String(data.guestEstimate));
    setNotes(data.notes ?? "");
    setLoading(false);
  }

  async function loadVenues() {
    const res = await fetch("/api/venues");
    if (!res.ok) return;
    setVenues((await res.json()) as Venue[]);
  }

  async function loadFloorPlans() {
    const res = await fetch("/api/floorplans");
    if (!res.ok) return;
    setFloorPlans((await res.json()) as FloorPlan[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadWedding();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadVenues();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadFloorPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- weddingId is stable per mount
  }, [weddingId]);

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

  async function setMomentPlan(kind: MomentKind, floorPlanId: string | null) {
    const res = await fetch(`/api/weddings/${weddingId}/moments/${kind}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ floorPlanId }),
    });
    if (!res.ok) {
      setError("Falha ao guardar a planta do momento.");
      return;
    }
    await loadWedding();
  }

  if (loading) return <p>A carregar...</p>;
  if (!wedding) return <p style={{ color: "#dc2626" }}>{error ?? "Casamento não encontrado."}</p>;

  const venuePlans = venueId
    ? floorPlans
        .filter((fp) => fp.venueId === venueId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const moments = MOMENT_KINDS.map(
    (kind) => wedding.moments.find((m) => m.kind === kind) ?? { id: kind, kind, floorPlanId: null }
  );

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 16,
          }}
        >
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
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label style={label}>
            Nº estimado de convidados
            <input
              type="number"
              min={0}
              value={guestEstimate}
              onChange={(e) => setGuestEstimate(e.target.value)}
            />
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
            <input
              type="email"
              value={partner1Email}
              onChange={(e) => setPartner1Email(e.target.value)}
            />
          </label>
          <label style={label}>
            Parceiro 2 — email
            <input
              type="email"
              value={partner2Email}
              onChange={(e) => setPartner2Email(e.target.value)}
            />
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
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="submit" disabled={saving}>
            {saving ? "A guardar..." : "Guardar"}
          </button>
          {saved && <span style={{ color: "var(--accent)" }}>Guardado.</span>}
          {error && <span style={{ color: "#dc2626" }}>{error}</span>}
        </div>
      </form>

      <h2>Momentos &amp; plantas</h2>
      {!venueId && (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Escolhe primeiro a quinta.</p>
      )}
      <ul style={{ listStyle: "none", padding: 0, maxWidth: 640 }}>
        {moments.map((moment) => (
          <li
            key={moment.kind}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "10px 14px",
              marginBottom: 8,
              background: "var(--surface)",
            }}
          >
            <strong style={{ color: "var(--heading)" }}>{MOMENT_LABELS[moment.kind]}</strong>
            {moment.kind === "dinner" ? (
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Definido pelo template no separador{" "}
                <Link href={`/admin/wedding/${weddingId}/plan`}>Plano de mesas</Link>
              </span>
            ) : (
              <select
                value={moment.floorPlanId ?? ""}
                disabled={!venueId}
                onChange={(e) => setMomentPlan(moment.kind, e.target.value || null)}
                aria-label={`Planta de ${MOMENT_LABELS[moment.kind]}`}
              >
                <option value="">— (nenhuma)</option>
                {venuePlans.map((fp, i) => (
                  <option key={fp.id} value={fp.id}>
                    Planta {i + 1}
                  </option>
                ))}
              </select>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
