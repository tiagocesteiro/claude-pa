-- AlterTable
ALTER TABLE "FloorPlan" ADD COLUMN "minSpacing" REAL;

-- AlterTable
ALTER TABLE "Table" ADD COLUMN "depth" REAL;
ALTER TABLE "Table" ADD COLUMN "minCapacity" INTEGER;
ALTER TABLE "Table" ADD COLUMN "width" REAL;

-- CreateTable
CREATE TABLE "TableType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shape" TEXT NOT NULL,
    "minSeats" INTEGER NOT NULL,
    "maxSeats" INTEGER NOT NULL,
    "width" REAL NOT NULL,
    "depth" REAL NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TableType_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
