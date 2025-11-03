/*
  Warnings:

  - You are about to drop the column `guestId` on the `DocumentPermission` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DocumentPermission" DROP CONSTRAINT "DocumentPermission_guestId_fkey";

-- DropForeignKey
ALTER TABLE "PublicShare" DROP CONSTRAINT "PublicShare_revokedById_fkey";

-- DropIndex
DROP INDEX "DocumentPermission_guestId_docId_idx";

-- DropIndex
DROP INDEX "DocumentPermission_userId_guestId_docId_inheritedFromType_key";

-- AlterTable
ALTER TABLE "DocumentPermission" DROP COLUMN "guestId";

-- CreateTable
CREATE TABLE "TemporaryImport" (
    "id" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "subspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemporaryImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemporaryImport_userId_idx" ON "TemporaryImport"("userId");

-- CreateIndex
CREATE INDEX "TemporaryImport_status_idx" ON "TemporaryImport"("status");

-- CreateIndex
CREATE INDEX "TemporaryImport_expiresAt_idx" ON "TemporaryImport"("expiresAt");

-- AddForeignKey
ALTER TABLE "PublicShare" ADD CONSTRAINT "PublicShare_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryImport" ADD CONSTRAINT "TemporaryImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryImport" ADD CONSTRAINT "TemporaryImport_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryImport" ADD CONSTRAINT "TemporaryImport_subspaceId_fkey" FOREIGN KEY ("subspaceId") REFERENCES "Subspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "DocumentPermission_guestCollaboratorId_docId_inheritedFromType_" RENAME TO "DocumentPermission_guestCollaboratorId_docId_inheritedFromT_key";

-- RenameIndex
ALTER INDEX "DocumentPermission_userId_docId_inheritedFromType_sourceGroupId" RENAME TO "DocumentPermission_userId_docId_inheritedFromType_sourceGro_key";
