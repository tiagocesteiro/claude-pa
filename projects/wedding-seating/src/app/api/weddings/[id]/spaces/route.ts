import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { listVenueSpaces } from "@/lib/db/venueSpaces";
import { assertWeddingRole } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** The venue's space-photo library for this wedding — used to pick a hero image
 * per moment. Any participant may read (venue/couple/supplier/admin). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingRole(actor, id, ["venue", "couple", "supplier", "admin"]);
  } catch (e) {
    return accessErrorResponse(e);
  }
  const w = await prisma.wedding.findUnique({ where: { id }, select: { venueId: true } });
  if (!w?.venueId) return NextResponse.json({ spaces: [] });
  const spaces = (await listVenueSpaces(w.venueId)).filter((s) => s.image);
  return NextResponse.json({ spaces: spaces.map((s) => ({ id: s.id, name: s.name, image: s.image })) });
}
