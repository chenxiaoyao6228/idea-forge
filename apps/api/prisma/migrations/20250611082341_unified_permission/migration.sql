/*
  Warnings:

  - The `permission` column on the `DocShare` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `DocGroupPermission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocUserPermission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GuestDocPermission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubspaceMemberPermission` table. If the table is not empty, all the data it contains will be lost.

*/


-- CreateEnum
CREATE TYPE "PermissionInheritanceType" AS ENUM ('DIRECT', 'GROUP', 'SUBSPACE_ADMIN', 'SUBSPACE_MEMBER', 'WORKSPACE_ADMIN', 'WORKSPACE_MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('NONE', 'READ', 'COMMENT', 'EDIT', 'MANAGE', 'OWNER');

-- AlterEnum
ALTER TYPE "DocVisibility" ADD VALUE 'SHARED';

-- DropForeignKey
ALTER TABLE "DocGroupPermission" DROP CONSTRAINT "DocGroupPermission_createdById_fkey";

-- DropForeignKey
ALTER TABLE "DocGroupPermission" DROP CONSTRAINT "DocGroupPermission_docId_fkey";

-- DropForeignKey
ALTER TABLE "DocGroupPermission" DROP CONSTRAINT "DocGroupPermission_groupId_fkey";

-- DropForeignKey
ALTER TABLE "DocGroupPermission" DROP CONSTRAINT "DocGroupPermission_inheritedFromId_fkey";

-- DropForeignKey
ALTER TABLE "DocGroupPermission" DROP CONSTRAINT "DocGroupPermission_userId_fkey";

-- DropForeignKey
ALTER TABLE "DocUserPermission" DROP CONSTRAINT "DocUserPermission_createdById_fkey";

-- DropForeignKey
ALTER TABLE "DocUserPermission" DROP CONSTRAINT "DocUserPermission_docId_fkey";

-- DropForeignKey
ALTER TABLE "DocUserPermission" DROP CONSTRAINT "DocUserPermission_inheritedFromId_fkey";

-- DropForeignKey
ALTER TABLE "DocUserPermission" DROP CONSTRAINT "DocUserPermission_subspaceMemberId_fkey";

-- DropForeignKey
ALTER TABLE "DocUserPermission" DROP CONSTRAINT "DocUserPermission_userId_fkey";

-- DropForeignKey
ALTER TABLE "DocUserPermission" DROP CONSTRAINT "DocUserPermission_workspaceMemberId_fkey";

-- DropForeignKey
ALTER TABLE "GuestDocPermission" DROP CONSTRAINT "GuestDocPermission_docId_fkey";

-- DropForeignKey
ALTER TABLE "GuestDocPermission" DROP CONSTRAINT "GuestDocPermission_guestId_fkey";

-- DropForeignKey
ALTER TABLE "SubspaceMemberPermission" DROP CONSTRAINT "SubspaceMemberPermission_subspaceId_fkey";

-- DropForeignKey
ALTER TABLE "SubspaceMemberPermission" DROP CONSTRAINT "SubspaceMemberPermission_userId_fkey";

-- AlterTable
ALTER TABLE "DocShare" DROP COLUMN "permission",
ADD COLUMN     "permission" "PermissionLevel" NOT NULL DEFAULT 'READ';

-- AlterTable
ALTER TABLE "SubspaceMember" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "DocGroupPermission";

-- DropTable
DROP TABLE "DocUserPermission";

-- DropTable
DROP TABLE "GuestDocPermission";

-- DropTable
DROP TABLE "SubspaceMemberPermission";

-- DropEnum
DROP TYPE "Permission";

-- CreateTable
CREATE TABLE "DocumentPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "documentId" TEXT NOT NULL,
    "permission" "PermissionLevel" NOT NULL,
    "inheritedFromType" "PermissionInheritanceType" NOT NULL,
    "inheritedFromId" TEXT,
    "priority" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "guestId" TEXT,

    CONSTRAINT "DocumentPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentPermission_userId_reinheritedFromType_idx" ON "DocumentPermission"("userId", "reinheritedFromType");

-- CreateIndex
CREATE INDEX "DocumentPermission_guestId_reinheritedFromType_idx" ON "DocumentPermission"("guestId", "reinheritedFromType");

-- CreateIndex
CREATE INDEX "DocumentPermission_reinheritedFromType_documentId_idx" ON "DocumentPermission"("reinheritedFromType", "documentId");

-- CreateIndex
CREATE INDEX "DocumentPermission_priority_idx" ON "DocumentPermission"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentPermission_userId_guestId_reinheritedFromType_documentId_so_key" ON "DocumentPermission"("userId", "guestId", "reinheritedFromType", "documentId", "inheritedFromType");

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_inheritedFromId_fkey" FOREIGN KEY ("inheritedFromId") REFERENCES "DocumentPermission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestCollaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
