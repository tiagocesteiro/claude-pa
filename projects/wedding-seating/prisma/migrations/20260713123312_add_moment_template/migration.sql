-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WeddingMoment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "floorPlanId" TEXT,
    "templateId" TEXT,
    CONSTRAINT "WeddingMoment_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeddingMoment_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "FloorPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WeddingMoment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LayoutTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WeddingMoment" ("floorPlanId", "id", "kind", "weddingId") SELECT "floorPlanId", "id", "kind", "weddingId" FROM "WeddingMoment";
DROP TABLE "WeddingMoment";
ALTER TABLE "new_WeddingMoment" RENAME TO "WeddingMoment";
CREATE UNIQUE INDEX "WeddingMoment_weddingId_kind_key" ON "WeddingMoment"("weddingId", "kind");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
