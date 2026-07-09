import { NextResponse } from "next/server";
import { getFloorPlan, updateFloorPlanScale, updateFloorPlanSpacing } from "@/lib/db/floorplans";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fp = await getFloorPlan(id);
  return fp ? NextResponse.json(fp) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (typeof b?.minSpacing === "number" || b?.minSpacing === null) {
    return NextResponse.json(await updateFloorPlanSpacing(id, b.minSpacing));
  }
  if (typeof b?.scale !== "number") return NextResponse.json({ error: "scale required" }, { status: 400 });
  return NextResponse.json(await updateFloorPlanScale(id, b.scale));
}
