import { NextResponse } from "next/server";
import {
  getFloorPlan,
  updateFloorPlanScale,
  updateFloorPlanSpacing,
  updateFloorPlanBoundary,
  updateFloorPlanZones,
  updateFloorPlanElements,
  updateFloorPlanName,
  updateFloorPlanSpace,
  updateFloorPlanDimensions,
  deleteFloorPlan,
} from "@/lib/db/floorplans";
import { prisma } from "@/lib/db/client";
import { assertFloorPlanAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertFloorPlanAccess(actor, id, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const fp = await getFloorPlan(id);
  return fp ? NextResponse.json(fp) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertFloorPlanAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  // Assign the floor plan to a venue space (must belong to the SAME venue); "" clears it.
  if ("spaceId" in b) {
    const spaceId: string | null = typeof b.spaceId === "string" && b.spaceId ? b.spaceId : null;
    if (spaceId) {
      const [fp, sp] = await Promise.all([
        prisma.floorPlan.findUnique({ where: { id }, select: { venueId: true } }),
        prisma.venueSpace.findUnique({ where: { id: spaceId }, select: { venueId: true } }),
      ]);
      if (!sp || !fp || sp.venueId !== fp.venueId) {
        return NextResponse.json({ error: "espaço não pertence à quinta" }, { status: 400 });
      }
    }
    return NextResponse.json(await updateFloorPlanSpace(id, spaceId));
  }
  if (typeof b?.name === "string" || b?.name === null) {
    return NextResponse.json(await updateFloorPlanName(id, b.name));
  }
  if (typeof b?.minSpacing === "number" || b?.minSpacing === null) {
    return NextResponse.json(await updateFloorPlanSpacing(id, b.minSpacing));
  }
  if (typeof b?.boundary === "string" || b?.boundary === null) {
    return NextResponse.json(await updateFloorPlanBoundary(id, b.boundary));
  }
  if (typeof b?.zones === "string" || b?.zones === null) {
    return NextResponse.json(await updateFloorPlanZones(id, b.zones));
  }
  if (typeof b?.elements === "string" || b?.elements === null) {
    return NextResponse.json(await updateFloorPlanElements(id, b.elements));
  }
  // Plan 18 Task 7: "define by dimensions" sends width+depth+scale together (the
  // editor computes `scale` from a fit helper before PATCHing) — checked before the
  // scale-only branch below, which stays reserved for the two-click calibration flow.
  if (
    typeof b?.width === "number" &&
    typeof b?.depth === "number" &&
    typeof b?.scale === "number"
  ) {
    return NextResponse.json(
      await updateFloorPlanDimensions(id, { width: b.width, depth: b.depth, scale: b.scale })
    );
  }
  if (typeof b?.scale !== "number") return NextResponse.json({ error: "scale required" }, { status: 400 });
  return NextResponse.json(await updateFloorPlanScale(id, b.scale));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertFloorPlanAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const fp = await getFloorPlan(id);
  if (!fp) return NextResponse.json({ error: "not found" }, { status: 404 });
  await deleteFloorPlan(id);
  return NextResponse.json({ ok: true });
}
