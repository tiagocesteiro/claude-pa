"use client";

import { useParams } from "next/navigation";
import TableTypeCatalog from "@/components/venue/TableTypeCatalog";
import DecorCatalog from "@/components/venue/DecorCatalog";

/** Material tab: the venue's physical inventory — decoration (and balcões/extras,
 * by category) + tables. Spaces + layouts + templates live under the Espaços tab. */
export default function VenueMaterialPage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 0 }}>
        Material da quinta: decoração, mesas, balcões e extras. Os balcões e extras entram no catálogo de decoração por categoria.
      </p>
      <DecorCatalog venueId={venueId} />
      <TableTypeCatalog venueId={venueId} />
    </div>
  );
}
