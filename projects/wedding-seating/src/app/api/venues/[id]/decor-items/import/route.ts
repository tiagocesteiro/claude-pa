import { NextResponse } from "next/server";
import { saveUploadedImage } from "@/lib/upload";
import { createDecorItem } from "@/lib/db/decorCatalog";
import { assertVenueAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

// Node runtime (Buffer + prisma); headroom for a multi-file upload.
export const runtime = "nodejs";
export const maxDuration = 60;

/** Bulk-import decoration catalog items from images: each image becomes one item,
 * named after its filename (extension stripped). Venue only. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertVenueAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "files required" }, { status: 400 });

  let created = 0;
  for (const file of files) {
    const name = file.name.replace(/\.[^.]+$/, "").trim() || "Item";
    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = await saveUploadedImage(`decor-${id}`, `${Date.now()}-${file.name}`, bytes);
    await createDecorItem(id, { name, image });
    created++;
  }
  return NextResponse.json({ created }, { status: 201 });
}
