"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { PlanTableView } from "@/components/plan/PlanCanvas";

// Reused for the Detalhes moment thumbnail: a SMALL read-only render of the
// template's tables placed on its room — no zones, no seated guests. Loaded
// dynamically (ssr:false) same as every other Konva-backed canvas in this app
// (see CoupleView), since react-konva touches the DOM.
const PlanCanvas = dynamic(() => import("@/components/plan/PlanCanvas"), { ssr: false });

const MAX_WIDTH = 220;
const MAX_HEIGHT = 150;

export interface ArrangementThumbnailFloorPlan {
  image: string | null;
  scale: number;
  /** Metres — feeds the blank-room render (Plan 18 Task 7) when `image` is empty. */
  width: number;
  depth: number;
}

export interface ArrangementThumbnailTemplate {
  id: string;
  floorPlan: ArrangementThumbnailFloorPlan | null;
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

// Same rel-path convention used throughout (WeddingDetails, CoupleView): the DB
// stores image paths like "data/uploads/<file>" — strip that prefix so the
// browser hits the /api/uploads/<file> route instead.
function imageUrlFor(image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  const rel = image.replace(/^data\/uploads\//, "").replace(/\\/g, "/");
  return `/api/uploads/${rel}`;
}

// Required by PlanCanvas's prop types even though nothing can trigger them here
// (readOnly makes every interactive path unreachable) — a single shared no-op.
function noop() {}

function Placeholder() {
  return (
    <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
      sem imagem
    </span>
  );
}

/**
 * Small rendered arrangement (tables placed on the room) for a moment's chosen
 * template — used as the Detalhes moment thumbnail instead of the bare floor-plan
 * photo. Deliberately renders with `zones={[]}` (no zone shading) and no seated
 * guests (an arrangement, not a seating plan) — same read-only pattern CoupleView
 * uses for the full-size render, just boxed down to thumbnail size.
 */
export default function ArrangementThumbnail({ template }: { template: ArrangementThumbnailTemplate }) {
  const [tables, setTables] = useState<TemplateTableRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTables(null);
    async function load() {
      try {
        const res = await fetch(`/api/templates/${template.id}/tables`);
        if (!res.ok) return;
        const data = (await res.json()) as TemplateTableRow[];
        if (!cancelled) setTables(data);
      } catch {
        // ignore — falls back to the placeholder below
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [template.id]);

  const floorPlan = template.floorPlan;
  if (!floorPlan) return <Placeholder />;
  if (tables === null) return null; // still loading — avoid a placeholder flash
  if (tables.length === 0) return <Placeholder />;

  const views: PlanTableView[] = tables.map((t, i) => ({
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
    <div
      style={{
        display: "inline-block",
        border: "1px solid var(--border)",
        borderRadius: 4,
        background: "#fff",
        lineHeight: 0,
      }}
    >
      <PlanCanvas
        imageUrl={imageUrlFor(floorPlan.image)}
        tables={views}
        scale={floorPlan.scale}
        roomWidth={floorPlan.width}
        roomDepth={floorPlan.depth}
        zones={[]}
        overCapacityIds={[]}
        maxWidth={MAX_WIDTH}
        maxHeight={MAX_HEIGHT}
        onAssign={noop}
        onToggleGuestLock={noop}
        onToggleTableFixed={noop}
        onSwap={noop}
        readOnly
      />
    </div>
  );
}
