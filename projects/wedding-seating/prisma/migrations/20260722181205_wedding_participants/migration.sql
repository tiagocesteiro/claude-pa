-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "invitedAt" TIMESTAMP(3),
ADD COLUMN     "profileId" TEXT;

-- AlterTable
ALTER TABLE "WeddingInvite" ADD COLUMN     "service" TEXT,
ADD COLUMN     "supplierId" TEXT;

-- CreateTable
CREATE TABLE "WeddingParticipant" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeddingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeddingParticipant_weddingId_idx" ON "WeddingParticipant"("weddingId");

-- CreateIndex
CREATE INDEX "WeddingParticipant_profileId_idx" ON "WeddingParticipant"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "WeddingParticipant_weddingId_profileId_key" ON "WeddingParticipant"("weddingId", "profileId");

-- CreateIndex
CREATE INDEX "Supplier_profileId_idx" ON "Supplier"("profileId");

-- CreateIndex
CREATE INDEX "Supplier_inviteToken_idx" ON "Supplier"("inviteToken");

-- AddForeignKey
ALTER TABLE "WeddingParticipant" ADD CONSTRAINT "WeddingParticipant_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: existing weddings get a COUPLE participant (from Wedding.ownerId) and
-- a VENUE participant (from the booked Venue.ownerId). Idempotent via ON CONFLICT.
INSERT INTO "WeddingParticipant" ("id", "weddingId", "profileId", "role", "createdAt")
SELECT gen_random_uuid()::text, w."id", w."ownerId", 'couple', now()
FROM "Wedding" w
WHERE w."ownerId" IS NOT NULL
ON CONFLICT ("weddingId", "profileId") DO NOTHING;

INSERT INTO "WeddingParticipant" ("id", "weddingId", "profileId", "role", "createdAt")
SELECT gen_random_uuid()::text, w."id", v."ownerId", 'venue', now()
FROM "Wedding" w
JOIN "Venue" v ON v."id" = w."venueId"
WHERE v."ownerId" IS NOT NULL
ON CONFLICT ("weddingId", "profileId") DO NOTHING;
