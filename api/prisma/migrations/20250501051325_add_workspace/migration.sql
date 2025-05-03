/*
  Warnings:

  - You are about to drop the column `noticeType` on the `DocShare` table. All the data in the column will be lost.
  - The `permission` column on the `DocShare` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SubspaceType" AS ENUM ('WORKSPACE_WIDE', 'PUBLIC', 'INVITE_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "SubspaceRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('MANAGE', 'SHARE', 'EDIT', 'READ', 'COMMENT', 'NONE');

-- AlterTable
ALTER TABLE "Doc" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subspaceId" TEXT;

-- AlterTable
ALTER TABLE "DocShare" DROP COLUMN "noticeType",
DROP COLUMN "permission",
ADD COLUMN     "permission" "Permission" NOT NULL DEFAULT 'READ';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentWorkspaceId" TEXT;

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "type" "SubspaceType" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "Subspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubspaceMember" (
    "id" TEXT NOT NULL,
    "role" "SubspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subspaceId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "SubspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "MemberGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberGroupUser" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "MemberGroupUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestCollaborator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" "GuestStatus" NOT NULL DEFAULT 'PENDING',
    "expireAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invitedById" INTEGER NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "GuestCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestDocPermission" (
    "id" TEXT NOT NULL,
    "permission" "Permission" NOT NULL DEFAULT 'READ',
    "expireAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guestId" TEXT NOT NULL,
    "docId" TEXT NOT NULL,

    CONSTRAINT "GuestDocPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SubspaceMember_subspaceId_userId_key" ON "SubspaceMember"("subspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberGroupUser_groupId_userId_key" ON "MemberGroupUser"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestCollaborator_email_workspaceId_key" ON "GuestCollaborator"("email", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestDocPermission_guestId_docId_key" ON "GuestDocPermission"("guestId", "docId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentWorkspaceId_fkey" FOREIGN KEY ("currentWorkspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subspace" ADD CONSTRAINT "Subspace_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubspaceMember" ADD CONSTRAINT "SubspaceMember_subspaceId_fkey" FOREIGN KEY ("subspaceId") REFERENCES "Subspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubspaceMember" ADD CONSTRAINT "SubspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberGroup" ADD CONSTRAINT "MemberGroup_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberGroupUser" ADD CONSTRAINT "MemberGroupUser_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MemberGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberGroupUser" ADD CONSTRAINT "MemberGroupUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCollaborator" ADD CONSTRAINT "GuestCollaborator_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCollaborator" ADD CONSTRAINT "GuestCollaborator_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestDocPermission" ADD CONSTRAINT "GuestDocPermission_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestCollaborator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestDocPermission" ADD CONSTRAINT "GuestDocPermission_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_subspaceId_fkey" FOREIGN KEY ("subspaceId") REFERENCES "Subspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
