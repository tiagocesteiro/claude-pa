-- AlterTable
ALTER TABLE "WeddingMoment" ADD COLUMN     "image" TEXT;

-- CreateTable
CREATE TABLE "VenueSpace" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueSpace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueSpace_venueId_idx" ON "VenueSpace"("venueId");

-- AddForeignKey
ALTER TABLE "VenueSpace" ADD CONSTRAINT "VenueSpace_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
