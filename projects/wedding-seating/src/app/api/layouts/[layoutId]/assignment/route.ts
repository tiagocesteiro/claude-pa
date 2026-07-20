import { NextResponse } from "next/server";
import { saveLayoutAssignment } from "@/lib/db/layouts";
import { assertLayoutAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** Persist per-layout seat assignments ([{ guestId, tableId|null }]). Foreign
 * guest/table ids are ignored by the data layer (tenancy). */
export async function PUT(req: Request, { params }: { params: Promise<{ layoutId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { layoutId } = await params;
  try {
    await assertLayoutAccess(actor, layoutId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  if (!Array.isArray(b?.assignments)) {
    return NextResponse.json({ error: "assignments[] required" }, { status: 400 });
  }
  await saveLayoutAssignment(layoutId, b.assignments);
  return NextResponse.json({ ok: true });
}
