/*
  Warnings:

  - You are about to drop the column `guestId` on the `DocumentPermission` table. All the data in the column will be lost.
  - You are about to drop the `DocShare` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('PERMISSION_REQUEST', 'PERMISSION_GRANT', 'PERMISSION_REJECT', 'WORKSPACE_INVITATION', 'SUBSPACE_INVITATION');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('PERMISSION_REQUEST', 'WORKSPACE_INVITATION', 'SUBSPACE_INVITATION');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "DocShare" DROP CONSTRAINT "DocShare_authorId_fkey";

-- DropForeignKey
ALTER TABLE "DocShare" DROP CONSTRAINT "DocShare_docId_fkey";

-- DropForeignKey
ALTER TABLE "DocShare" DROP CONSTRAINT "DocShare_userId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentPermission" DROP CONSTRAINT "DocumentPermission_guestId_fkey";

-- DropIndex
DROP INDEX "DocumentPermission_guestId_docId_idx";

-- DropIndex
DROP INDEX "DocumentPermission_userId_guestId_docId_inheritedFromType_key";

-- AlterTable
ALTER TABLE "DocumentPermission" DROP COLUMN "guestId";

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "allowPublicSharing" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "DocShare";

-- CreateTable
CREATE TABLE "PublicShare" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "urlId" VARCHAR(255),
    "domain" VARCHAR(255),
    "published" BOOLEAN NOT NULL DEFAULT true,
    "permission" "PermissionLevel" NOT NULL DEFAULT 'READ',
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "allowIndexing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "event" "NotificationEventType" NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "documentId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "metadata" JSONB,
    "viewedAt" TIMESTAMP(3),
    "actionRequired" BOOLEAN NOT NULL DEFAULT false,
    "actionType" "ActionType",
    "actionStatus" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "actionPayload" JSONB,
    "actionResolvedAt" TIMESTAMP(3),
    "actionResolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "NotificationEventType" NOT NULL,
    "webEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicShare_docId_key" ON "PublicShare"("docId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicShare_token_key" ON "PublicShare"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PublicShare_urlId_key" ON "PublicShare"("urlId");

-- CreateIndex
CREATE INDEX "PublicShare_token_revokedAt_idx" ON "PublicShare"("token", "revokedAt");

-- CreateIndex
CREATE INDEX "PublicShare_docId_revokedAt_idx" ON "PublicShare"("docId", "revokedAt");

-- CreateIndex
CREATE INDEX "PublicShare_workspaceId_idx" ON "PublicShare"("workspaceId");

-- CreateIndex
CREATE INDEX "PublicShare_expiresAt_idx" ON "PublicShare"("expiresAt");

-- CreateIndex
CREATE INDEX "Notification_userId_viewedAt_idx" ON "Notification"("userId", "viewedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_event_idx" ON "Notification"("userId", "event");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_actionRequired_actionStatus_idx" ON "Notification"("userId", "actionRequired", "actionStatus");

-- CreateIndex
CREATE INDEX "Notification_workspaceId_userId_idx" ON "Notification"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_userId_eventType_key" ON "NotificationSetting"("userId", "eventType");

-- AddForeignKey
ALTER TABLE "PublicShare" ADD CONSTRAINT "PublicShare_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicShare" ADD CONSTRAINT "PublicShare_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicShare" ADD CONSTRAINT "PublicShare_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicShare" ADD CONSTRAINT "PublicShare_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actionResolvedBy_fkey" FOREIGN KEY ("actionResolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSetting" ADD CONSTRAINT "NotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "DocumentPermission_guestCollaboratorId_docId_inheritedFromType_" RENAME TO "DocumentPermission_guestCollaboratorId_docId_inheritedFromT_key";

-- RenameIndex
ALTER INDEX "DocumentPermission_userId_docId_inheritedFromType_sourceGroupId" RENAME TO "DocumentPermission_userId_docId_inheritedFromType_sourceGro_key";
