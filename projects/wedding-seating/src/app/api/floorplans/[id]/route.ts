import { NextResponse } from "next/server";
import {
  getFloorPlan,
  updateFloorPlanScale,
  updateFloorPlanSpacing,
  updateFloorPlanBoundary,
  updateFloorPlanZones,
  updateFloorPlanName,
  deleteFloorPlan,
} from "@/lib/db/floorplans";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fp = await getFloorPlan(id);
  return fp ? NextResponse.json(fp) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
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
  if (typeof b?.scale !== "number") return NextResponse.json({ error: "scale required" }, { status: 400 });
  return NextResponse.json(await updateFloorPlanScale(id, b.scale));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fp = await getFloorPlan(id);
  if (!fp) return NextResponse.json({ error: "not found" }, { status: 404 });
  await deleteFloorPlan(id);
  return NextResponse.json({ ok: true });
}
