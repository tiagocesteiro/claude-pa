import { NextResponse } from "next/server";
import { createFloorPlan } from "@/lib/db/floorplans";
import { assertVenueAccess, listFloorPlansFor } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function GET() {
  // Fase D2a: venue → own venues' plans; couple → plans of their weddings' venues; admin → all.
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  return NextResponse.json(await listFloorPlansFor(actor));
}

export async function POST(req: Request) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const b = await req.json().catch(() => ({}));
  if (!b?.venueId) return NextResponse.json({ error: "venueId required" }, { status: 400 });
  // A floor plan is venue-owned — you may only create one under a venue you own.
  try {
    await assertVenueAccess(actor, b.venueId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const fp = await createFloorPlan({
    venueId: b.venueId,
    image: b.image ?? "",
    scale: b.scale ?? 0,
    width: b.width ?? 0,
    depth: b.depth ?? 0,
    name: typeof b.name === "string" ? b.name : null,
  });
  return NextResponse.json(fp, { status: 201 });
}
