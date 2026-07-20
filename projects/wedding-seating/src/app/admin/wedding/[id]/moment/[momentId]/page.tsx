"use client";

import { useParams } from "next/navigation";
import MomentDetail from "@/components/wedding/MomentDetail";

export default function MomentPage() {
  const params = useParams<{ id: string; momentId: string }>();
  return <MomentDetail weddingId={params.id} momentId={params.momentId} />;
}
