import { NextResponse } from "next/server";
import { saveTemplateTables, listTemplateTables } from "@/lib/db/templateTables";
import { assertTemplateAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Read allows a couple to view the template tables of a venue it booked (to pick).
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertTemplateAccess(actor, id, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json(await listTemplateTables(id));
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertTemplateAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  if (!Array.isArray(b?.tables)) {
    return NextResponse.json({ error: "tables array required" }, { status: 400 });
  }
  await saveTemplateTables(id, b.tables);
  return NextResponse.json({ ok: true });
}
