-- CreateTable
CREATE TABLE "WeddingMoment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "floorPlanId" TEXT,
    CONSTRAINT "WeddingMoment_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeddingMoment_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "FloorPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Wedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "couple" TEXT NOT NULL,
    "date" DATETIME,
    "venueId" TEXT,
    "partner1" TEXT,
    "partner1Email" TEXT,
    "partner1Phone" TEXT,
    "partner2" TEXT,
    "partner2Email" TEXT,
    "partner2Phone" TEXT,
    "guestEstimate" INTEGER,
    "notes" TEXT,
    "floorPlanId" TEXT,
    "templateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Wedding_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Wedding_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "FloorPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Wedding" ("couple", "createdAt", "date", "floorPlanId", "id", "templateId") SELECT "couple", "createdAt", "date", "floorPlanId", "id", "templateId" FROM "Wedding";
DROP TABLE "Wedding";
ALTER TABLE "new_Wedding" RENAME TO "Wedding";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "WeddingMoment_weddingId_kind_key" ON "WeddingMoment"("weddingId", "kind");
