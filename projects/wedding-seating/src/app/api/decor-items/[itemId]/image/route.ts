import { NextResponse } from "next/server";
import { saveUploadedImage } from "@/lib/upload";
import { updateDecorItem } from "@/lib/db/decorCatalog";
import { assertDecorItemAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Set/replace the image of a decoration catalog item (venue only). */
export async function POST(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { itemId } = await params;
  try {
    await assertDecorItemAccess(actor, itemId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = await saveUploadedImage(`decor-${itemId}`, `${Date.now()}-${file.name}`, bytes);
  await updateDecorItem(itemId, { image });
  return NextResponse.json({ image });
}
