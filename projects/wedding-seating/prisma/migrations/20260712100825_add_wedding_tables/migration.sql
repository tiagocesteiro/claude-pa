-- AlterTable
ALTER TABLE "Wedding" ADD COLUMN "templateId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "floorPlanId" TEXT,
    "templateId" TEXT,
    "weddingId" TEXT,
    "shape" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "width" REAL,
    "depth" REAL,
    "minCapacity" INTEGER,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "fixed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Table_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "FloorPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Table_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LayoutTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Table_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Table" ("capacity", "depth", "fixed", "floorPlanId", "id", "minCapacity", "shape", "templateId", "width", "x", "y") SELECT "capacity", "depth", "fixed", "floorPlanId", "id", "minCapacity", "shape", "templateId", "width", "x", "y" FROM "Table";
DROP TABLE "Table";
ALTER TABLE "new_Table" RENAME TO "Table";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
