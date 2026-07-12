"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";

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
  const isPlanActive = pathname?.endsWith("/plan") ?? false;
  const isCoupleActive = pathname?.endsWith("/couple") ?? false;

  const tabs = [
    { label: "Detalhes", href: detailsHref, active: isDetailsActive },
    { label: "Convidados & Grupos", href: guestsHref, active: isGuestsActive },
    { label: "Restrições", href: constraintsHref, active: isConstraintsActive },
    { label: "Plano de mesas", href: planHref, active: isPlanActive },
    { label: "Vista do casal", href: coupleHref, active: isCoupleActive },
  ];

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <p style={{ marginBottom: 8 }}>
        <Link href="/admin" style={{ color: "var(--text-muted)" }}>
          &larr; Início
        </Link>
      </p>
      <h1>{wedding ? wedding.couple : "Wedding"}</h1>

      <nav
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--border)",
          marginBottom: 24,
        }}
      >
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: "8px 16px",
              textDecoration: "none",
              color: tab.active ? "var(--accent)" : "var(--text-muted)",
              fontWeight: tab.active ? 600 : 400,
              borderBottom: tab.active
                ? "2px solid var(--accent)"
                : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </main>
  );
}
