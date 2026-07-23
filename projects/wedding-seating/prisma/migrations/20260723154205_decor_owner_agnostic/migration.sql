-- AlterTable
ALTER TABLE "DecorItem" ADD COLUMN     "ownerRole" TEXT NOT NULL DEFAULT 'venue',
ADD COLUMN     "supplierProfileId" TEXT,
ALTER COLUMN "venueId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "DecorItem_supplierProfileId_idx" ON "DecorItem"("supplierProfileId");
