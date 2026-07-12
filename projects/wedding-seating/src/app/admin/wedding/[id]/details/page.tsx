"use client";

import { useParams } from "next/navigation";
import WeddingDetails from "@/components/wedding/WeddingDetails";

export default function WeddingDetailsPage() {
  const params = useParams<{ id: string }>();
  const weddingId = params.id;

  return <WeddingDetails weddingId={weddingId} />;
}
