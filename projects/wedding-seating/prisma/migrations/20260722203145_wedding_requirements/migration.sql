-- CreateTable
CREATE TABLE "WeddingRequirement" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "momentId" TEXT,
    "serviceId" TEXT,
    "fromRole" TEXT NOT NULL,
    "fromProfileId" TEXT,
    "toRole" TEXT,
    "toSupplierId" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingRequirementComment" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "authorProfileId" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeddingRequirementComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeddingRequirement_weddingId_idx" ON "WeddingRequirement"("weddingId");

-- CreateIndex
CREATE INDEX "WeddingRequirement_serviceId_idx" ON "WeddingRequirement"("serviceId");

-- CreateIndex
CREATE INDEX "WeddingRequirement_toSupplierId_idx" ON "WeddingRequirement"("toSupplierId");

-- CreateIndex
CREATE INDEX "WeddingRequirementComment_requirementId_idx" ON "WeddingRequirementComment"("requirementId");

-- AddForeignKey
ALTER TABLE "WeddingRequirement" ADD CONSTRAINT "WeddingRequirement_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingRequirement" ADD CONSTRAINT "WeddingRequirement_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "WeddingMoment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingRequirement" ADD CONSTRAINT "WeddingRequirement_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "WeddingService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingRequirementComment" ADD CONSTRAINT "WeddingRequirementComment_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "WeddingRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
