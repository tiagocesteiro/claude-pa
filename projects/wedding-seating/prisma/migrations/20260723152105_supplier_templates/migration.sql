-- AlterTable
ALTER TABLE "RequirementTemplate" ADD COLUMN     "ownerRole" TEXT NOT NULL DEFAULT 'venue',
ADD COLUMN     "supplierProfileId" TEXT,
ADD COLUMN     "targetRole" TEXT,
ALTER COLUMN "venueId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "RequirementTemplate_supplierProfileId_idx" ON "RequirementTemplate"("supplierProfileId");
