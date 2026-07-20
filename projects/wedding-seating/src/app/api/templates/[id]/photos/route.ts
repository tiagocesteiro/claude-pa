import { NextResponse } from "next/server";
import { saveUploadedImage } from "@/lib/upload";
import { getTemplatePhotos, setTemplatePhotos } from "@/lib/db/templates";
import { assertTemplateAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

// Node runtime (Buffer + prisma); headroom for the multipart upload.
export const runtime = "nodejs";
export const maxDuration = 60;

/** Upload an example photo for a template (venue only). Appends its Storage path
 * to the template's `photos` array. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertTemplateAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Distinct prefix + timestamp so multiple photos never overwrite each other.
  const path = await saveUploadedImage(`tpl-${id}`, `${Date.now()}-${file.name}`, bytes);
  const photos = [...(await getTemplatePhotos(id)), path];
  await setTemplatePhotos(id, photos);
  return NextResponse.json({ photos });
}

/** Remove one example photo (venue only). Body: { path }. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertTemplateAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  if (typeof b?.path !== "string") return NextResponse.json({ error: "path required" }, { status: 400 });
  const photos = (await getTemplatePhotos(id)).filter((p) => p !== b.path);
  await setTemplatePhotos(id, photos);
  return NextResponse.json({ photos });
}
