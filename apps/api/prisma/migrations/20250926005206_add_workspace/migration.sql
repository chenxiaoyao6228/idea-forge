/*
  Warnings:

  - The primary key for the `AITokenUsage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `isArchived` on the `Doc` table. All the data in the column will be lost.
  - You are about to drop the column `isStarred` on the `Doc` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `Doc` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `Doc` table. All the data in the column will be lost.
  - You are about to drop the column `noticeType` on the `DocShare` table. All the data in the column will be lost.
  - The `permission` column on the `DocShare` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `status` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `authorId` to the `Doc` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `Doc` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastModifiedById` to the `Doc` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `Doc` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PermissionInheritanceType" AS ENUM ('DIRECT', 'GROUP', 'SUBSPACE_ADMIN', 'SUBSPACE_MEMBER', 'WORKSPACE_ADMIN', 'WORKSPACE_MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('NONE', 'READ', 'COMMENT', 'EDIT', 'MANAGE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocVisibility" AS ENUM ('PUBLIC', 'SHARED', 'PRIVATE', 'WORKSPACE');

-- CreateEnum
CREATE TYPE "SubspaceType" AS ENUM ('WORKSPACE_WIDE', 'PUBLIC', 'INVITE_ONLY', 'PRIVATE', 'PERSONAL');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "SubspaceRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('NOTE', 'WHITEBOARD', 'MIND');

-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'TEAM');

-- DropForeignKey
ALTER TABLE "AITokenUsage" DROP CONSTRAINT "AITokenUsage_userId_fkey";

-- DropForeignKey
ALTER TABLE "Connection" DROP CONSTRAINT "Connection_userId_fkey";

-- DropForeignKey
ALTER TABLE "Doc" DROP CONSTRAINT "Doc_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Doc" DROP CONSTRAINT "Doc_parentId_fkey";

-- DropForeignKey
ALTER TABLE "DocShare" DROP CONSTRAINT "DocShare_authorId_fkey";

-- DropForeignKey
ALTER TABLE "DocShare" DROP CONSTRAINT "DocShare_userId_fkey";

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_userId_fkey";

-- DropForeignKey
ALTER TABLE "Password" DROP CONSTRAINT "Password_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserLoginHistory" DROP CONSTRAINT "UserLoginHistory_userId_fkey";

-- DropIndex
DROP INDEX "Doc_coverImageId_key";

-- AlterTable
ALTER TABLE "AITokenUsage" DROP CONSTRAINT "AITokenUsage_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "AITokenUsage_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "AITokenUsage_id_seq";

-- AlterTable
ALTER TABLE "Connection" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Doc" DROP COLUMN "isArchived",
DROP COLUMN "isStarred",
DROP COLUMN "ownerId",
DROP COLUMN "position",
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "authorId" TEXT NOT NULL,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "lastModifiedById" TEXT NOT NULL,
ADD COLUMN     "nonSubspaceMemberPermission" "PermissionLevel",
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "subspaceAdminPermission" "PermissionLevel",
ADD COLUMN     "subspaceId" TEXT,
ADD COLUMN     "subspaceMemberPermission" "PermissionLevel",
ADD COLUMN     "type" "DocType" NOT NULL DEFAULT 'NOTE',
ADD COLUMN     "visibility" "DocVisibility" NOT NULL DEFAULT 'WORKSPACE',
ADD COLUMN     "workspaceId" TEXT NOT NULL,
ALTER COLUMN "content" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "DocShare" DROP COLUMN "noticeType",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "includeChildDocuments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAccessedAt" TIMESTAMP(3),
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "urlId" TEXT,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "authorId" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
DROP COLUMN "permission",
ADD COLUMN     "permission" "PermissionLevel" NOT NULL DEFAULT 'READ';

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Password" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "currentWorkspaceId" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AlterTable
ALTER TABLE "UserLoginHistory" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "DocumentPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "docId" TEXT NOT NULL,
    "permission" "PermissionLevel" NOT NULL,
    "inheritedFromId" TEXT,
    "inheritedFromType" "PermissionInheritanceType" NOT NULL,
    "priority" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "guestId" TEXT,

    CONSTRAINT "DocumentPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "type" "WorkspaceType" NOT NULL DEFAULT 'TEAM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "memberSubspaceCreate" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspacePublicInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "WorkspacePublicInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "preferences" JSONB,
    "index" TEXT,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

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
    "archivedAt" TIMESTAMP(3),
    "allowExport" BOOLEAN NOT NULL DEFAULT true,
    "allowMemberInvites" BOOLEAN NOT NULL DEFAULT true,
    "allowTopLevelEdit" BOOLEAN NOT NULL DEFAULT true,
    "memberInvitePermission" TEXT NOT NULL DEFAULT 'ALL_MEMBERS',
    "topLevelEditPermission" TEXT NOT NULL DEFAULT 'ADMINS_ONLY',
    "subspaceAdminPermission" "PermissionLevel" NOT NULL DEFAULT 'MANAGE',
    "subspaceMemberPermission" "PermissionLevel" NOT NULL DEFAULT 'MANAGE',
    "nonSubspaceMemberPermission" "PermissionLevel" NOT NULL DEFAULT 'COMMENT',
    "settings" JSONB,
    "navigationTree" JSONB,
    "index" TEXT,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "Subspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubspaceMember" (
    "id" TEXT NOT NULL,
    "role" "SubspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

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
    "userId" TEXT NOT NULL,

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
    "invitedById" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "GuestCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocRevision" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentBinary" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "docId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "DocRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Star" (
    "id" TEXT NOT NULL,
    "index" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "docId" TEXT NOT NULL,

    CONSTRAINT "Star_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentPermission_userId_docId_idx" ON "DocumentPermission"("userId", "docId");

-- CreateIndex
CREATE INDEX "DocumentPermission_guestId_docId_idx" ON "DocumentPermission"("guestId", "docId");

-- CreateIndex
CREATE INDEX "DocumentPermission_docId_idx" ON "DocumentPermission"("docId");

-- CreateIndex
CREATE INDEX "DocumentPermission_priority_idx" ON "DocumentPermission"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentPermission_userId_guestId_docId_inheritedFromType_key" ON "DocumentPermission"("userId", "guestId", "docId", "inheritedFromType");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePublicInvite_token_key" ON "WorkspacePublicInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePublicInvite_workspaceId_key" ON "WorkspacePublicInvite"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_index_idx" ON "WorkspaceMember"("userId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SubspaceMember_subspaceId_userId_key" ON "SubspaceMember"("subspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberGroupUser_groupId_userId_key" ON "MemberGroupUser"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestCollaborator_email_workspaceId_key" ON "GuestCollaborator"("email", "workspaceId");

-- CreateIndex
CREATE INDEX "DocRevision_docId_createdAt_idx" ON "DocRevision"("docId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Star_userId_docId_key" ON "Star"("userId", "docId");

-- CreateIndex
CREATE INDEX "DocShare_userId_createdAt_idx" ON "DocShare"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DocShare_docId_includeChildDocuments_idx" ON "DocShare"("docId", "includeChildDocuments");

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_inheritedFromId_fkey" FOREIGN KEY ("inheritedFromId") REFERENCES "DocumentPermission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestCollaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentWorkspaceId_fkey" FOREIGN KEY ("currentWorkspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspacePublicInvite" ADD CONSTRAINT "WorkspacePublicInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspacePublicInvite" ADD CONSTRAINT "WorkspacePublicInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_subspaceId_fkey" FOREIGN KEY ("subspaceId") REFERENCES "Subspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Doc"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

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
ALTER TABLE "DocShare" ADD CONSTRAINT "DocShare_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocShare" ADD CONSTRAINT "DocShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Password" ADD CONSTRAINT "Password_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocRevision" ADD CONSTRAINT "DocRevision_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocRevision" ADD CONSTRAINT "DocRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AITokenUsage" ADD CONSTRAINT "AITokenUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLoginHistory" ADD CONSTRAINT "UserLoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Star" ADD CONSTRAINT "Star_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Star" ADD CONSTRAINT "Star_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
