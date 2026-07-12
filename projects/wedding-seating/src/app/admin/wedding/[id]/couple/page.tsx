"use client";

import { useParams } from "next/navigation";
import CoupleView from "@/components/wedding/CoupleView";

export default function CoupleViewPage() {
  const params = useParams<{ id: string }>();
  const weddingId = params.id;

  return <CoupleView weddingId={weddingId} />;
}
