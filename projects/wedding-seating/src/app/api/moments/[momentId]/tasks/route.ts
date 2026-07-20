import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getMoment } from "@/lib/db/moments";
import { listMomentTasks, createTask, isTaskAssignee } from "@/lib/db/tasks";
import { assertMomentAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ momentId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId } = await params;
  try {
    await assertMomentAccess(actor, momentId, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ tasks: await listMomentTasks(momentId) });
}

export async function POST(req: Request, { params }: { params: Promise<{ momentId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId } = await params;
  try {
    await assertMomentAccess(actor, momentId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const text = typeof b?.text === "string" && b.text.trim() ? b.text.trim() : null;
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  const assignee = isTaskAssignee(b?.assignee) ? b.assignee : "couple";

  let supplierId: string | null = null;
  if (assignee === "supplier" && b?.supplierId) {
    // The supplier must belong to this moment's wedding.
    const moment = await getMoment(momentId);
    const supplier = await prisma.supplier.findUnique({
      where: { id: b.supplierId },
      select: { weddingId: true },
    });
    if (!supplier || supplier.weddingId !== moment?.weddingId) {
      return NextResponse.json({ error: "fornecedor inválido" }, { status: 400 });
    }
    supplierId = b.supplierId;
  }

  const dueDate = typeof b?.dueDate === "string" && b.dueDate ? new Date(b.dueDate) : null;
  const task = await createTask(momentId, { text, assignee, supplierId, dueDate });
  return NextResponse.json({ task }, { status: 201 });
}
