-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupId" TEXT,
    "extraGroups" TEXT,
    "assignedTableId" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "ageGroup" TEXT,
    "gender" TEXT,
    "dietary" TEXT,
    "rsvp" TEXT DEFAULT 'pending',
    "plusOneId" TEXT,
    CONSTRAINT "Guest_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Guest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Guest_plusOneId_fkey" FOREIGN KEY ("plusOneId") REFERENCES "Guest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Guest" ("ageGroup", "assignedTableId", "dietary", "extraGroups", "gender", "groupId", "id", "locked", "name", "rsvp", "weddingId") SELECT "ageGroup", "assignedTableId", "dietary", "extraGroups", "gender", "groupId", "id", "locked", "name", "rsvp", "weddingId" FROM "Guest";
DROP TABLE "Guest";
ALTER TABLE "new_Guest" RENAME TO "Guest";
CREATE UNIQUE INDEX "Guest_plusOneId_key" ON "Guest"("plusOneId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
