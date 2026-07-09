import { prisma } from "../db/client";
import type { GuestRow } from "./parseGuests";

export async function importGuests(
  weddingId: string,
  rows: GuestRow[]
): Promise<{ guests: number; groups: number }> {
  const names = [...new Set(rows.map((r) => r.group).filter((g): g is string => !!g))];

  const groupIdByName = new Map<string, string>();
  let created = 0;
  for (const name of names) {
    const existing = await prisma.group.findFirst({ where: { weddingId, name } });
    if (existing) {
      groupIdByName.set(name, existing.id);
    } else {
      const g = await prisma.group.create({ data: { weddingId, name } });
      groupIdByName.set(name, g.id);
      created += 1;
    }
  }

  await prisma.guest.createMany({
    data: rows.map((r) => ({
      weddingId,
      name: r.name,
      groupId: r.group ? groupIdByName.get(r.group)! : null,
      ageGroup: r.ageGroup ?? null,
      gender: r.gender ?? null,
      dietary: r.dietary ?? null,
    })),
  });

  return { guests: rows.length, groups: created };
}
