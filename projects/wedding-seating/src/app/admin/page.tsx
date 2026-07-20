"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Venue {
  id: string;
  name: string;
  location: string | null;
  createdAt: string;
}

interface PickableVenue {
  id: string;
  name: string;
  location: string | null;
}

interface Wedding {
  id: string;
  couple: string;
  date: string | null;
  createdAt: string;
}

/** PII-free progress summary of a wedding booked at the venue (Fase E). */
interface VenueBooking {
  id: string;
  couple: string;
  date: string | null;
  venueId: string | null;
  venueName: string | null;
  guestEstimate: number | null;
  guests: { total: number; confirmed: number; pending: number; declined: number; seated: number };
  arrangementPicked: boolean;
  seatingDone: boolean;
}

type Role = "venue" | "couple" | "admin";

export default function AdminPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    async function loadRole() {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return;
      const data = (await res.json()) as { role?: Role | null };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
      setRole(data.role ?? null);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
      setRoleLoaded(true);
    }
    loadRole();
  }, []);

  const showVenue = role === "venue" || role === "admin";
  const showCouple = role === "couple" || role === "admin";

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      {!roleLoaded && <p>A carregar...</p>}
      {showCouple && <CoupleSection />}
      {showVenue && <VenueSection />}
      {roleLoaded && !showVenue && !showCouple && (
        <p>A tua conta não tem um perfil válido. Contacta o suporte.</p>
      )}
    </main>
  );
}

/** Couple workspace: create + manage the couple's weddings, picking a venue. */
function CoupleSection() {
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [pickableVenues, setPickableVenues] = useState<PickableVenue[]>([]);
  const [coupleName, setCoupleName] = useState("");
  const [weddingVenueId, setWeddingVenueId] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [weddingError, setWeddingError] = useState<string | null>(null);
  const [creatingWedding, setCreatingWedding] = useState(false);

  const loadWeddings = useCallback(async () => {
    const res = await fetch("/api/weddings");
    if (!res.ok) return;
    setWeddings(await res.json());
  }, []);

  const loadPickableVenues = useCallback(async () => {
    const res = await fetch("/api/venues/pickable");
    if (!res.ok) return;
    setPickableVenues(await res.json());
  }, []);

  useEffect(() => {
    loadWeddings();
    loadPickableVenues();
  }, [loadWeddings, loadPickableVenues]);

  async function handleCreateWedding(e: React.FormEvent) {
    e.preventDefault();
    setWeddingError(null);
    if (!coupleName.trim()) {
      setWeddingError("Couple name is required");
      return;
    }
    setCreatingWedding(true);
    try {
      const res = await fetch("/api/weddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couple: coupleName,
          venueId: weddingVenueId || null,
          date: weddingDate || undefined,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setCoupleName("");
      setWeddingVenueId("");
      setWeddingDate("");
      await loadWeddings();
    } catch {
      setWeddingError("Failed to create wedding");
    } finally {
      setCreatingWedding(false);
    }
  }

  async function handleDeleteWedding(w: Wedding) {
    if (!window.confirm(`Apagar o casamento "${w.couple}" e todos os seus dados (convidados, grupos, mesas)? Esta ação é irreversível.`)) return;
    const res = await fetch(`/api/weddings/${w.id}`, { method: "DELETE" });
    if (!res.ok) {
      setWeddingError("Não foi possível apagar o casamento.");
      return;
    }
    await loadWeddings();
  }

  return (
    <section>
      <h1>Casamentos</h1>

      <form onSubmit={handleCreateWedding} style={{ marginBottom: 24 }}>
        <h2>Novo casamento</h2>
        <div style={{ marginBottom: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label>
            Casal:{" "}
            <input value={coupleName} onChange={(e) => setCoupleName(e.target.value)} />
          </label>
          <label>
            Quinta:{" "}
            <select value={weddingVenueId} onChange={(e) => setWeddingVenueId(e.target.value)}>
              <option value="">Sem quinta</option>
              {pickableVenues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.location ? ` — ${v.location}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data:{" "}
            <input
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
            />
          </label>
        </div>
        <button type="submit" disabled={creatingWedding}>
          {creatingWedding ? "A criar..." : "Criar casamento"}
        </button>
        {weddingError && <p style={{ color: "#dc2626" }}>{weddingError}</p>}
      </form>

      <h2>Os teus casamentos</h2>
      {weddings.length === 0 && <p>Ainda não há casamentos.</p>}
      <ul style={{ listStyle: "none", padding: 0, marginBottom: 32 }}>
        {weddings.map((w) => (
          <li
            key={w.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>
              <Link href={`/admin/wedding/${w.id}`}>
                <strong>{w.couple}</strong>
              </Link>
              {w.date && <span> — {new Date(w.date).toLocaleDateString()}</span>}
            </span>
            <button
              type="button"
              onClick={() => handleDeleteWedding(w)}
              title="Apagar casamento"
              style={{ color: "#dc2626", flexShrink: 0 }}
            >
              Apagar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Venue workspace: create + manage the venue account's venues. */
function VenueSection() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadVenues = useCallback(async () => {
    const res = await fetch("/api/venues");
    if (!res.ok) return;
    setVenues(await res.json());
  }, []);

  const loadBookings = useCallback(async () => {
    const res = await fetch("/api/venue/bookings");
    if (!res.ok) return;
    setBookings(await res.json());
    setBookingsLoaded(true);
  }, []);

  useEffect(() => {
    loadVenues();
    loadBookings();
  }, [loadVenues, loadBookings]);

  async function handleCreateVenue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const res = await fetch("/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, location: location || undefined }),
    });
    if (!res.ok) {
      setError("Failed to create venue");
      return;
    }
    setName("");
    setLocation("");
    await loadVenues();
  }

  async function handleDeleteVenue(v: Venue) {
    if (!window.confirm(`Apagar a quinta "${v.name}" e as suas plantas/mesas/templates? Os casamentos associados ficam sem quinta. Esta ação é irreversível.`)) return;
    const res = await fetch(`/api/venues/${v.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Não foi possível apagar a quinta.");
      return;
    }
    await loadVenues();
  }

  return (
    <section>
      <h1>Quintas</h1>

      <form onSubmit={handleCreateVenue} style={{ marginBottom: 24 }}>
        <h2>Nova quinta</h2>
        <div style={{ marginBottom: 8 }}>
          <label>
            Nome:{" "}
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>
            Localização:{" "}
            <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
        </div>
        <button type="submit">Criar quinta</button>
        {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      </form>

      <h2>As tuas quintas</h2>
      {venues.length === 0 && <p>Ainda não há quintas.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {venues.map((v) => (
          <li
            key={v.id}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span>
                <strong>{v.name}</strong>
                {v.location && <span> — {v.location}</span>}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteVenue(v)}
                title="Apagar quinta"
                style={{ color: "#dc2626", flexShrink: 0 }}
              >
                Apagar
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <Link href={`/admin/venue/${v.id}`}>Abrir quinta</Link>
            </div>
          </li>
        ))}
      </ul>

      <h2>Casamentos na tua quinta</h2>
      {bookingsLoaded && bookings.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Ainda não há casamentos marcados na tua quinta.</p>
      )}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {bookings.map((b) => (
          <BookingCard key={b.id} booking={b} />
        ))}
      </ul>
    </section>
  );
}

/** Read-only progress card for a wedding booked at the venue. PII-free: shows
 * only couple, date, estimate, aggregate counts and a "what's missing" checklist
 * — never guest names, dietary data, or the seating layout, and no link into the
 * couple's private pages. */
function BookingCard({ booking: b }: { booking: VenueBooking }) {
  const { guests: g } = b;
  const missingRsvp = g.pending;
  return (
    <li
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--surface)",
        padding: 14,
        marginBottom: 10,
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ fontSize: "1.05rem" }}>{b.couple}</strong>
        <span style={{ color: "var(--text-muted)" }}>
          {b.date ? new Date(b.date).toLocaleDateString() : "sem data"}
          {b.guestEstimate != null ? ` · estimativa ${b.guestEstimate}` : ""}
        </span>
      </div>

      <p style={{ marginTop: 6 }}>
        {g.total} convidados · {g.confirmed} confirmados · {g.pending} pendentes
        {g.declined > 0 ? ` · ${g.declined} recusaram` : ""}
      </p>

      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          O que falta
        </span>
        <ChecklistItem done={b.arrangementPicked} label="Arranjo escolhido" />
        <ChecklistItem done={b.seatingDone} label="Seating feito" />
        {missingRsvp > 0 && (
          <ChecklistItem done={false} label={`Faltam confirmar ${missingRsvp}`} />
        )}
      </div>
    </li>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: "50%",
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "#fff",
          background: done ? "#3f9d6b" : "#c9502f",
        }}
      >
        {done ? "✓" : "✗"}
      </span>
      <span>{label}</span>
    </span>
  );
}
