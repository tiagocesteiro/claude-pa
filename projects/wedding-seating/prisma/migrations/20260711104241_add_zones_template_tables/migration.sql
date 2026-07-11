-- AlterTable
ALTER TABLE "FloorPlan" ADD COLUMN "zones" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LayoutTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "floorPlanId" TEXT,
    "name" TEXT NOT NULL,
    "minGuests" INTEGER NOT NULL,
    "maxGuests" INTEGER NOT NULL,
    "lines" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LayoutTemplate_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LayoutTemplate_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "FloorPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LayoutTemplate" ("createdAt", "id", "lines", "maxGuests", "minGuests", "name", "venueId") SELECT "createdAt", "id", "lines", "maxGuests", "minGuests", "name", "venueId" FROM "LayoutTemplate";
DROP TABLE "LayoutTemplate";
ALTER TABLE "new_LayoutTemplate" RENAME TO "LayoutTemplate";
CREATE TABLE "new_Table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "floorPlanId" TEXT,
    "templateId" TEXT,
    "shape" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "width" REAL,
    "depth" REAL,
    "minCapacity" INTEGER,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "fixed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Table_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "FloorPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Table_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LayoutTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Table" ("capacity", "depth", "fixed", "floorPlanId", "id", "minCapacity", "shape", "width", "x", "y") SELECT "capacity", "depth", "fixed", "floorPlanId", "id", "minCapacity", "shape", "width", "x", "y" FROM "Table";
DROP TABLE "Table";
ALTER TABLE "new_Table" RENAME TO "Table";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
