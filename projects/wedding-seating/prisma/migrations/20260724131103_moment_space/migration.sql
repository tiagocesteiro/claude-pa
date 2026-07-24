-- AlterTable
ALTER TABLE "WeddingMoment" ADD COLUMN     "spaceId" TEXT;

-- AddForeignKey
ALTER TABLE "WeddingMoment" ADD CONSTRAINT "WeddingMoment_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "VenueSpace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
