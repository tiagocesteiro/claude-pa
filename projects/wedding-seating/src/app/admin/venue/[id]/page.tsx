"use client";

import { useParams } from "next/navigation";
import TableTypeCatalog from "@/components/venue/TableTypeCatalog";
import DecorCatalog from "@/components/venue/DecorCatalog";
import RequirementTemplatesCatalog from "@/components/venue/RequirementTemplatesCatalog";

export default function VenuePage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <TableTypeCatalog venueId={venueId} />
      <DecorCatalog venueId={venueId} />
      <RequirementTemplatesCatalog venueId={venueId} />
    </div>
  );
}
