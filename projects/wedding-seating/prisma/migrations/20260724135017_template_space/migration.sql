-- AlterTable
ALTER TABLE "LayoutTemplate" ADD COLUMN     "spaceId" TEXT;

-- CreateIndex
CREATE INDEX "LayoutTemplate_spaceId_idx" ON "LayoutTemplate"("spaceId");

-- AddForeignKey
ALTER TABLE "LayoutTemplate" ADD CONSTRAINT "LayoutTemplate_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "VenueSpace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
