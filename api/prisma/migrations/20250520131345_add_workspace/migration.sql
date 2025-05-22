/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Doc` table. All the data in the column will be lost.
  - You are about to drop the column `noticeType` on the `DocShare` table. All the data in the column will be lost.
  - The `permission` column on the `DocShare` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `authorId` to the `Doc` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `Doc` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'WORKSPACE');

-- CreateEnum
CREATE TYPE "SubspaceType" AS ENUM ('WORKSPACE_WIDE', 'PUBLIC', 'INVITE_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "SubspaceRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('MANAGE', 'SHARE', 'EDIT', 'COMMENT', 'READ', 'NONE');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('NOTE', 'WHITEBOARD', 'MIND');

-- DropForeignKey
ALTER TABLE "Doc" DROP CONSTRAINT "Doc_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Doc" DROP CONSTRAINT "Doc_parentId_fkey";

-- DropIndex
DROP INDEX "Doc_coverImageId_key";

-- AlterTable
ALTER TABLE "Doc" DROP COLUMN "ownerId",
ADD COLUMN     "authorId" INTEGER NOT NULL,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subspaceId" TEXT,
ADD COLUMN     "type" "DocType" NOT NULL DEFAULT 'NOTE',
ADD COLUMN     "visibility" "DocVisibility" NOT NULL DEFAULT 'WORKSPACE',
ADD COLUMN     "workspaceId" TEXT NOT NULL,
ALTER COLUMN "content" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "DocShare" DROP COLUMN "noticeType",
DROP COLUMN "permission",
ADD COLUMN     "permission" "Permission" NOT NULL DEFAULT 'READ';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "status",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "updated_time" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "allowPublicDocs" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settings" JSONB,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocRevision" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentBinary" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "docId" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,

    CONSTRAINT "DocRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicShare" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "docId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "allowEdit" BOOLEAN NOT NULL DEFAULT false,
    "allowComment" BOOLEAN NOT NULL DEFAULT false,
    "allowCopy" BOOLEAN NOT NULL DEFAULT false,
    "showTemplate" BOOLEAN NOT NULL DEFAULT false,
    "showSidebar" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "creatorId" INTEGER NOT NULL,
    "accessCode" TEXT,

    CONSTRAINT "PublicShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicEditHistory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shareId" TEXT NOT NULL,
    "editorId" TEXT,
    "editorName" TEXT NOT NULL,
    "editorIp" TEXT NOT NULL,
    "operation" JSONB NOT NULL,

    CONSTRAINT "PublicEditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "preferences" JSONB,
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
    "settings" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
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
CREATE TABLE "SubspaceMemberPermission" (
    "id" TEXT NOT NULL,
    "permission" "Permission" NOT NULL DEFAULT 'READ',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subspaceId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SubspaceMemberPermission_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "DocGroupPermission" (
    "id" TEXT NOT NULL,
    "permission" "Permission" NOT NULL DEFAULT 'READ',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "docId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "DocGroupPermission_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "DocRevision_docId_createdAt_idx" ON "DocRevision"("docId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PublicShare_docId_key" ON "PublicShare"("docId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SubspaceMember_subspaceId_userId_key" ON "SubspaceMember"("subspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SubspaceMemberPermission_subspaceId_userId_key" ON "SubspaceMemberPermission"("subspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberGroupUser_groupId_userId_key" ON "MemberGroupUser"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DocGroupPermission_docId_groupId_key" ON "DocGroupPermission"("docId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestCollaborator_email_workspaceId_key" ON "GuestCollaborator"("email", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestDocPermission_guestId_docId_key" ON "GuestDocPermission"("guestId", "docId");

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_subspaceId_fkey" FOREIGN KEY ("subspaceId") REFERENCES "Subspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Doc"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DocRevision" ADD CONSTRAINT "DocRevision_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocRevision" ADD CONSTRAINT "DocRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicShare" ADD CONSTRAINT "PublicShare_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicShare" ADD CONSTRAINT "PublicShare_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicEditHistory" ADD CONSTRAINT "PublicEditHistory_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "PublicShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "SubspaceMemberPermission" ADD CONSTRAINT "SubspaceMemberPermission_subspaceId_fkey" FOREIGN KEY ("subspaceId") REFERENCES "Subspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubspaceMemberPermission" ADD CONSTRAINT "SubspaceMemberPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberGroup" ADD CONSTRAINT "MemberGroup_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberGroupUser" ADD CONSTRAINT "MemberGroupUser_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MemberGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberGroupUser" ADD CONSTRAINT "MemberGroupUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocGroupPermission" ADD CONSTRAINT "DocGroupPermission_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocGroupPermission" ADD CONSTRAINT "DocGroupPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MemberGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCollaborator" ADD CONSTRAINT "GuestCollaborator_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCollaborator" ADD CONSTRAINT "GuestCollaborator_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestDocPermission" ADD CONSTRAINT "GuestDocPermission_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestCollaborator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestDocPermission" ADD CONSTRAINT "GuestDocPermission_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
