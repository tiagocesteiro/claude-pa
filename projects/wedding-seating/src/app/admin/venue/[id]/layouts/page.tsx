"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface FloorPlanListItem {
  id: string;
  venueId: string;
  name: string | null;
  image: string;
  createdAt: string;
  venue?: { name: string };
}

export default function VenueLayoutsPage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;
  const router = useRouter();

  const [floorPlans, setFloorPlans] = useState<FloorPlanListItem[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadFloorPlans() {
    const res = await fetch("/api/floorplans");
    const data = await res.json();
    setFloorPlans(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadFloorPlans();
  }, []);

  async function handleNewFloorPlan() {
    setCreating(true);
    try {
      const res = await fetch("/api/floorplans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          image: "",
          scale: 0,
          width: 0,
          depth: 0,
          name: newName.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const fp = await res.json();
      router.push(`/admin/floorplan/${fp.id}`);
    } catch {
      setError("Failed to create floor plan");
      setCreating(false);
    }
  }

  async function handleDeleteFloorPlan(fp: FloorPlanListItem, label: string) {
    if (
      !window.confirm(
        `Apagar a planta "${label}"? Os templates (arranjos de mesas) criados sobre esta planta também são apagados. Esta ação é irreversível.`
      )
    )
      return;
    const res = await fetch(`/api/floorplans/${fp.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Não foi possível apagar a planta.");
      return;
    }
    await loadFloorPlans();
  }

  const venuePlans = floorPlans
    .filter((fp) => fp.venueId === venueId)
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome da planta (ex: Salão principal)"
          style={{ minWidth: 240 }}
        />
        <button type="button" onClick={handleNewFloorPlan} disabled={creating}>
          {creating ? "A criar..." : "Nova planta"}
        </button>
        {error && <p style={{ color: "#dc2626", width: "100%" }}>{error}</p>}
      </div>

      {venuePlans.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Sem plantas ainda.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {venuePlans.map((fp, i) => {
            const label = fp.name?.trim() || `Planta ${i + 1}`;
            return (
              <li
                key={fp.id}
                style={{
                  border: "1px solid var(--border)",
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
                  <Link href={`/admin/floorplan/${fp.id}`}>{label}</Link>
                  {!fp.image && <span style={{ color: "var(--text-muted)" }}> (sem imagem)</span>}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteFloorPlan(fp, label)}
                  title="Apagar planta"
                  style={{ color: "#dc2626", flexShrink: 0 }}
                >
                  Apagar
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
