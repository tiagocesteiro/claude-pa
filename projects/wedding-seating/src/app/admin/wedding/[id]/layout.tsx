"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell, Tabs } from "@/components/ui";

interface WeddingRecord {
  id: string;
  couple: string;
  date: string | null;
}

interface MomentTab {
  id: string;
  title: string | null;
  kind: string | null;
}

const KIND_LABELS: Record<string, string> = {
  ceremony: "Cerimónia",
  cocktail: "Cocktail",
  dinner: "Jantar",
  dance: "Dança",
};

function momentLabel(m: MomentTab): string {
  return m.title ?? (m.kind ? KIND_LABELS[m.kind] ?? m.kind : "Momento");
}

export default function WeddingLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const weddingId = params.id;
  const pathname = usePathname();
  const router = useRouter();

  const [wedding, setWedding] = useState<WeddingRecord | null>(null);
  const [moments, setMoments] = useState<MomentTab[]>([]);
  const [adding, setAdding] = useState(false);

  const loadMoments = useCallback(async () => {
    const res = await fetch(`/api/weddings/${weddingId}/moments`);
    if (!res.ok) return;
    const data = (await res.json()) as { moments: MomentTab[] };
    setMoments(data.moments ?? []);
  }, [weddingId]);

  useEffect(() => {
    async function loadWedding() {
      const res = await fetch("/api/weddings");
      if (!res.ok) return;
      const all = (await res.json()) as WeddingRecord[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
      setWedding(all.find((w) => w.id === weddingId) ?? null);
    }
    loadWedding();
    loadMoments();
  }, [weddingId, loadMoments]);

  const detailsHref = `/admin/wedding/${weddingId}/details`;
  const guestsHref = `/admin/wedding/${weddingId}`;
  const constraintsHref = `/admin/wedding/${weddingId}/constraints`;
  const planHref = `/admin/wedding/${weddingId}/plan`;
  const coupleHref = `/admin/wedding/${weddingId}/couple`;

  const tabs = [
    { label: "Detalhes", href: detailsHref, active: pathname?.endsWith("/details") ?? false },
    { label: "Convidados", href: guestsHref, active: pathname === guestsHref },
    { label: "Restrições", href: constraintsHref, active: pathname?.endsWith("/constraints") ?? false },
    { label: "Layouts", href: planHref, active: pathname?.includes("/plan") ?? false },
    // one tab per moment
    ...moments.map((m) => ({
      label: momentLabel(m),
      href: `/admin/wedding/${weddingId}/moment/${m.id}`,
      active: pathname?.includes(`/moment/${m.id}`) ?? false,
    })),
    { label: "Visão geral", href: coupleHref, active: pathname?.endsWith("/couple") ?? false },
  ];

  async function addMoment() {
    const title = window.prompt("Nome do novo momento (ex.: Photobooth, Brunch):");
    if (title == null || !title.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/moments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (res.ok) {
        const { moment } = (await res.json()) as { moment: { id: string } };
        await loadMoments();
        router.push(`/admin/wedding/${weddingId}/moment/${moment.id}`);
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <PageShell size="lg">
      <p style={{ marginBottom: 8 }}>
        <Link href="/admin" style={{ color: "var(--text-muted)" }}>
          &larr; Início
        </Link>
      </p>
      <h1>{wedding ? wedding.couple : "Casamento"}</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Tabs tabs={tabs} />
        <button
          type="button"
          onClick={addMoment}
          disabled={adding}
          title="Adicionar momento"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "var(--surface)",
            color: "var(--heading)",
            padding: "4px 10px",
            cursor: adding ? "default" : "pointer",
            fontSize: 13,
            whiteSpace: "nowrap",
          }}
        >
          + Momento
        </button>
      </div>

      {children}
    </PageShell>
  );
}
