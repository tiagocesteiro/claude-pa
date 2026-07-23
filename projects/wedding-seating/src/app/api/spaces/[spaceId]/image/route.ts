import { NextResponse } from "next/server";
import { saveUploadedImage } from "@/lib/upload";
import { updateVenueSpace } from "@/lib/db/venueSpaces";
import { assertVenueSpaceAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Set/replace a venue space's photo (venue only). */
export async function POST(req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { spaceId } = await params;
  try {
    await assertVenueSpaceAccess(actor, spaceId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = await saveUploadedImage(`space-${spaceId}`, `${Date.now()}-${file.name}`, bytes);
  await updateVenueSpace(spaceId, { image });
  return NextResponse.json({ image });
}
