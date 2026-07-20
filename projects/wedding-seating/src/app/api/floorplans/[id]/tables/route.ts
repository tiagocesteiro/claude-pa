import { NextResponse } from "next/server";
import { saveTables, listTables, type TableInput } from "@/lib/db/tables";
import { assertFloorPlanAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertFloorPlanAccess(actor, id, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json(await listTables(id));
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertFloorPlanAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const body = (await req.json().catch(() => ({}))) as { tables?: TableInput[] };
  if (!Array.isArray(body?.tables)) return NextResponse.json({ error: "tables[] required" }, { status: 400 });
  await saveTables(id, body.tables);
  return NextResponse.json({ ok: true });
}
