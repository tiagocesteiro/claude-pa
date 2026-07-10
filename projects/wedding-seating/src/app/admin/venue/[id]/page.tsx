"use client";

import { useParams } from "next/navigation";
import TableTypeCatalog from "@/components/venue/TableTypeCatalog";

export default function VenuePage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;

  return <TableTypeCatalog venueId={venueId} />;
}
