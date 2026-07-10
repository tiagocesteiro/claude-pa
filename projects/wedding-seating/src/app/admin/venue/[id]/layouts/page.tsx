"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface FloorPlanListItem {
  id: string;
  venueId: string;
  image: string;
  createdAt: string;
  venue?: { name: string };
}

export default function VenueLayoutsPage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;
  const router = useRouter();

  const [floorPlans, setFloorPlans] = useState<FloorPlanListItem[]>([]);
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
        body: JSON.stringify({ venueId, image: "", scale: 0, width: 0, depth: 0 }),
      });
      if (!res.ok) throw new Error("failed");
      const fp = await res.json();
      await loadFloorPlans();
      router.push(`/admin/floorplan/${fp.id}`);
    } catch {
      setError("Failed to create floor plan");
      setCreating(false);
    }
  }

  const venuePlans = floorPlans
    .filter((fp) => fp.venueId === venueId)
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button type="button" onClick={handleNewFloorPlan} disabled={creating}>
          {creating ? "Creating..." : "Nova planta"}
        </button>
        {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      </div>

      {venuePlans.length === 0 ? (
        <p style={{ color: "#6b7280" }}>Sem plantas ainda.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {venuePlans.map((fp, i) => (
            <li
              key={fp.id}
              style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}
            >
              <Link href={`/admin/floorplan/${fp.id}`}>Planta {i + 1}</Link>
              {!fp.image && <span style={{ color: "#6b7280" }}> (sem imagem)</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
