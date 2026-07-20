import { NextResponse } from "next/server";
import { saveWeddingTables, listWeddingTables, type WeddingTableInput } from "@/lib/db/weddingTables";
import { assertWeddingAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingAccess(actor, id, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json(await listWeddingTables(id));
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const body = (await req.json().catch(() => ({}))) as { tables?: WeddingTableInput[] };
  if (!Array.isArray(body?.tables)) return NextResponse.json({ error: "tables[] required" }, { status: 400 });
  await saveWeddingTables(id, body.tables);
  return NextResponse.json({ ok: true });
}
