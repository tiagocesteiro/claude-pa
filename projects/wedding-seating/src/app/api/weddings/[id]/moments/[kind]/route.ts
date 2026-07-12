import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getWedding } from "@/lib/db/weddings";
import { isMomentKind, setMomentFloorPlan } from "@/lib/db/moments";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; kind: string }> }
) {
  const { id, kind } = await params;
  if (!isMomentKind(kind)) {
    return NextResponse.json({ error: "invalid moment kind" }, { status: 400 });
  }

  const b = await req.json().catch(() => ({}));
  const floorPlanId: string | null = b?.floorPlanId ?? null;

  const wedding = await getWedding(id);
  if (!wedding) return NextResponse.json({ error: "wedding not found" }, { status: 404 });

  if (floorPlanId) {
    const floorPlan = await prisma.floorPlan.findUnique({ where: { id: floorPlanId } });
    if (!floorPlan || floorPlan.venueId !== wedding.venueId) {
      return NextResponse.json({ error: "planta não pertence à quinta" }, { status: 400 });
    }
  }

  const moment = await setMomentFloorPlan(id, kind, floorPlanId);
  return NextResponse.json(moment);
}
