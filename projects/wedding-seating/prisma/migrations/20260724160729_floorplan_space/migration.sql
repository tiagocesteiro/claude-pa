-- AlterTable
ALTER TABLE "FloorPlan" ADD COLUMN     "spaceId" TEXT;

-- AddForeignKey
ALTER TABLE "FloorPlan" ADD CONSTRAINT "FloorPlan_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "VenueSpace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
