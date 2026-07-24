"use client";

import { useParams } from "next/navigation";
import VenueSpacesManager from "@/components/venue/VenueSpacesManager";

/** Espaços tab: per space → photo + 2D floor plans + layout templates. */
export default function VenueEspacosPage() {
  const params = useParams<{ id: string }>();
  return <VenueSpacesManager venueId={params.id} />;
}
