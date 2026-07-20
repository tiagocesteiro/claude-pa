import { NextResponse } from "next/server";
import { listMoments, createMoment } from "@/lib/db/moments";
import { assertWeddingAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** List a wedding's moments (tab order). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingAccess(actor, id, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ moments: await listMoments(id) });
}

/** Create a custom moment (added at the end of the list). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const title = typeof b?.title === "string" && b.title.trim() ? b.title.trim() : null;
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  return NextResponse.json({ moment: await createMoment(id, title) }, { status: 201 });
}
