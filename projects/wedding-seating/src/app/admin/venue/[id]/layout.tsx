"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";

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

  const catalogHref = `/admin/venue/${venueId}`;
  const layoutsHref = `/admin/venue/${venueId}/layouts`;
  const templatesHref = `/admin/venue/${venueId}/templates`;

  const isCatalogActive = pathname === catalogHref;
  const isLayoutsActive = pathname?.endsWith("/layouts") ?? false;
  const isTemplatesActive = pathname?.endsWith("/templates") ?? false;

  const tabs = [
    { label: "Mesas disponíveis", href: catalogHref, active: isCatalogActive },
    { label: "Layouts de salas", href: layoutsHref, active: isLayoutsActive },
    { label: "Templates", href: templatesHref, active: isTemplatesActive },
  ];

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1>{venue ? venue.name : "Venue"}</h1>
      {venue?.location && <p>{venue.location}</p>}

      <nav
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid #ddd",
          marginBottom: 24,
        }}
      >
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: "8px 16px",
              textDecoration: "none",
              color: tab.active ? "#111" : "#666",
              fontWeight: tab.active ? 600 : 400,
              borderBottom: tab.active ? "2px solid #111" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </main>
  );
}
