"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, Card, Badge } from "@/components/ui";
import RequirementsPanel from "@/components/requirements/RequirementsPanel";
import DietaryByTableCard from "@/components/catering/DietaryByTableCard";
import ActivityFeed from "@/components/activity/ActivityFeed";
import SendTemplatesCard from "@/components/venue/SendTemplatesCard";

interface View {
  id: string;
  couple: string;
  date: string | null;
  venueName: string | null;
  service: string | null;
  moments: { id: string; kind: string | null; title: string | null; startTime: string | null }[];
  myTasks: { id: string; text: string; note: string | null; done: boolean; dueDate: string | null; moment: string | null }[];
}

const KIND_LABELS: Record<string, string> = { ceremony: "Cerimónia", cocktail: "Cocktail", dinner: "Jantar", dance: "Dança" };
function momentTitle(m: { title: string | null; kind: string | null }): string {
  return m.title ?? (m.kind ? KIND_LABELS[m.kind] ?? m.kind : "Momento");
}
function parseHM(s: string | null): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export default function SupplierWeddingView({ weddingId }: { weddingId: string }) {
  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reqRefresh, setReqRefresh] = useState(0);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/supplier/weddings/${weddingId}`);
      if (!res.ok) {
        setError(res.status === 403 ? "Sem acesso a este casamento." : "Não foi possível carregar.");
        setLoading(false);
        return;
      }
      setView((await res.json()) as View);
      setLoading(false);
    })();
  }, [weddingId]);

  if (loading) return <PageShell size="lg"><p>A carregar...</p></PageShell>;
  if (!view) return <PageShell size="lg"><p style={{ color: "#dc2626" }}>{error ?? "Não encontrado."}</p></PageShell>;

  const moments = [...view.moments].sort((a, b) => {
    const ta = parseHM(a.startTime);
    const tb = parseHM(b.startTime);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return ta - tb;
  });

  return (
    <PageShell size="lg">
      <p style={{ marginBottom: 8 }}>
        <Link href="/admin" style={{ color: "var(--text-muted)" }}>&larr; Os meus casamentos</Link>
      </p>
      <h1 style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        {view.couple}
        <span style={{ fontSize: 15, fontWeight: 400, color: "var(--text-muted)" }}>
          {view.venueName ? `${view.venueName} · ` : ""}
          {view.date ? new Date(view.date).toLocaleDateString("pt-PT") : "sem data"}
        </span>
        {view.service && <Badge tone="accent">{view.service}</Badge>}
      </h1>

      <Card style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Horário do dia</h2>
        {moments.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem momentos definidos.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {moments.map((m) => (
              <li key={m.id} style={{ display: "flex", gap: 10 }}>
                <span style={{ width: 56, color: "var(--accent-strong, #54704c)", fontWeight: 600 }}>{m.startTime ?? "—"}</span>
                <span>{momentTitle(m)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 style={{ marginTop: 0 }}>As minhas tarefas</h2>
        {view.myTasks.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem tarefas atribuídas a ti.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {view.myTasks.map((t) => (
              <li key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span aria-hidden style={{ color: t.done ? "var(--success)" : "var(--text-muted)" }}>{t.done ? "✓" : "○"}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--text-muted)" : "inherit" }}>{t.text}</span>
                  {t.note && <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{t.note}</span>}
                  {t.moment && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.moment}{t.dueDate ? ` · ${t.dueDate.slice(0, 10)}` : ""}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {view.service === "catering" && (
        <div style={{ marginTop: 20 }}>
          <DietaryByTableCard weddingId={weddingId} />
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <SendTemplatesCard weddingId={weddingId} onSent={() => setReqRefresh((n) => n + 1)} />
      </div>

      <div style={{ marginTop: 20 }}>
        <RequirementsPanel
          weddingId={weddingId}
          role="supplier"
          moments={moments.map((m) => ({ id: m.id, label: momentTitle(m) }))}
          reloadKey={reqRefresh}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <ActivityFeed weddingId={weddingId} title="Atividade (a minha)" />
      </div>
    </PageShell>
  );
}
