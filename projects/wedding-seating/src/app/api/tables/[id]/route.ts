import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { assertTableAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

/** Partial update for a single table — used by the seating plan's per-table controls,
 * which (unlike the floor-plan/template editors) never bulk-save the whole table set:
 * `fixed` toggle (Plan 3/17) and `name` rename (Plan 18 Task 4 — double-click). At
 * least one of the two must be present; either can be sent alone. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertTableAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));

  const data: { fixed?: boolean; name?: string | null } = {};
  if (b?.fixed !== undefined) {
    if (typeof b.fixed !== "boolean") {
      return NextResponse.json({ error: "fixed must be a boolean" }, { status: 400 });
    }
    data.fixed = b.fixed;
  }
  if (b?.name !== undefined) {
    if (b.name !== null && typeof b.name !== "string") {
      return NextResponse.json({ error: "name must be a string or null" }, { status: 400 });
    }
    data.name = b.name;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "fixed (boolean) and/or name (string|null) required" }, { status: 400 });
  }

  const table = await prisma.table.update({ where: { id }, data });
  return NextResponse.json(table);
}
