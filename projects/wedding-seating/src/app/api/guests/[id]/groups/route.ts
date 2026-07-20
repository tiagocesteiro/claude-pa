import { NextResponse } from "next/server";
import { setGuestGroups } from "@/lib/db/guests";
import { assertGuestAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertGuestAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));

  if (b.primaryGroupId !== null && typeof b.primaryGroupId !== "string") {
    return NextResponse.json({ error: "primaryGroupId must be a string or null" }, { status: 400 });
  }
  if (!Array.isArray(b.extraGroupIds) || !b.extraGroupIds.every((g: unknown) => typeof g === "string")) {
    return NextResponse.json({ error: "extraGroupIds must be a string array" }, { status: 400 });
  }

  const updated = await setGuestGroups(id, b.primaryGroupId, b.extraGroupIds);
  return NextResponse.json(updated);
}
