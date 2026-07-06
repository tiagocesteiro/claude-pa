"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Venue {
  id: string;
  name: string;
  location: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadVenues() {
    const res = await fetch("/api/venues");
    const data = await res.json();
    setVenues(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadVenues();
  }, []);

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
      router.push(`/admin/floorplan/${fp.id}`);
    } catch {
      setError("Failed to create floor plan");
      setCreatingFor(null);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
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
        {venues.map((v) => (
          <li
            key={v.id}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}
          >
            <strong>{v.name}</strong>
            {v.location && <span> — {v.location}</span>}
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => handleNewFloorPlan(v.id)}
                disabled={creatingFor === v.id}
              >
                {creatingFor === v.id ? "Creating..." : "New floor plan"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
