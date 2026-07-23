"use client";

import { useParams } from "next/navigation";
import TableTypeCatalog from "@/components/venue/TableTypeCatalog";
import DecorCatalog from "@/components/venue/DecorCatalog";
import RequirementTemplatesCatalog from "@/components/venue/RequirementTemplatesCatalog";
import VenueSpacesCatalog from "@/components/venue/VenueSpacesCatalog";

export default function VenuePage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <VenueSpacesCatalog venueId={venueId} />
      <TableTypeCatalog venueId={venueId} />
      <DecorCatalog venueId={venueId} />
      <RequirementTemplatesCatalog venueId={venueId} />
    </div>
  );
}
