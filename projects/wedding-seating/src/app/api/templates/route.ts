import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const templates = await prisma.layoutTemplate.findMany({
    select: {
      id: true,
      name: true,
      minGuests: true,
      maxGuests: true,
      venueId: true,
      venue: { select: { name: true } },
      floorPlanId: true,
      floorPlan: { select: { image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(templates);
}
