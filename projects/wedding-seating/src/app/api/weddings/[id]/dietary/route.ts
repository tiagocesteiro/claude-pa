import { NextResponse } from "next/server";
import { getDietaryByTable } from "@/lib/db/dietary";
import { assertDietaryAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** Catering dietary aggregate (per-table counts of the final dinner layout, no
 * names). Venue/admin + the catering supplier only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertDietaryAccess(actor, id);
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ dietary: await getDietaryByTable(id) });
}
