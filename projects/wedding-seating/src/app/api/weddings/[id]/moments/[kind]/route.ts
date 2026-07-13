import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getWedding } from "@/lib/db/weddings";
import { isMomentKind, setMomentFloorPlan, setMomentNotes, setMomentTemplate } from "@/lib/db/moments";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; kind: string }> }
) {
  const { id, kind } = await params;
  if (!isMomentKind(kind)) {
    return NextResponse.json({ error: "invalid moment kind" }, { status: 400 });
  }

  const b = await req.json().catch(() => ({}));

  const wedding = await getWedding(id);
  if (!wedding) return NextResponse.json({ error: "wedding not found" }, { status: 404 });

  // Notes are independent of the arrangement fields below — a plain-text save that
  // never touches floorPlanId/templateId. Checked first so a `{ notes }`-only body
  // (the common case, from the Detalhes notes textarea) short-circuits here.
  if ("notes" in b) {
    const notes: string | null = b.notes ?? null;
    const moment = await setMomentNotes(id, kind, notes);
    return NextResponse.json(moment);
  }

  // Two independent assignment paths: a venue "template" (arrangement with tables — the
  // normal case for ceremony/cocktail/dance) or a legacy bare "floorPlanId" (room-only,
  // backward compat). `templateId` in the body takes that branch; otherwise fall back to
  // the floorPlanId branch (present or not — absent means "clear/no-op with null").
  if ("templateId" in b) {
    const templateId: string | null = b.templateId ?? null;

    if (templateId) {
      const template = await prisma.layoutTemplate.findUnique({ where: { id: templateId } });
      if (!template || template.venueId !== wedding.venueId) {
        return NextResponse.json({ error: "arranjo não pertence à quinta" }, { status: 400 });
      }
    }

    const moment = await setMomentTemplate(id, kind, templateId);
    return NextResponse.json(moment);
  }

  const floorPlanId: string | null = b?.floorPlanId ?? null;

  if (floorPlanId) {
    const floorPlan = await prisma.floorPlan.findUnique({ where: { id: floorPlanId } });
    if (!floorPlan || floorPlan.venueId !== wedding.venueId) {
      return NextResponse.json({ error: "planta não pertence à quinta" }, { status: 400 });
    }
  }

  const moment = await setMomentFloorPlan(id, kind, floorPlanId);
  return NextResponse.json(moment);
}
