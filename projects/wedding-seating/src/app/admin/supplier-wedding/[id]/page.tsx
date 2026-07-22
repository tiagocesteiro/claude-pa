"use client";

import { useParams } from "next/navigation";
import SupplierWeddingView from "@/components/supplier/SupplierWeddingView";

export default function SupplierWeddingPage() {
  const params = useParams<{ id: string }>();
  return <SupplierWeddingView weddingId={params.id} />;
}
