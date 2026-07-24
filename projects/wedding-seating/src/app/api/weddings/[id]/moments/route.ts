import { NextResponse } from "next/server";
import { listMoments, createMoment } from "@/lib/db/moments";
import { assertWeddingRole } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { recordEvent } from "@/lib/db/audit";

export const runtime = "nodejs";

/** List a wedding's moments (tab order). Any participant reads them. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingRole(actor, id, ["venue", "couple", "supplier", "admin"]);
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ moments: await listMoments(id) });
}

/** Create a moment. Only the VENUE (owner) defines the wedding's moments — the
 * couple can't (they consume the structure the venue sets up). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingRole(actor, id, ["venue", "admin"]);
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const title = typeof b?.title === "string" && b.title.trim() ? b.title.trim() : null;
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const moment = await createMoment(id, title);
  await recordEvent({
    weddingId: id, actor, action: "moment.created", entityType: "moment", entityId: moment.id,
    summary: `Adicionou o momento «${title}»`,
  });
  return NextResponse.json({ moment }, { status: 201 });
}
