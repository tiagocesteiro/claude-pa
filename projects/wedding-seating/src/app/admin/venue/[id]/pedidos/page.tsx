"use client";

import { useParams } from "next/navigation";
import RequirementTemplatesCatalog from "@/components/venue/RequirementTemplatesCatalog";

/** Pedidos template tab: the venue's reusable request/instruction templates,
 * sent to a wedding's suppliers. */
export default function VenuePedidosPage() {
  const params = useParams<{ id: string }>();
  return <RequirementTemplatesCatalog venueId={params.id} />;
}
