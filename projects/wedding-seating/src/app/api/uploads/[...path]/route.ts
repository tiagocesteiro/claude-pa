import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolve, normalize, join, sep } from "node:path";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const root = resolve(process.cwd(), "data/uploads");
  const rel = normalize(join(...path));
  const abs = resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + sep)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  try {
    const buf = await readFile(abs);
    const ext = abs.split(".").pop()?.toLowerCase();
    const type = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": type } });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
