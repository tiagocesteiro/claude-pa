"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Point } from "@/lib/floorplan/geometry";
import type { PlanTableView } from "@/components/plan/PlanCanvas";
import type { PlanGuest, PlanTable, PlanLayout } from "@/components/plan/usePlan";

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
  zones: string | null;
}

interface Moment {
  id: string;
  kind: MomentKind;
  floorPlanId: string | null;
  floorPlan: FloorPlanRecord | null;
}

interface WeddingDetail {
  id: string;
  couple: string;
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

  const tables = plan?.tables ?? [];
  const guests = plan?.guests ?? [];
  const layout = plan?.layout ?? null;

  const tableLabels = useMemo(() => {
    const map = new Map<string, string>();
    tables.forEach((t, i) => map.set(t.id, `Mesa ${i + 1}`));
    return map;
  }, [tables]);

  const tableViews: PlanTableView[] = useMemo(
    () =>
      tables.map((t) => ({
        id: t.id,
        shape: t.shape,
        capacity: t.capacity,
        x: t.x,
        y: t.y,
        label: tableLabels.get(t.id),
        fixed: t.fixed,
        width: t.width,
        depth: t.depth,
        guests: guests
          .filter((g) => g.assignedTableId === t.id)
          .map((g) => ({ id: g.id, name: g.name, locked: g.locked })),
      })),
    [tables, guests, tableLabels]
  );

  const dinnerZones = useMemo(() => parseZones(layout?.zones), [layout?.zones]);
  const hasDinnerPlan = Boolean(layout) && tables.length > 0;

  if (loading) return <p>A carregar...</p>;
  if (error || !wedding) return <p style={{ color: "#dc2626" }}>{error ?? "Casamento não encontrado."}</p>;

  const momentByKind = new Map(wedding.moments.map((m) => [m.kind, m]));

  return (
    <div>
      {DISPLAY_ORDER.map((kind) => (
        <section key={kind} style={sectionStyle()}>
          <h2 style={{ marginTop: 0, color: "var(--heading)" }}>{MOMENT_LABELS[kind]}</h2>

          {kind === "dinner" ? (
            hasDinnerPlan ? (
              <PlanCanvas
                imageUrl={imageUrlFor(layout?.image)}
                tables={tableViews}
                scale={layout?.scale ?? 0}
                zones={dinnerZones}
                overCapacityIds={[]}
                maxWidth={CANVAS_WIDTH}
                maxHeight={CANVAS_HEIGHT}
                onAssign={noop}
                onToggleGuestLock={noop}
                onToggleTableFixed={noop}
                onSwap={noop}
                readOnly
              />
            ) : (
              <Placeholder text="Plano de mesas por definir." />
            )
          ) : (
            (() => {
              const moment = momentByKind.get(kind);
              const floorPlan = moment?.floorPlan ?? null;
              if (!floorPlan) return <Placeholder text="Planta por definir." />;
              return (
                <FloorPlanCanvas
                  imageUrl={imageUrlFor(floorPlan.image)}
                  tables={[]}
                  scale={floorPlan.scale}
                  selectedId={null}
                  mode="select"
                  zones={parseZones(floorPlan.zones)}
                  maxWidth={CANVAS_WIDTH}
                  maxHeight={CANVAS_HEIGHT}
                  onAddTable={noop}
                  onMoveTable={noop}
                  onSelect={noop}
                />
              );
            })()
          )}
        </section>
      ))}
    </div>
  );
}
