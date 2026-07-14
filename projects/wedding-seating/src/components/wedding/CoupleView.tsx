"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import type { Point } from "@/lib/floorplan/geometry";
import type { PlanTableView } from "@/components/plan/PlanCanvas";
import type { PlanGuest, PlanTable, PlanLayout } from "@/components/plan/usePlan";
import { parseElements } from "@/lib/floorplan/elements";
import { buildPdfFilename, groupGuestsByTable } from "@/lib/plan/pdfExport";

// Mirrors MOMENT_KINDS in src/lib/db/moments.ts — duplicated (not imported) so this
// client component doesn't pull the server-only Prisma module into the browser bundle.
const MOMENT_KINDS = ["ceremony", "cocktail", "dinner", "dance"] as const;
type MomentKind = (typeof MOMENT_KINDS)[number];

const MOMENT_LABELS: Record<MomentKind, string> = {
  ceremony: "Cerimónia",
  cocktail: "Cocktail",
  dinner: "Jantar",
  dance: "Dança",
};

// Couple view shows the 4 moments in this fixed order (not the raw moments array order).
const DISPLAY_ORDER: MomentKind[] = ["ceremony", "cocktail", "dinner", "dance"];

interface FloorPlanRecord {
  id: string;
  image: string;
  scale: number;
  /** Metres — feeds the blank-room render (Plan 18 Task 7) when `image` is empty. */
  width: number;
  depth: number;
  zones: string | null;
  /** JSON list of decorative room elements (dance floor, bar, ...) — Plan 18 Task 8. */
  elements: string | null;
}

interface TemplateRecord {
  id: string;
  floorPlanId: string | null;
  floorPlan: FloorPlanRecord | null;
}

interface Moment {
  id: string;
  kind: MomentKind;
  floorPlanId: string | null;
  floorPlan: FloorPlanRecord | null;
  templateId: string | null;
  template: TemplateRecord | null;
  notes: string | null;
}

/** Raw row shape returned by GET /api/templates/[id]/tables (Prisma Table) — mapped
 * below into PlanTableView (no seated guests: an arrangement, not a seating plan). */
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

interface PlanResponse {
  guests: PlanGuest[];
  tables: PlanTable[];
  layout: PlanLayout | null;
}

const PlanCanvas = dynamic(() => import("@/components/plan/PlanCanvas"), { ssr: false });
const FloorPlanCanvas = dynamic(() => import("@/components/editor/FloorPlanCanvas"), { ssr: false });

// Same on-screen bounds convention as the Plan 2 floor-plan editor and the Plano de
// mesas tab; each moment's canvas fits inside this box preserving its image's aspect ratio.
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 560;

function imageUrlFor(image: string | undefined): string | undefined {
  if (!image) return undefined;
  const rel = image.replace(/^data\/uploads\//, "").replace(/\\/g, "/");
  return `/api/uploads/${rel}`;
}

function parseZones(zones: string | null | undefined): Point[][] {
  if (!zones) return [];
  try {
    return JSON.parse(zones) as Point[][];
  } catch {
    return [];
  }
}

// Required by PlanCanvas/FloorPlanCanvas's prop types even though nothing can trigger
// them here (readOnly / tables=[] make every interactive path unreachable) — kept as a
// single shared no-op so the intent ("this view never mutates anything") reads clearly.
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
  return (
    <p style={{ color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>{text}</p>
  );
}

export default function CoupleView({ weddingId }: { weddingId: string }) {
  const [wedding, setWedding] = useState<WeddingDetail | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templateTables, setTemplateTables] = useState<Record<string, TemplateTableRow[]>>({});
  // Per-moment Konva stage instances (Plan 18 Task 10 — "Exportar PDF"), populated via
  // each canvas's onStageReady as it mounts/unmounts. A ref (not state) because the
  // stage instance itself never needs to trigger a re-render — it's read on demand
  // when the export button is clicked.
  const stageRefs = useRef<Record<MomentKind, Konva.Stage | null>>({
    ceremony: null,
    cocktail: null,
    dinner: null,
    dance: null,
  });
  const [exportingKind, setExportingKind] = useState<MomentKind | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [weddingRes, planRes] = await Promise.all([
          fetch(`/api/weddings/${weddingId}`),
          fetch(`/api/weddings/${weddingId}/plan`),
        ]);
        if (!weddingRes.ok) throw new Error("wedding not found");
        const weddingData = (await weddingRes.json()) as WeddingDetail;
        const planData = planRes.ok
          ? ((await planRes.json()) as PlanResponse)
          : { guests: [], tables: [], layout: null };
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

  // Each non-dinner moment that has a venue arrangement (templateId) needs that
  // template's positioned tables to render read-only — fetched once per distinct
  // template id whenever the wedding's moments change.
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

  const tables = plan?.tables ?? [];
  const layout = plan?.layout ?? null;

  const tableLabels = useMemo(() => {
    const map = new Map<string, string>();
    tables.forEach((t, i) => map.set(t.id, `Mesa ${i + 1}`));
    return map;
  }, [tables]);

  // Couple view is arrangement-only: show the table layout with NO seated guests
  // (empty chairs, no name chips) for every moment, dinner included. The actual
  // seating (who sits where) lives on the couple's Seating plan tab.
  const tableViews: PlanTableView[] = useMemo(
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
        guests: [],
      })),
    [tables, tableLabels]
  );

  const hasDinnerPlan = Boolean(layout) && tables.length > 0;

  // Guest summary header (Task 1, Plan 18): counts over the plan's guest list, which
  // already carries each guest's rsvp from /api/weddings/[id]/plan.
  const guestCount = plan?.guests.length ?? 0;
  const confirmedCount = plan?.guests.filter((g) => g.rsvp === "confirmed").length ?? 0;

  if (loading) return <p>A carregar...</p>;
  if (error || !wedding) return <p style={{ color: "#dc2626" }}>{error ?? "Casamento não encontrado."}</p>;

  const momentByKind = new Map(wedding.moments.map((m) => [m.kind, m]));

  // Mirrors the Placeholder-vs-canvas branching below (dinner/template/legacy-floor-
  // plan) without duplicating the JSX — used only to enable/disable each section's
  // "Exportar PDF" button.
  function momentHasPlan(kind: MomentKind): boolean {
    if (kind === "dinner") return hasDinnerPlan;
    const moment = momentByKind.get(kind);
    const template = moment?.template ?? null;
    if (template) return Boolean(template.floorPlan);
    return Boolean(moment?.floorPlan);
  }

  // Exports the given moment's rendered plan as a PDF: a header (couple + moment +
  // venue), the room's Konva stage captured as a PNG, and — dinner only — a
  // per-table seated-guest name list. Client-side and self-contained: jsPDF is
  // bundled (no CDN) and imported dynamically so it never enters the SSR bundle.
  async function handleExportPdf(kind: MomentKind) {
    const stage = stageRefs.current[kind];
    if (!stage || !wedding) return;
    setExportingKind(kind);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;

      doc.setFontSize(16);
      doc.text(`${wedding.couple} — ${MOMENT_LABELS[kind]}`, margin, margin);
      let y = margin;
      if (wedding.venue?.name) {
        doc.setFontSize(11);
        doc.text(wedding.venue.name, margin, y + 18);
        y += 18;
      }

      // Fit the captured stage image to the page width, preserving aspect ratio;
      // shrink further only if that would overflow the remaining page height.
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

      if (kind === "dinner" && plan) {
        const groups = groupGuestsByTable(plan.guests, plan.tables);
        if (groups.length > 0) {
          let textY = imgTop + imgHeight + 24;
          doc.setFontSize(11);
          const maxTextWidth = pageWidth - margin * 2;
          for (const g of groups) {
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

      doc.save(buildPdfFilename(wedding.couple, MOMENT_LABELS[kind]));
    } finally {
      setExportingKind(null);
    }
  }

  return (
    <div>
      <p style={{ color: "var(--text-muted)", marginTop: 0, marginBottom: 20 }}>
        {guestCount} convidados · {confirmedCount} confirmados
      </p>

      {DISPLAY_ORDER.map((kind) => (
        <section key={kind} style={sectionStyle()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h2 style={{ marginTop: 0, marginBottom: 0, color: "var(--heading)" }}>{MOMENT_LABELS[kind]}</h2>
            {momentHasPlan(kind) && (
              <button
                type="button"
                onClick={() => handleExportPdf(kind)}
                disabled={exportingKind === kind}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--heading)",
                  cursor: exportingKind === kind ? "default" : "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  opacity: exportingKind === kind ? 0.6 : 1,
                }}
              >
                {exportingKind === kind ? "A exportar..." : "Exportar PDF"}
              </button>
            )}
          </div>
          {momentByKind.get(kind)?.notes && (
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: -8, marginBottom: 16 }}>
              {momentByKind.get(kind)?.notes}
            </p>
          )}

          {kind === "dinner" ? (
            hasDinnerPlan ? (
              <PlanCanvas
                imageUrl={imageUrlFor(layout?.image)}
                tables={tableViews}
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
                readOnly
                onStageReady={(stage) => {
                  stageRefs.current.dinner = stage;
                }}
              />
            ) : (
              <Placeholder text="Plano de mesas por definir." />
            )
          ) : (
            (() => {
              const moment = momentByKind.get(kind);
              const template = moment?.template ?? null;

              // Preferred path: a venue-designed table arrangement — its own floor plan
              // (image/scale/zones) with that template's positioned tables rendered
              // read-only, no seated guests (an arrangement, not a seating plan).
              if (template) {
                const templateFloorPlan = template.floorPlan;
                if (!templateFloorPlan) return <Placeholder text="Arranjo sem planta associada." />;
                const rows = templateTables[template.id] ?? [];
                const views: PlanTableView[] = rows.map((t, i) => ({
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
                }));
                return (
                  <PlanCanvas
                    imageUrl={imageUrlFor(templateFloorPlan.image)}
                    tables={views}
                    scale={templateFloorPlan.scale}
                    roomWidth={templateFloorPlan.width}
                    roomDepth={templateFloorPlan.depth}
                    zones={parseZones(templateFloorPlan.zones)}
                    elements={parseElements(templateFloorPlan.elements)}
                    overCapacityIds={[]}
                    maxWidth={CANVAS_WIDTH}
                    maxHeight={CANVAS_HEIGHT}
                    onAssign={noop}
                    onToggleGuestLock={noop}
                    onToggleTableFixed={noop}
                    onSwap={noop}
                    readOnly
                    onStageReady={(stage) => {
                      stageRefs.current[kind] = stage;
                    }}
                  />
                );
              }

              // Legacy path: a bare floor plan (room only, no tables) assigned before
              // templates existed for this moment.
              const floorPlan = moment?.floorPlan ?? null;
              if (!floorPlan) return <Placeholder text="Arranjo por definir." />;
              return (
                <FloorPlanCanvas
                  imageUrl={imageUrlFor(floorPlan.image)}
                  tables={[]}
                  scale={floorPlan.scale}
                  roomWidth={floorPlan.width}
                  roomDepth={floorPlan.depth}
                  selectedId={null}
                  mode="select"
                  zones={parseZones(floorPlan.zones)}
                  elements={parseElements(floorPlan.elements)}
                  maxWidth={CANVAS_WIDTH}
                  maxHeight={CANVAS_HEIGHT}
                  onAddTable={noop}
                  onMoveTable={noop}
                  onSelect={noop}
                  onStageReady={(stage) => {
                    stageRefs.current[kind] = stage;
                  }}
                />
              );
            })()
          )}
        </section>
      ))}
    </div>
  );
}
