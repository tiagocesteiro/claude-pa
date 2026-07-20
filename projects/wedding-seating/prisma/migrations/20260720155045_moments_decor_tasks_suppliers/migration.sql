-- DropIndex
DROP INDEX "WeddingMoment_weddingId_kind_key";

-- AlterTable
ALTER TABLE "WeddingMoment" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "kind" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "service" TEXT,
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentTask" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "assignee" TEXT NOT NULL DEFAULT 'couple',
    "supplierId" TEXT,
    "dueDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentDecor" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "decorItemId" TEXT,
    "name" TEXT,
    "note" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomentDecor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecorItem" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "image" TEXT,
    "price" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecorItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_weddingId_idx" ON "Supplier"("weddingId");

-- CreateIndex
CREATE INDEX "MomentTask_momentId_idx" ON "MomentTask"("momentId");

-- CreateIndex
CREATE INDEX "MomentDecor_momentId_idx" ON "MomentDecor"("momentId");

-- CreateIndex
CREATE INDEX "DecorItem_venueId_idx" ON "DecorItem"("venueId");

-- CreateIndex
CREATE INDEX "WeddingMoment_weddingId_idx" ON "WeddingMoment"("weddingId");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentTask" ADD CONSTRAINT "MomentTask_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "WeddingMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentTask" ADD CONSTRAINT "MomentTask_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentDecor" ADD CONSTRAINT "MomentDecor_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "WeddingMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentDecor" ADD CONSTRAINT "MomentDecor_decorItemId_fkey" FOREIGN KEY ("decorItemId") REFERENCES "DecorItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecorItem" ADD CONSTRAINT "DecorItem_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
