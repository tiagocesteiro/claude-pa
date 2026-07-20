"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import type { Point } from "@/lib/floorplan/geometry";
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

function legendLabel(attr: AttributeKey, value: string, groups: PlanGroup[]): string {
  if (attr === "ageGroup") return AGE_GROUP_LABELS[value] ?? value;
  if (attr === "group") return groups.find((g) => g.id === value)?.name ?? value;
  return value;
}

const KIND_LABELS: Record<string, string> = {
  ceremony: "Cerimónia",
  cocktail: "Cocktail",
  dinner: "Jantar",
  dance: "Dança",
};

interface FloorPlanRecord {
  id: string;
  image: string;
  scale: number;
  width: number;
  depth: number;
  zones: string | null;
  elements: string | null;
}
interface TemplateRecord {
  id: string;
  floorPlanId: string | null;
  floorPlan: FloorPlanRecord | null;
}
interface Task {
  id: string;
  text: string;
  done: boolean;
  assignee: string;
  supplierId: string | null;
}
interface DecorLine {
  id: string;
  name: string | null;
  quantity: number;
  decorItem: { name: string; category: string | null; price: number | null } | null;
}
interface Moment {
  id: string;
  kind: string | null;
  title: string | null;
  floorPlanId: string | null;
  floorPlan: FloorPlanRecord | null;
  templateId: string | null;
  template: TemplateRecord | null;
  notes: string | null;
  tasks: Task[];
  decor: DecorLine[];
}
interface VenueRecord {
  id: string;
  name: string;
}
interface WeddingDetail {
  id: string;
  couple: string;
  venue?: VenueRecord | null;
  moments: Moment[];
}
interface TemplateTableRow {
  id: string;
  shape: string;
  capacity: number;
  x: number;
  y: number;
  fixed: boolean;
  width: number | null;
  depth: number | null;
  name: string | null;
  heads: boolean | null;
}

const PlanCanvas = dynamic(() => import("@/components/plan/PlanCanvas"), { ssr: false });
const FloorPlanCanvas = dynamic(() => import("@/components/editor/FloorPlanCanvas"), { ssr: false });

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 560;

function momentTitle(m: Moment): string {
  return m.title ?? (m.kind ? KIND_LABELS[m.kind] ?? m.kind : "Momento");
}

function parseZones(zones: string | null | undefined): Point[][] {
  if (!zones) return [];
  try {
    return JSON.parse(zones) as Point[][];
  } catch {
    return [];
  }
}

function noop() {}

function sectionStyle(): React.CSSProperties {
  return {
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--surface)",
    padding: 20,
    marginBottom: 24,
  };
}

function Placeholder({ text }: { text: string }) {
  return <p style={{ color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>{text}</p>;
}

export default function CoupleView({ weddingId }: { weddingId: string }) {
  const [wedding, setWedding] = useState<WeddingDetail | null>(null);
  const [plan, setPlan] = useState<{ guests: PlanGuest[]; tables: PlanTable[]; layout: PlanLayout | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templateTables, setTemplateTables] = useState<Record<string, TemplateTableRow[]>>({});
  const [groups, setGroups] = useState<PlanGroup[]>([]);
  const [colorAttr, setColorAttr] = useState<AttributeKey | null>(null);
  const stageRefs = useRef<Record<string, Konva.Stage | null>>({});
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [weddingRes, layoutsRes] = await Promise.all([
          fetch(`/api/weddings/${weddingId}`),
          fetch(`/api/weddings/${weddingId}/layouts`),
        ]);
        if (!weddingRes.ok) throw new Error("wedding not found");
        const weddingData = (await weddingRes.json()) as WeddingDetail;

        // DINNER render comes from the couple's FINAL layout; fallback to the
        // legacy wedding arrangement when no layout is marked final yet.
        let planData: { guests: PlanGuest[]; tables: PlanTable[]; layout: PlanLayout | null } = {
          guests: [],
          tables: [],
          layout: null,
        };
        let finalId: string | null = null;
        if (layoutsRes.ok) {
          const { layouts } = (await layoutsRes.json()) as { layouts: { id: string; isFinal: boolean }[] };
          finalId = layouts?.find((l) => l.isFinal)?.id ?? null;
        }
        if (finalId) {
          const pRes = await fetch(`/api/layouts/${finalId}/plan`);
          if (pRes.ok) {
            const d = (await pRes.json()) as {
              guests: PlanGuest[];
              tables: PlanTable[];
              seats?: { guestId: string; tableId: string }[];
              background?: PlanLayout | null;
            };
            const seatBy = new Map((d.seats ?? []).map((s) => [s.guestId, s.tableId]));
            planData = {
              guests: (d.guests ?? []).map((g) => ({ ...g, assignedTableId: seatBy.get(g.id) ?? null })),
              tables: d.tables ?? [],
              layout: d.background ?? null,
            };
          }
        } else {
          const planRes = await fetch(`/api/weddings/${weddingId}/plan`);
          if (planRes.ok) planData = (await planRes.json()) as typeof planData;
        }
        if (cancelled) return;
        setWedding(weddingData);
        setPlan(planData);
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

  // Template tables for non-dinner moments that reference a venue arrangement.
  useEffect(() => {
    const templateIds = Array.from(
      new Set((wedding?.moments ?? []).map((m) => m.templateId).filter((id): id is string => Boolean(id)))
    );
    if (templateIds.length === 0) return;
    let cancelled = false;
    async function loadTemplateTables() {
      const entries = await Promise.all(
        templateIds.map(async (id) => {
          try {
            const res = await fetch(`/api/templates/${id}/tables`);
            if (!res.ok) return [id, []] as const;
            return [id, (await res.json()) as TemplateTableRow[]] as const;
          } catch {
            return [id, []] as const;
          }
        })
      );
      if (cancelled) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- data load triggered by moments change
      setTemplateTables((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    }
    loadTemplateTables();
    return () => {
      cancelled = true;
    };
  }, [wedding?.moments]);

  useEffect(() => {
    let cancelled = false;
    async function loadGroups() {
      try {
        const res = await fetch(`/api/weddings/${weddingId}/groups`);
        if (!res.ok) return;
        const data = (await res.json()) as PlanGroup[];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load on mount/wedding change
        if (!cancelled) setGroups(data ?? []);
      } catch {
        // silent
      }
    }
    loadGroups();
    return () => {
      cancelled = true;
    };
  }, [weddingId]);

  const tables = plan?.tables ?? [];
  const layout = plan?.layout ?? null;

  const tableLabels = useMemo(() => {
    const map = new Map<string, string>();
    tables.forEach((t, i) => map.set(t.id, `Mesa ${i + 1}`));
    return map;
  }, [tables]);

  const dinnerGuests = plan?.guests ?? [];
  const dinnerTableViews: PlanTableView[] = useMemo(
    () =>
      tables.map((t) => ({
        id: t.id,
        shape: t.shape,
        capacity: t.capacity,
        x: t.x,
        y: t.y,
        label: tableLabels.get(t.id),
        name: t.name,
        heads: t.heads,
        fixed: t.fixed,
        width: t.width,
        depth: t.depth,
        guests: dinnerGuests
          .filter((g) => g.assignedTableId === t.id)
          .map((g) => ({ id: g.id, name: g.name, locked: g.locked })),
      })),
    [tables, dinnerGuests, tableLabels]
  );

  const colorMap = useMemo(
    () => (colorAttr ? buildColorMap(dinnerGuests, colorAttr) : { legend: [], colorByGuest: {} }),
    [dinnerGuests, colorAttr]
  );

  const hasDinnerPlan = Boolean(layout) && tables.length > 0;
  const guestCount = plan?.guests.length ?? 0;
  const confirmedCount = plan?.guests.filter((g) => g.rsvp === "confirmed").length ?? 0;

  if (loading) return <p>A carregar...</p>;
  if (error || !wedding) return <p style={{ color: "#dc2626" }}>{error ?? "Casamento não encontrado."}</p>;

  function momentHasPlan(m: Moment): boolean {
    if (m.kind === "dinner") return hasDinnerPlan;
    if (m.template) return Boolean(m.template.floorPlan);
    return Boolean(m.floorPlan);
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
      const stageWidth = stage.width();
      const stageHeight = stage.height();
      const imgTop = y + 24;
      let imgWidth = pageWidth - margin * 2;
      let imgHeight = imgWidth * (stageHeight / stageWidth);
      const availableHeight = pageHeight - imgTop - margin;
      if (imgHeight > availableHeight) {
        const shrink = availableHeight / imgHeight;
        imgWidth *= shrink;
        imgHeight *= shrink;
      }
      doc.addImage(dataUrl, "PNG", margin, imgTop, imgWidth, imgHeight);

      if (m.kind === "dinner" && plan) {
        const grouped = groupGuestsByTable(plan.guests, plan.tables);
        if (grouped.length > 0) {
          let textY = imgTop + imgHeight + 24;
          doc.setFontSize(11);
          const maxTextWidth = pageWidth - margin * 2;
          for (const g of grouped) {
            const lines = doc.splitTextToSize(`${g.label}: ${g.names.join(", ")}`, maxTextWidth) as string[];
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: hasDinnerPlan ? 8 : 20,
        }}
      >
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          {guestCount} convidados · {confirmedCount} confirmados
        </p>
        {hasDinnerPlan && (
          <label style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Pintar por (jantar):{" "}
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

      {hasDinnerPlan && colorAttr && colorMap.legend.length > 0 && (
        <div data-testid="couple-color-legend" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          {colorMap.legend.map((entry) => (
            <span key={entry.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: entry.color, display: "inline-block", flexShrink: 0 }} />
              {legendLabel(colorAttr, entry.value, groups)}
            </span>
          ))}
        </div>
      )}

      {wedding.moments.length === 0 && <Placeholder text="Sem momentos definidos." />}

      {wedding.moments.map((m) => {
        const openTasks = m.tasks.filter((t) => !t.done).length;
        return (
          <section key={m.id} style={sectionStyle()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h2 style={{ marginTop: 0, marginBottom: 0, color: "var(--heading)" }}>{momentTitle(m)}</h2>
              {momentHasPlan(m) && (
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

            {/* Arrangement */}
            <div style={{ marginTop: 12 }}>
              {m.kind === "dinner" ? (
                hasDinnerPlan ? (
                  <PlanCanvas
                    imageUrl={imageUrlFor(layout?.image)}
                    tables={dinnerTableViews}
                    scale={layout?.scale ?? 0}
                    roomWidth={layout?.width ?? 0}
                    roomDepth={layout?.depth ?? 0}
                    zones={[]}
                    elements={parseElements(layout?.elements)}
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
                  <Placeholder text="Plano de mesas por definir (marca um layout como final)." />
                )
              ) : m.template ? (
                m.template.floorPlan ? (
                  <PlanCanvas
                    imageUrl={imageUrlFor(m.template.floorPlan.image)}
                    tables={(templateTables[m.template.id] ?? []).map((t, i) => ({
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
                      guests: [],
                    }))}
                    scale={m.template.floorPlan.scale}
                    roomWidth={m.template.floorPlan.width}
                    roomDepth={m.template.floorPlan.depth}
                    zones={parseZones(m.template.floorPlan.zones)}
                    elements={parseElements(m.template.floorPlan.elements)}
                    overCapacityIds={[]}
                    maxWidth={CANVAS_WIDTH}
                    maxHeight={CANVAS_HEIGHT}
                    onAssign={noop}
                    onToggleGuestLock={noop}
                    onToggleTableFixed={noop}
                    onSwap={noop}
                    readOnly
                    onStageReady={(stage) => {
                      stageRefs.current[m.id] = stage;
                    }}
                  />
                ) : (
                  <Placeholder text="Arranjo sem planta associada." />
                )
              ) : m.floorPlan ? (
                <FloorPlanCanvas
                  imageUrl={imageUrlFor(m.floorPlan.image)}
                  tables={[]}
                  scale={m.floorPlan.scale}
                  roomWidth={m.floorPlan.width}
                  roomDepth={m.floorPlan.depth}
                  selectedId={null}
                  mode="select"
                  zones={parseZones(m.floorPlan.zones)}
                  elements={parseElements(m.floorPlan.elements)}
                  maxWidth={CANVAS_WIDTH}
                  maxHeight={CANVAS_HEIGHT}
                  onAddTable={noop}
                  onMoveTable={noop}
                  onSelect={noop}
                  onStageReady={(stage) => {
                    stageRefs.current[m.id] = stage;
                  }}
                />
              ) : (
                <Placeholder text="Arranjo por definir." />
              )}
            </div>

            {/* Decoration summary */}
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

            {/* Tasks summary */}
            {m.tasks.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 14, color: "var(--heading)" }}>
                  Tarefas{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>
                    ({m.tasks.length - openTasks}/{m.tasks.length} concluídas)
                  </span>
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
