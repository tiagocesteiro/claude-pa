import type { MomentTask } from "@prisma/client";
import { prisma } from "./client";

/** Per-moment tasks / pending items, each assignable to the couple, the venue,
 * or a specific supplier. Moment-owned; tenancy gated by the route. */

export const TASK_ASSIGNEES = ["couple", "venue", "supplier"] as const;
export type TaskAssignee = (typeof TASK_ASSIGNEES)[number];

export function isTaskAssignee(v: unknown): v is TaskAssignee {
  return typeof v === "string" && (TASK_ASSIGNEES as readonly string[]).includes(v);
}

export function listMomentTasks(momentId: string): Promise<MomentTask[]> {
  return prisma.momentTask.findMany({
    where: { momentId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export function getTask(id: string): Promise<MomentTask | null> {
  return prisma.momentTask.findUnique({ where: { id } });
}

/** Create a task at the end of the moment's list. A "supplier" assignee carries a
 * supplierId; anything else stores no supplier. */
export async function createTask(
  momentId: string,
  input: { text: string; assignee?: TaskAssignee; supplierId?: string | null; dueDate?: Date | null }
): Promise<MomentTask> {
  const last = await prisma.momentTask.findFirst({
    where: { momentId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const assignee = input.assignee ?? "couple";
  return prisma.momentTask.create({
    data: {
      momentId,
      text: input.text,
      assignee,
      supplierId: assignee === "supplier" ? input.supplierId ?? null : null,
      dueDate: input.dueDate ?? null,
      order: (last?.order ?? -1) + 1,
    },
  });
}

export function updateTask(
  id: string,
  fields: {
    text?: string;
    done?: boolean;
    assignee?: TaskAssignee;
    supplierId?: string | null;
    dueDate?: Date | null;
    order?: number;
  }
): Promise<MomentTask> {
  const data: Record<string, unknown> = {};
  if ("text" in fields) data.text = fields.text;
  if ("done" in fields) data.done = fields.done;
  if ("order" in fields) data.order = fields.order;
  if ("dueDate" in fields) data.dueDate = fields.dueDate;
  if ("assignee" in fields) {
    data.assignee = fields.assignee;
    // Clear the supplier link whenever the assignee is no longer a supplier.
    if (fields.assignee !== "supplier") data.supplierId = null;
    else if ("supplierId" in fields) data.supplierId = fields.supplierId;
  } else if ("supplierId" in fields) {
    data.supplierId = fields.supplierId;
  }
  return prisma.momentTask.update({ where: { id }, data });
}

export function deleteTask(id: string): Promise<MomentTask> {
  return prisma.momentTask.delete({ where: { id } });
}
