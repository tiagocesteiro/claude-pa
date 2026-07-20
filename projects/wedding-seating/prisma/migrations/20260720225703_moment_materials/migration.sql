-- CreateTable
CREATE TABLE "MomentMaterial" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomentMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MomentMaterial_momentId_idx" ON "MomentMaterial"("momentId");

-- AddForeignKey
ALTER TABLE "MomentMaterial" ADD CONSTRAINT "MomentMaterial_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "WeddingMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
