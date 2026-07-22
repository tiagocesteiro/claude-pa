-- CreateTable
CREATE TABLE "WeddingService" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT,
    "providerType" TEXT NOT NULL DEFAULT 'venue',
    "supplierId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeddingService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeddingService_weddingId_idx" ON "WeddingService"("weddingId");

-- CreateIndex
CREATE INDEX "WeddingService_supplierId_idx" ON "WeddingService"("supplierId");

-- AddForeignKey
ALTER TABLE "WeddingService" ADD CONSTRAINT "WeddingService_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingService" ADD CONSTRAINT "WeddingService_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
