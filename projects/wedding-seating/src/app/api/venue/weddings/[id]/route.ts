import { NextResponse } from "next/server";
import { getVenueWeddingView, assertVenueBooking } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** The venue's PII-free operational view of a wedding booked at its venue. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertVenueBooking(actor, id, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const view = await getVenueWeddingView(id);
  if (!view) return NextResponse.json({ error: "casamento não encontrado" }, { status: 404 });
  return NextResponse.json(view);
}
