import { NextResponse } from "next/server";
import { createFloorPlan } from "@/lib/db/floorplans";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const plans = await prisma.floorPlan.findMany({
    orderBy: { createdAt: "desc" },
    include: { venue: { select: { name: true } } },
  });
  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const b = await req.json();
  if (!b?.venueId) return NextResponse.json({ error: "venueId required" }, { status: 400 });
  const fp = await createFloorPlan({
    venueId: b.venueId,
    image: b.image ?? "",
    scale: b.scale ?? 0,
    width: b.width ?? 0,
    depth: b.depth ?? 0,
  });
  return NextResponse.json(fp, { status: 201 });
}
