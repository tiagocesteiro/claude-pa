"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import TableTypeCatalog from "@/components/venue/TableTypeCatalog";

interface Venue {
  id: string;
  name: string;
  location: string | null;
}

export default function VenuePage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;
  const [venue, setVenue] = useState<Venue | null>(null);

  useEffect(() => {
    async function loadVenue() {
      const res = await fetch("/api/venues");
      if (!res.ok) return;
      const venues = (await res.json()) as Venue[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
      setVenue(venues.find((v) => v.id === venueId) ?? null);
    }
    loadVenue();
  }, [venueId]);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <p>
        <Link href="/admin">&larr; Back to venues</Link>
      </p>
      <h1>{venue ? venue.name : "Venue"}</h1>
      {venue?.location && <p>{venue.location}</p>}

      <TableTypeCatalog venueId={venueId} />
    </main>
  );
}
