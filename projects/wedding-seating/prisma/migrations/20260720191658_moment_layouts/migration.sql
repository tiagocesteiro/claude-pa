-- AlterTable
ALTER TABLE "WeddingLayout" ADD COLUMN     "momentId" TEXT;

-- AlterTable
ALTER TABLE "WeddingMoment" ADD COLUMN     "hasSeating" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "WeddingLayout" ADD CONSTRAINT "WeddingLayout_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "WeddingMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: the dinner moment has a seating plan by default.
UPDATE "WeddingMoment" SET "hasSeating" = true WHERE "kind" = 'dinner';

-- Backfill: attach existing wedding-level layouts to their wedding's dinner moment
-- (layouts were wedding-scoped before this migration).
UPDATE "WeddingLayout" wl
SET "momentId" = (
  SELECT wm."id" FROM "WeddingMoment" wm
  WHERE wm."weddingId" = wl."weddingId" AND wm."kind" = 'dinner'
  ORDER BY wm."order" ASC
  LIMIT 1
)
WHERE wl."momentId" IS NULL;
