import { NextResponse } from "next/server";
import { assignGuestGroup, setGuestLocked } from "@/lib/db/guests";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  let updated;
  if ("groupId" in b) updated = await assignGuestGroup(id, b.groupId);
  if (typeof b.locked === "boolean") updated = await setGuestLocked(id, b.locked);
  if (!updated) return NextResponse.json({ error: "groupId or locked required" }, { status: 400 });
  return NextResponse.json(updated);
}
