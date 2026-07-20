"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import type { PlanTableView } from "@/components/plan/PlanCanvas";
import type { PlanGuest, PlanTable, PlanLayout, PlanGroup } from "@/components/plan/usePlan";
import { parseElements } from "@/lib/floorplan/elements";
import { buildPdfFilename, groupGuestsByTable } from "@/lib/plan/pdfExport";
import { buildColorMap, type AttributeKey } from "@/lib/plan/colors";
import { imageUrlFor } from "@/lib/images";

const COLOR_ATTR_OPTIONS: { label: string; value: AttributeKey | "" }[] = [
  { label: "Nenhum", value: "" },
  { label: "Faixa etária", value: "ageGroup" },
  { label: "Género", value: "gender" },
  { label: "Alimentar", value: "dietary" },
  { label: "Grupo", value: "group" },
];

const AGE_GROUP_LABELS: Record<string, string> = { adult: "adulto", child: "criança", senior: "idoso" };
const KIND_LABELS: Record<string, string> = { ceremony: "Cerimónia", cocktail: "Cocktail", dinner: "Jantar", dance: "Dança" };

function legendLabel(attr: AttributeKey, value: string, groups: PlanGroup[]): string {
  if (attr === "ageGroup") return AGE_GROUP_LABELS[value] ?? value;
  if (attr === "group") return groups.find((g) => g.id === value)?.name ?? value;
  return value;
}

interface Task {
  id: string;
  text: string;
  done: boolean;
}
interface DecorLine {
  id: string;
  name: string | null;
  quantity: number;
  decorItem: { name: string } | null;
}
interface Moment {
  id: string;
  kind: string | null;
  title: string | null;
  hasSeating: boolean;
  startTime: string | null;
  tasks: Task[];
  decor: DecorLine[];
}

/** "HH:MM" → minutes since midnight, or null. */
function parseHM(s: string | null): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function fmtDuration(min: number): string {
  if (min <= 0) return "";
  const h = Math.floor(min / 60);
  const mm = min % 60;
  if (h && mm) return `${h}h${String(mm).padStart(2, "0")}`;
  if (h) return `${h}h`;
  return `${mm} min`;
}
interface WeddingDetail {
  id: string;
  couple: string;
  venue?: { name: string } | null;
  moments: Moment[];
}
/** A moment's FINAL layout, resolved for read-only render. */
interface MomentPlan {
  background: PlanLayout | null;
  tables: PlanTable[];
  seats: { guestId: string; tableId: string }[];
  guests: PlanGuest[];
}

const PlanCanvas = dynamic(() => import("@/components/plan/PlanCanvas"), { ssr: false });
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 560;

function momentTitle(m: Moment): string {
  return m.title ?? (m.kind ? KIND_LABELS[m.kind] ?? m.kind : "Momento");
}

function noop() {}

function sectionStyle(): React.CSSProperties {
  return { border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", padding: 20, marginBottom: 24 };
}

function Placeholder({ text }: { text: string }) {
  return <p style={{ color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>{text}</p>;
}

export default function CoupleView({ weddingId }: { weddingId: string }) {
  const [wedding, setWedding] = useState<WeddingDetail | null>(null);
  const [plans, setPlans] = useState<Record<string, MomentPlan>>({});
  const [groups, setGroups] = useState<PlanGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colorAttr, setColorAttr] = useState<AttributeKey | null>(null);
  const stageRefs = useRef<Record<string, Konva.Stage | null>>({});
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const wRes = await fetch(`/api/weddings/${weddingId}`);
        if (!wRes.ok) throw new Error("wedding not found");
        const weddingData = (await wRes.json()) as WeddingDetail;

        // For each moment, resolve its FINAL layout's plan (arrangement + seating).
        const entries = await Promise.all(
          (weddingData.moments ?? []).map(async (m) => {
            const lRes = await fetch(`/api/moments/${m.id}/layouts`);
            if (!lRes.ok) return [m.id, null] as const;
            const { layouts } = (await lRes.json()) as { layouts: { id: string; isFinal: boolean }[] };
            const final = layouts?.find((l) => l.isFinal);
            if (!final) return [m.id, null] as const;
            const pRes = await fetch(`/api/layouts/${final.id}/plan`);
            if (!pRes.ok) return [m.id, null] as const;
            const d = (await pRes.json()) as MomentPlan;
            return [m.id, d] as const;
          })
        );
        if (cancelled) return;
        setWedding(weddingData);
        setPlans(Object.fromEntries(entries.filter(([, v]) => v)) as Record<string, MomentPlan>);
      } catch {
        if (!cancelled) setError("Não foi possível carregar a vista do casal.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [weddingId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/weddings/${weddingId}/groups`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
      if (!cancelled && res.ok) setGroups(((await res.json()) as PlanGroup[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [weddingId]);

  if (loading) return <p>A carregar...</p>;
  if (error || !wedding) return <p style={{ color: "#dc2626" }}>{error ?? "Casamento não encontrado."}</p>;

  // Guest summary from any seating moment's guest list (they share the wedding's guests).
  const anyPlan = Object.values(plans)[0];
  const guestCount = anyPlan?.guests.length ?? 0;
  const confirmedCount = anyPlan?.guests.filter((g) => g.rsvp === "confirmed").length ?? 0;
  const anySeating = wedding.moments.some((m) => m.hasSeating && plans[m.id]);

  // Chronological order: moments with a start time first (ascending), then the
  // untimed ones in their tab order.
  const timed = wedding.moments
    .filter((m) => parseHM(m.startTime) !== null)
    .sort((a, b) => parseHM(a.startTime)! - parseHM(b.startTime)!);
  const untimed = wedding.moments.filter((m) => parseHM(m.startTime) === null);
  const sortedMoments = [...timed, ...untimed];

  function tableViewsFor(m: Moment, plan: MomentPlan): PlanTableView[] {
    return plan.tables.map((t, i) => ({
      id: t.id,
      shape: t.shape,
      capacity: t.capacity,
      x: t.x,
      y: t.y,
      label: `Mesa ${i + 1}`,
      name: t.name,
      heads: t.heads,
      fixed: t.fixed,
      width: t.width,
      depth: t.depth,
      // Seated guests only when the moment has a seating plan.
      guests: m.hasSeating
        ? plan.seats
            .filter((s) => s.tableId === t.id)
            .map((s) => {
              const g = plan.guests.find((x) => x.id === s.guestId);
              return { id: s.guestId, name: g?.name ?? "", locked: false };
            })
        : [],
    }));
  }

  async function handleExportPdf(m: Moment) {
    const stage = stageRefs.current[m.id];
    if (!stage || !wedding) return;
    setExportingId(m.id);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      doc.setFontSize(16);
      doc.text(`${wedding.couple} — ${momentTitle(m)}`, margin, margin);
      let y = margin;
      if (wedding.venue?.name) {
        doc.setFontSize(11);
        doc.text(wedding.venue.name, margin, y + 18);
        y += 18;
      }
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      const imgTop = y + 24;
      let imgWidth = pageWidth - margin * 2;
      let imgHeight = imgWidth * (stage.height() / stage.width());
      const availableHeight = pageHeight - imgTop - margin;
      if (imgHeight > availableHeight) {
        const shrink = availableHeight / imgHeight;
        imgWidth *= shrink;
        imgHeight *= shrink;
      }
      doc.addImage(dataUrl, "PNG", margin, imgTop, imgWidth, imgHeight);

      const plan = plans[m.id];
      if (m.hasSeating && plan) {
        const grouped = groupGuestsByTable(plan.guests, plan.tables);
        if (grouped.length > 0) {
          let textY = imgTop + imgHeight + 24;
          doc.setFontSize(11);
          for (const g of grouped) {
            const lines = doc.splitTextToSize(`${g.label}: ${g.names.join(", ")}`, pageWidth - margin * 2) as string[];
            for (const line of lines) {
              if (textY > pageHeight - margin) {
                doc.addPage();
                textY = margin;
              }
              doc.text(line, margin, textY);
              textY += 14;
            }
          }
        }
      }
      doc.save(buildPdfFilename(wedding.couple, momentTitle(m)));
    } finally {
      setExportingId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          {guestCount} convidados · {confirmedCount} confirmados
        </p>
        {anySeating && (
          <label style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Pintar por:{" "}
            <select
              data-testid="couple-color-attr-select"
              value={colorAttr ?? ""}
              onChange={(e) => setColorAttr((e.target.value || null) as AttributeKey | null)}
              style={{ padding: "4px 8px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--heading)" }}
            >
              {COLOR_ATTR_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {wedding.moments.length === 0 && <Placeholder text="Sem momentos definidos." />}

      {sortedMoments.map((m, idx) => {
        const plan = plans[m.id] ?? null;
        const openTasks = m.tasks.filter((t) => !t.done).length;
        // Duration = interval until the next moment's start time (chronological).
        const startMin = parseHM(m.startTime);
        const nextMin = parseHM(sortedMoments[idx + 1]?.startTime ?? null);
        const durationLabel =
          startMin !== null && nextMin !== null && nextMin > startMin ? fmtDuration(nextMin - startMin) : "";
        const colorMap =
          m.hasSeating && plan && colorAttr ? buildColorMap(plan.guests, colorAttr) : { legend: [], colorByGuest: {} };
        return (
          <section key={m.id} style={sectionStyle()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h2 style={{ marginTop: 0, marginBottom: 0, color: "var(--heading)", display: "flex", alignItems: "baseline", gap: 10 }}>
                {momentTitle(m)}
                {m.startTime && (
                  <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-muted)" }}>
                    {m.startTime}
                    {durationLabel && ` · ${durationLabel}`}
                  </span>
                )}
              </h2>
              {plan && plan.tables.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleExportPdf(m)}
                  disabled={exportingId === m.id}
                  style={{ padding: "6px 14px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--heading)", cursor: exportingId === m.id ? "default" : "pointer", fontSize: 13, fontWeight: 500, opacity: exportingId === m.id ? 0.6 : 1 }}
                >
                  {exportingId === m.id ? "A exportar..." : "Exportar PDF"}
                </button>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              {plan && plan.tables.length > 0 ? (
                <PlanCanvas
                  imageUrl={imageUrlFor(plan.background?.image ?? "")}
                  tables={tableViewsFor(m, plan)}
                  scale={plan.background?.scale ?? 0}
                  roomWidth={plan.background?.width ?? 0}
                  roomDepth={plan.background?.depth ?? 0}
                  zones={[]}
                  elements={parseElements(plan.background?.elements ?? null)}
                  overCapacityIds={[]}
                  maxWidth={CANVAS_WIDTH}
                  maxHeight={CANVAS_HEIGHT}
                  onAssign={noop}
                  onToggleGuestLock={noop}
                  onToggleTableFixed={noop}
                  onSwap={noop}
                  colorByGuest={colorMap.colorByGuest}
                  readOnly
                  onStageReady={(stage) => {
                    stageRefs.current[m.id] = stage;
                  }}
                />
              ) : (
                <Placeholder text="Layout por definir (marca um como final no momento)." />
              )}
            </div>

            {m.hasSeating && colorAttr && colorMap.legend.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
                {colorMap.legend.map((entry) => (
                  <span key={entry.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: entry.color, display: "inline-block", flexShrink: 0 }} />
                    {legendLabel(colorAttr, entry.value, groups)}
                  </span>
                ))}
              </div>
            )}

            {m.decor.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 14, color: "var(--heading)" }}>Decoração</h3>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--text-muted)" }}>
                  {m.decor.map((d) => (
                    <li key={d.id}>
                      {d.decorItem?.name ?? d.name ?? "Item"}
                      {d.quantity > 1 ? ` ×${d.quantity}` : ""}
                      {d.decorItem ? "" : " (próprio)"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {m.tasks.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 14, color: "var(--heading)" }}>
                  Tarefas <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>({m.tasks.length - openTasks}/{m.tasks.length} concluídas)</span>
                </h3>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {m.tasks.map((t) => (
                    <li key={t.id} style={{ color: t.done ? "var(--text-muted)" : "inherit", textDecoration: t.done ? "line-through" : "none" }}>
                      {t.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
