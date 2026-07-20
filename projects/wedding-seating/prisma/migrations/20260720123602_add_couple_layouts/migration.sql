-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "weddingLayoutId" TEXT;

-- CreateTable
CREATE TABLE "WeddingLayout" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "floorPlanId" TEXT,
    "templateId" TEXT,
    "width" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,
    "scale" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeddingLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LayoutSeat" (
    "id" TEXT NOT NULL,
    "weddingLayoutId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,

    CONSTRAINT "LayoutSeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeddingLayout_weddingId_idx" ON "WeddingLayout"("weddingId");

-- CreateIndex
CREATE INDEX "LayoutSeat_weddingLayoutId_idx" ON "LayoutSeat"("weddingLayoutId");

-- CreateIndex
CREATE UNIQUE INDEX "LayoutSeat_weddingLayoutId_guestId_key" ON "LayoutSeat"("weddingLayoutId", "guestId");

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_weddingLayoutId_fkey" FOREIGN KEY ("weddingLayoutId") REFERENCES "WeddingLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingLayout" ADD CONSTRAINT "WeddingLayout_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingLayout" ADD CONSTRAINT "WeddingLayout_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "FloorPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayoutSeat" ADD CONSTRAINT "LayoutSeat_weddingLayoutId_fkey" FOREIGN KEY ("weddingLayoutId") REFERENCES "WeddingLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayoutSeat" ADD CONSTRAINT "LayoutSeat_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayoutSeat" ADD CONSTRAINT "LayoutSeat_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
