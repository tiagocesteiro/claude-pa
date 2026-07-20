"use client";

import { useParams } from "next/navigation";
import VenueWeddingView from "@/components/venue/VenueWeddingView";

export default function VenueWeddingPage() {
  const params = useParams<{ id: string }>();
  return <VenueWeddingView weddingId={params.id} />;
}
