/*
  Warnings:

  - A unique constraint covering the columns `[userId,groupId]` on the table `DocGroupPermission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdById` to the `DocGroupPermission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `DocGroupPermission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocGroupPermission" ADD COLUMN     "createdById" INTEGER NOT NULL,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "DocUserPermission" (
    "id" TEXT NOT NULL,
    "permission" "Permission" NOT NULL DEFAULT 'READ',
    "index" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "docId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "sourceId" TEXT,
    "workspaceMemberId" TEXT,
    "subspaceMemberId" TEXT,

    CONSTRAINT "DocUserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocUserPermission_userId_index_idx" ON "DocUserPermission"("userId", "index");

-- CreateIndex
CREATE INDEX "DocUserPermission_userId_createdAt_idx" ON "DocUserPermission"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocUserPermission_docId_userId_key" ON "DocUserPermission"("docId", "userId");

-- CreateIndex
CREATE INDEX "DocGroupPermission_groupId_createdAt_idx" ON "DocGroupPermission"("groupId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocGroupPermission_userId_groupId_key" ON "DocGroupPermission"("userId", "groupId");

-- AddForeignKey
ALTER TABLE "DocGroupPermission" ADD CONSTRAINT "DocGroupPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocGroupPermission" ADD CONSTRAINT "DocGroupPermission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocGroupPermission" ADD CONSTRAINT "DocGroupPermission_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DocGroupPermission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocUserPermission" ADD CONSTRAINT "DocUserPermission_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocUserPermission" ADD CONSTRAINT "DocUserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocUserPermission" ADD CONSTRAINT "DocUserPermission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocUserPermission" ADD CONSTRAINT "DocUserPermission_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DocUserPermission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocUserPermission" ADD CONSTRAINT "DocUserPermission_workspaceMemberId_fkey" FOREIGN KEY ("workspaceMemberId") REFERENCES "WorkspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocUserPermission" ADD CONSTRAINT "DocUserPermission_subspaceMemberId_fkey" FOREIGN KEY ("subspaceMemberId") REFERENCES "SubspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
