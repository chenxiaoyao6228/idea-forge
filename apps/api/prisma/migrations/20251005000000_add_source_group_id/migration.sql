-- AlterTable
ALTER TABLE "DocumentPermission" ADD COLUMN "sourceGroupId" TEXT;

-- CreateIndex
CREATE INDEX "DocumentPermission_sourceGroupId_idx" ON "DocumentPermission"("sourceGroupId");

-- DropIndex
DROP INDEX "DocumentPermission_userId_docId_inheritedFromType_key";

-- CreateIndex
CREATE UNIQUE INDEX "DocumentPermission_userId_docId_inheritedFromType_sourceGroupId_key" ON "DocumentPermission"("userId", "docId", "inheritedFromType", "sourceGroupId");

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_sourceGroupId_fkey" FOREIGN KEY ("sourceGroupId") REFERENCES "MemberGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
