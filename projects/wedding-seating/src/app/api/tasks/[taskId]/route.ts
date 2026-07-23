import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getTask, updateTask, deleteTask, isTaskAssignee, type TaskAssignee } from "@/lib/db/tasks";
import { assertTaskAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { recordEvent } from "@/lib/db/audit";

async function taskWeddingId(taskId: string): Promise<string | null> {
  const task = await getTask(taskId);
  if (!task) return null;
  const moment = await prisma.weddingMoment.findUnique({ where: { id: task.momentId }, select: { weddingId: true } });
  return moment?.weddingId ?? null;
}

export const runtime = "nodejs";

/** Toggle done / edit text / reassign a task (couple|venue|supplier). */
export async function PATCH(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { taskId } = await params;
  try {
    await assertTaskAccess(actor, taskId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));

  const fields: {
    text?: string;
    note?: string | null;
    done?: boolean;
    assignee?: TaskAssignee;
    supplierId?: string | null;
    dueDate?: Date | null;
  } = {};
  if (typeof b?.text === "string" && b.text.trim()) fields.text = b.text.trim();
  if ("note" in b) fields.note = b.note ? String(b.note) : null;
  if (typeof b?.done === "boolean") fields.done = b.done;
  if ("dueDate" in b) fields.dueDate = b.dueDate ? new Date(b.dueDate) : null;
  if ("assignee" in b) {
    if (!isTaskAssignee(b.assignee)) {
      return NextResponse.json({ error: "assignee inválido" }, { status: 400 });
    }
    fields.assignee = b.assignee;
    if (b.assignee === "supplier" && b?.supplierId) {
      // Validate the supplier belongs to the task's wedding.
      const task = await getTask(taskId);
      const moment = task
        ? await prisma.weddingMoment.findUnique({ where: { id: task.momentId }, select: { weddingId: true } })
        : null;
      const supplier = await prisma.supplier.findUnique({
        where: { id: b.supplierId },
        select: { weddingId: true },
      });
      if (!supplier || supplier.weddingId !== moment?.weddingId) {
        return NextResponse.json({ error: "fornecedor inválido" }, { status: 400 });
      }
      fields.supplierId = b.supplierId;
    }
  }

  const before = await getTask(taskId);
  const task = await updateTask(taskId, fields);
  if (before && fields.done !== undefined && before.done !== task.done) {
    const weddingId = await taskWeddingId(taskId);
    if (weddingId) {
      await recordEvent({
        weddingId,
        actor,
        action: task.done ? "task.completed" : "task.reopened",
        entityType: "task",
        entityId: task.id,
        summary: `${task.done ? "Concluiu" : "Reabriu"} a tarefa «${task.text}»`,
        supplierId: task.supplierId,
      });
    }
  }
  return NextResponse.json({ task });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { taskId } = await params;
  try {
    await assertTaskAccess(actor, taskId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteTask(taskId);
  return NextResponse.json({ ok: true });
}
