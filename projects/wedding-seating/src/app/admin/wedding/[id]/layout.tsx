"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { PageShell, Tabs } from "@/components/ui";

interface WeddingRecord {
  id: string;
  couple: string;
  date: string | null;
}

export default function WeddingLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const weddingId = params.id;
  const pathname = usePathname();

  const [wedding, setWedding] = useState<WeddingRecord | null>(null);

  useEffect(() => {
    async function loadWedding() {
      const res = await fetch("/api/weddings");
      if (!res.ok) return;
      const all = (await res.json()) as WeddingRecord[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
      setWedding(all.find((w) => w.id === weddingId) ?? null);
    }
    loadWedding();
  }, [weddingId]);

  const detailsHref = `/admin/wedding/${weddingId}/details`;
  const guestsHref = `/admin/wedding/${weddingId}`;
  const constraintsHref = `/admin/wedding/${weddingId}/constraints`;
  const planHref = `/admin/wedding/${weddingId}/plan`;
  const coupleHref = `/admin/wedding/${weddingId}/couple`;

  const isDetailsActive = pathname?.endsWith("/details") ?? false;
  const isGuestsActive = pathname === guestsHref;
  const isConstraintsActive = pathname?.endsWith("/constraints") ?? false;
  // Active for both the layouts index (/plan) and a specific layout editor (/plan/<id>).
  const isPlanActive = pathname?.includes("/plan") ?? false;
  const isCoupleActive = pathname?.endsWith("/couple") ?? false;

  const tabs = [
    { label: "Detalhes", href: detailsHref, active: isDetailsActive },
    { label: "Convidados", href: guestsHref, active: isGuestsActive },
    { label: "Restrições", href: constraintsHref, active: isConstraintsActive },
    { label: "Layouts", href: planHref, active: isPlanActive },
    { label: "Visão geral", href: coupleHref, active: isCoupleActive },
  ];

  return (
    <PageShell size="lg">
      <p style={{ marginBottom: 8 }}>
        <Link href="/admin" style={{ color: "var(--text-muted)" }}>
          &larr; Início
        </Link>
      </p>
      <h1>{wedding ? wedding.couple : "Casamento"}</h1>

      <Tabs tabs={tabs} />

      {children}
    </PageShell>
  );
}
