-- AlterTable
ALTER TABLE "WeddingRequirement" ADD COLUMN     "agreedAt" TIMESTAMP(3),
ADD COLUMN     "agreedByProfileId" TEXT,
ADD COLUMN     "agreedByRole" TEXT;
