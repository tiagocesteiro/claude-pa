import { NextResponse } from "next/server";
import { saveUploadedImage } from "@/lib/upload";
import { createDecorItem } from "@/lib/db/decorCatalog";
import { parseDecorWorkbook } from "@/lib/import/parseDecorWorkbook";
import { assertVenueAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

// Node runtime (exceljs + Buffer + prisma); headroom for parsing an image-heavy workbook.
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 15 * 1024 * 1024;

/** Import decoration catalog items from an .xlsx with columns: image (embedded) +
 * name + quantity (+ optional category/price). Venue only. */
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
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "ficheiro demasiado grande" }, { status: 400 });

  let rows;
  try {
    rows = await parseDecorWorkbook(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "ficheiro xlsx inválido" }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "sem linhas — precisa de uma coluna 'nome'" }, { status: 400 });
  }

  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let image: string | null = null;
    if (row.image) {
      image = await saveUploadedImage(`decor-${id}`, `${Date.now()}-${i}.${row.image.extension}`, row.image.bytes);
    }
    await createDecorItem(id, {
      name: row.name,
      quantity: row.quantity ?? null,
      category: row.category ?? null,
      price: row.price ?? null,
      image,
    });
    created++;
  }
  return NextResponse.json({ created }, { status: 201 });
}
