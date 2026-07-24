"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { PageShell, Tabs } from "@/components/ui";

interface Venue {
  id: string;
  name: string;
  location: string | null;
}

export default function VenueLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const venueId = params.id;
  const pathname = usePathname();

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

  const materialHref = `/admin/venue/${venueId}`;
  const espacosHref = `/admin/venue/${venueId}/espacos`;
  const pedidosHref = `/admin/venue/${venueId}/pedidos`;

  const tabs = [
    { label: "Material", href: materialHref, active: pathname === materialHref },
    { label: "Espaços", href: espacosHref, active: pathname?.includes("/espacos") ?? false },
    { label: "Pedidos template", href: pedidosHref, active: pathname?.endsWith("/pedidos") ?? false },
  ];

  return (
    <PageShell size="lg">
      <p style={{ marginBottom: 8 }}>
        <Link href="/admin" style={{ color: "var(--text-muted)" }}>
          &larr; Início
        </Link>
      </p>
      <h1>{venue ? venue.name : "Quinta"}</h1>
      {venue?.location && <p style={{ color: "var(--text-muted)" }}>{venue.location}</p>}

      <Tabs tabs={tabs} />

      {children}
    </PageShell>
  );
}
