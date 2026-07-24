"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui";
import TableTypeCatalog from "@/components/venue/TableTypeCatalog";
import DecorCatalog from "@/components/venue/DecorCatalog";

/** Material tab: the venue's physical inventory. A sub-toggle switches between
 * Decoração (+ balcões/extras) and Mesas so you don't scroll past a long catalog. */
export default function VenueMaterialPage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;
  const [tab, setTab] = useState<"decor" | "tables">("decor");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <Button variant={tab === "decor" ? "primary" : "secondary"} size="sm" onClick={() => setTab("decor")}>Decoração & extras</Button>
        <Button variant={tab === "tables" ? "primary" : "secondary"} size="sm" onClick={() => setTab("tables")}>Mesas</Button>
      </div>
      {tab === "decor" ? <DecorCatalog venueId={venueId} /> : <TableTypeCatalog venueId={venueId} />}
    </div>
  );
}
