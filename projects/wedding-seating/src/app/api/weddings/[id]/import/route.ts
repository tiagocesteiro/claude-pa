import { NextResponse } from "next/server";
import { parseGuestWorkbook } from "@/lib/import/parseGuests";
import { importGuests } from "@/lib/import/importGuests";
import { getWedding } from "@/lib/db/weddings";
import { assertWeddingAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { recordEvent } from "@/lib/db/audit";

// Node runtime (exceljs is Node-only); larger serverless timeout for parsing a
// large guest workbook (Fase 0 — deploy readiness).
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }

  const wedding = await getWedding(id);
  if (!wedding) return NextResponse.json({ error: "wedding not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "file too large" }, { status: 400 });

  let rows;
  try {
    rows = await parseGuestWorkbook(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "invalid xlsx file" }, { status: 400 });
  }

  const result = await importGuests(id, rows);
  await recordEvent({
    weddingId: id, actor, action: "guests.imported", entityType: "guest",
    summary: `Importou ${result.guests} convidados${result.groups ? ` (${result.groups} grupos)` : ""}`,
  });
  return NextResponse.json(result);
}
