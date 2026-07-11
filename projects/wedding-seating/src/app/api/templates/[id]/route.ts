import { NextResponse } from "next/server";
import { updateTemplate, deleteTemplate } from "@/lib/db/templates";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const patch = Object.fromEntries(
    Object.entries({
      name: b?.name,
      minGuests: b?.minGuests,
      maxGuests: b?.maxGuests,
      lines: b?.lines,
      floorPlanId: b?.floorPlanId,
    }).filter(([, v]) => v !== undefined)
  );
  return NextResponse.json(await updateTemplate(id, patch));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteTemplate(id);
  return NextResponse.json({ ok: true });
}
