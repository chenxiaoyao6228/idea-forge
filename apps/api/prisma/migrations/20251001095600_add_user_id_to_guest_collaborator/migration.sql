-- AlterTable
ALTER TABLE "GuestCollaborator" ADD COLUMN "userId" TEXT;

-- AddForeignKey
ALTER TABLE "GuestCollaborator" ADD CONSTRAINT "GuestCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Doc_parentId_idx" ON "Doc"("parentId");

-- CreateIndex
CREATE INDEX "Doc_subspaceId_idx" ON "Doc"("subspaceId");

-- CreateIndex
CREATE INDEX "Doc_workspaceId_idx" ON "Doc"("workspaceId");

-- AlterTable
ALTER TABLE "DocumentPermission" DROP CONSTRAINT IF EXISTS "DocumentPermission_userId_guestId_docId_inheritedFromType_key";

-- CreateIndex
CREATE UNIQUE INDEX "DocumentPermission_userId_docId_inheritedFromType_key" ON "DocumentPermission"("userId", "docId", "inheritedFromType");
