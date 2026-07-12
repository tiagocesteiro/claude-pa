import { NextResponse } from "next/server";
import { getWeddingDetail, updateWedding, type WeddingDetailFields } from "@/lib/db/weddings";

const DETAIL_FIELDS = [
  "couple",
  "date",
  "venueId",
  "partner1",
  "partner1Email",
  "partner1Phone",
  "partner2",
  "partner2Email",
  "partner2Phone",
  "guestEstimate",
  "notes",
] as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wedding = await getWeddingDetail(id);
  if (!wedding) return NextResponse.json({ error: "wedding not found" }, { status: 404 });
  return NextResponse.json(wedding);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!b || typeof b !== "object") {
    return NextResponse.json({ error: "no known field present" }, { status: 400 });
  }

  const fields: WeddingDetailFields = {};
  for (const key of DETAIL_FIELDS) {
    if (!(key in b)) continue;
    if (key === "date") {
      if (!b.date) {
        fields.date = null;
      } else {
        const d = new Date(b.date);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: "invalid date" }, { status: 400 });
        }
        fields.date = d;
      }
    } else if (key === "guestEstimate") {
      const n =
        b.guestEstimate === null || b.guestEstimate === undefined || b.guestEstimate === ""
          ? null
          : Number(b.guestEstimate);
      fields.guestEstimate = n !== null && Number.isNaN(n) ? null : n;
    } else {
      fields[key] = b[key];
    }
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "no known field present" }, { status: 400 });
  }

  const wedding = await updateWedding(id, fields);
  return NextResponse.json(wedding);
}
