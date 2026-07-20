import { NextResponse } from "next/server";
import { saveAssignment } from "@/lib/db/assignment";
import { assertWeddingAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  if (!Array.isArray(b?.assignments)) {
    return NextResponse.json({ error: "assignments[] required" }, { status: 400 });
  }
  await saveAssignment(id, b.assignments);
  return NextResponse.json({ ok: true });
}
