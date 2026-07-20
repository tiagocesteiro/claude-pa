"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, Card, Field, Input, Select, Button, Stat, Badge } from "@/components/ui";

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
    <PageShell size="md">
      {!roleLoaded && <p style={{ color: "var(--text-muted)" }}>A carregar...</p>}
      {showCouple && <CoupleSection />}
      {showVenue && <VenueSection />}
      {roleLoaded && !showVenue && !showCouple && (
        <p>A tua conta não tem um perfil válido. Contacta o suporte.</p>
      )}
    </PageShell>
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
      setWeddingError("Indica o nome do casal.");
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
      setWeddingError("Não foi possível criar o casamento.");
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

      <Card style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Novo casamento</h2>
        <form onSubmit={handleCreateWedding}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <Field label="Casal">
              <Input value={coupleName} onChange={(e) => setCoupleName(e.target.value)} placeholder="Ana & João" />
            </Field>
            <Field label="Quinta">
              <Select value={weddingVenueId} onChange={(e) => setWeddingVenueId(e.target.value)}>
                <option value="">Sem quinta</option>
                {pickableVenues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.location ? ` — ${v.location}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Data">
              <Input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" variant="primary" loading={creatingWedding}>
            {creatingWedding ? "A criar..." : "Criar casamento"}
          </Button>
          {weddingError && <p className="form-error" style={{ marginTop: 10 }}>{weddingError}</p>}
        </form>
      </Card>

      <h2>Os teus casamentos</h2>
      {weddings.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Ainda não há casamentos.</p>
      )}
      <ul className="list-reset" style={{ marginBottom: 32, display: "flex", flexDirection: "column", gap: 10 }}>
        {weddings.map((w) => (
          <li key={w.id}>
            <Card
              pad="sm"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
            >
              <span>
                <Link href={`/admin/wedding/${w.id}`}>
                  <strong>{w.couple}</strong>
                </Link>
                {w.date && (
                  <span style={{ color: "var(--text-muted)" }}> — {new Date(w.date).toLocaleDateString("pt-PT")}</span>
                )}
              </span>
              <Button variant="danger" size="sm" onClick={() => handleDeleteWedding(w)} title="Apagar casamento">
                Apagar
              </Button>
            </Card>
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
      setError("Indica o nome da quinta.");
      return;
    }
    const res = await fetch("/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, location: location || undefined }),
    });
    if (!res.ok) {
      setError("Não foi possível criar a quinta.");
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

      <Card style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Nova quinta</h2>
        <form onSubmit={handleCreateVenue}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <Field label="Nome">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Quinta do Vale" />
            </Field>
            <Field label="Localização">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Sintra" />
            </Field>
          </div>
          <Button type="submit" variant="primary">Criar quinta</Button>
          {error && <p className="form-error" style={{ marginTop: 10 }}>{error}</p>}
        </form>
      </Card>

      <h2>As tuas quintas</h2>
      {venues.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Ainda não há quintas.</p>
      )}
      <ul className="list-reset" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {venues.map((v) => (
          <li key={v.id}>
            <Card pad="sm">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span>
                  <strong>{v.name}</strong>
                  {v.location && <span style={{ color: "var(--text-muted)" }}> — {v.location}</span>}
                </span>
                <Button variant="danger" size="sm" onClick={() => handleDeleteVenue(v)} title="Apagar quinta">
                  Apagar
                </Button>
              </div>
              <div style={{ marginTop: 10 }}>
                <Link href={`/admin/venue/${v.id}`}>Abrir quinta &rarr;</Link>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <h2>Casamentos na tua quinta</h2>
      {bookingsLoaded && bookings.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Ainda não há casamentos marcados na tua quinta.</p>
      )}
      <ul className="list-reset" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bookings.map((b) => (
          <li key={b.id}>
            <BookingCard booking={b} />
          </li>
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
  const allDone = b.arrangementPicked && b.seatingDone && missingRsvp === 0;

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ fontSize: "1.05rem" }}>{b.couple}</strong>
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {b.date ? new Date(b.date).toLocaleDateString("pt-PT") : "sem data"}
          {allDone ? (
            <Badge tone="success">Pronto</Badge>
          ) : (
            <Badge tone="warning">Em curso</Badge>
          )}
        </span>
      </div>

      <div className="stat-row" style={{ margin: "16px 0", gap: 20 }}>
        <Stat value={g.total} label="Convidados" />
        <Stat value={g.confirmed} label="Confirmados" />
        <Stat value={g.pending} label="Pendentes" />
        {b.guestEstimate != null && <Stat value={b.guestEstimate} label="Estimativa" />}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          O que falta
        </span>
        <ChecklistItem done={b.arrangementPicked} label="Arranjo escolhido" />
        <ChecklistItem done={b.seatingDone} label="Seating feito" />
        {missingRsvp > 0 && <ChecklistItem done={false} label={`Faltam confirmar ${missingRsvp}`} />}
      </div>
    </Card>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span aria-hidden className={`check-dot ${done ? "check-dot-done" : "check-dot-todo"}`}>
        {done ? "✓" : "✗"}
      </span>
      <span>{label}</span>
    </span>
  );
}
