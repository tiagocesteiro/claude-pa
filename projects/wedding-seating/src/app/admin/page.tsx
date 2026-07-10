"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Venue {
  id: string;
  name: string;
  location: string | null;
  createdAt: string;
}

interface Wedding {
  id: string;
  couple: string;
  date: string | null;
  createdAt: string;
}

interface FloorPlanListItem {
  id: string;
  venueId: string;
  image: string;
  createdAt: string;
  venue?: { name: string };
}

export default function AdminPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [coupleName, setCoupleName] = useState("");
  const [weddingError, setWeddingError] = useState<string | null>(null);
  const [creatingWedding, setCreatingWedding] = useState(false);

  const [floorPlans, setFloorPlans] = useState<FloorPlanListItem[]>([]);

  async function loadVenues() {
    const res = await fetch("/api/venues");
    const data = await res.json();
    setVenues(data);
  }

  async function loadWeddings() {
    const res = await fetch("/api/weddings");
    const data = await res.json();
    setWeddings(data);
  }

  async function loadFloorPlans() {
    const res = await fetch("/api/floorplans");
    const data = await res.json();
    setFloorPlans(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadVenues();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadWeddings();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadFloorPlans();
  }, []);

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
        body: JSON.stringify({ couple: coupleName }),
      });
      if (!res.ok) throw new Error("failed");
      setCoupleName("");
      await loadWeddings();
    } catch {
      setWeddingError("Failed to create wedding");
    } finally {
      setCreatingWedding(false);
    }
  }

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

  async function handleNewFloorPlan(venueId: string) {
    setCreatingFor(venueId);
    try {
      const res = await fetch("/api/floorplans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, image: "", scale: 0, width: 0, depth: 0 }),
      });
      if (!res.ok) throw new Error("failed");
      const fp = await res.json();
      await loadFloorPlans();
      router.push(`/admin/floorplan/${fp.id}`);
    } catch {
      setError("Failed to create floor plan");
      setCreatingFor(null);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Weddings</h1>

      <form onSubmit={handleCreateWedding} style={{ marginBottom: 24 }}>
        <h2>New wedding</h2>
        <div style={{ marginBottom: 8 }}>
          <label>
            Couple:{" "}
            <input value={coupleName} onChange={(e) => setCoupleName(e.target.value)} />
          </label>
        </div>
        <button type="submit" disabled={creatingWedding}>
          {creatingWedding ? "Creating..." : "Create wedding"}
        </button>
        {weddingError && <p style={{ color: "#dc2626" }}>{weddingError}</p>}
      </form>

      <h2>Existing weddings</h2>
      {weddings.length === 0 && <p>No weddings yet.</p>}
      <ul style={{ listStyle: "none", padding: 0, marginBottom: 32 }}>
        {weddings.map((w) => (
          <li
            key={w.id}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}
          >
            <Link href={`/admin/wedding/${w.id}`}>
              <strong>{w.couple}</strong>
            </Link>
            {w.date && <span> — {new Date(w.date).toLocaleDateString()}</span>}
          </li>
        ))}
      </ul>

      <h1>Venues</h1>

      <form onSubmit={handleCreateVenue} style={{ marginBottom: 24 }}>
        <h2>New venue</h2>
        <div style={{ marginBottom: 8 }}>
          <label>
            Name:{" "}
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>
            Location:{" "}
            <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
        </div>
        <button type="submit">Create venue</button>
        {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      </form>

      <h2>Existing venues</h2>
      {venues.length === 0 && <p>No venues yet.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {venues.map((v) => {
          const venuePlans = floorPlans
            .filter((fp) => fp.venueId === v.id)
            .slice()
            .sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          return (
            <li
              key={v.id}
              style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}
            >
              <strong>{v.name}</strong>
              {v.location && <span> — {v.location}</span>}
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleNewFloorPlan(v.id)}
                  disabled={creatingFor === v.id}
                >
                  {creatingFor === v.id ? "Creating..." : "New floor plan"}
                </button>
                <Link href={`/admin/venue/${v.id}`}>Table type catalog</Link>
              </div>
              <div style={{ marginTop: 8 }}>
                {venuePlans.length === 0 ? (
                  <span style={{ color: "#6b7280", fontSize: 14 }}>Sem plantas ainda.</span>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {venuePlans.map((fp, i) => (
                      <li key={fp.id} style={{ fontSize: 14, marginBottom: 4 }}>
                        <Link href={`/admin/floorplan/${fp.id}`}>Planta {i + 1}</Link>
                        {!fp.image && (
                          <span style={{ color: "#6b7280" }}> (sem imagem)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
