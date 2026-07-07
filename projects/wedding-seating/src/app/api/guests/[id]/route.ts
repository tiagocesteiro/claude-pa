import { NextResponse } from "next/server";
import { assignGuestGroup } from "@/lib/db/guests";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  // groupId may be a string or explicitly null to unassign
  if (!("groupId" in b)) return NextResponse.json({ error: "groupId required" }, { status: 400 });
  return NextResponse.json(await assignGuestGroup(id, b.groupId));
}
