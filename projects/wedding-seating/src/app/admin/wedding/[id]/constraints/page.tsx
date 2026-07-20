"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ConstraintsPanel from "@/components/guests/ConstraintsPanel";
import type { Guest } from "@/components/guests/useGuestBoard";

export default function ConstraintsPage() {
  const params = useParams<{ id: string }>();
  const weddingId = params.id;

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGuests() {
      setLoading(true);
      const res = await fetch(`/api/weddings/${weddingId}/guests`);
      if (res.ok) {
        const data = (await res.json()) as Guest[];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
        setGuests(data);
      }
      setLoading(false);
    }
    loadGuests();
  }, [weddingId]);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>A carregar...</p>;

  return <ConstraintsPanel weddingId={weddingId} guests={guests} />;
}
