-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "documentId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "metadata" JSONB,
    "viewedAt" TIMESTAMP(3),
    "actionRequired" BOOLEAN NOT NULL DEFAULT false,
    "actionType" TEXT,
    "actionStatus" TEXT NOT NULL DEFAULT 'PENDING',
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
    "eventType" TEXT NOT NULL,
    "webEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

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

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "allowPublicSharing" BOOLEAN NOT NULL DEFAULT true;

-- DropTable (renamed DocShare to PublicShare)
DROP TABLE IF EXISTS "DocShare";

-- CreateIndex
CREATE INDEX "Notification_userId_viewedAt_idx" ON "Notification"("userId", "viewedAt");
CREATE INDEX "Notification_userId_event_idx" ON "Notification"("userId", "event");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_userId_actionRequired_actionStatus_idx" ON "Notification"("userId", "actionRequired", "actionStatus");
CREATE INDEX "Notification_workspaceId_userId_idx" ON "Notification"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_userId_eventType_key" ON "NotificationSetting"("userId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "PublicShare_docId_key" ON "PublicShare"("docId");
CREATE UNIQUE INDEX "PublicShare_token_key" ON "PublicShare"("token");
CREATE UNIQUE INDEX "PublicShare_urlId_key" ON "PublicShare"("urlId");
CREATE INDEX "PublicShare_token_revokedAt_idx" ON "PublicShare"("token", "revokedAt");
CREATE INDEX "PublicShare_docId_revokedAt_idx" ON "PublicShare"("docId", "revokedAt");
CREATE INDEX "PublicShare_workspaceId_idx" ON "PublicShare"("workspaceId");
CREATE INDEX "PublicShare_expiresAt_idx" ON "PublicShare"("expiresAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actionResolvedBy_fkey" FOREIGN KEY ("actionResolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSetting" ADD CONSTRAINT "NotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicShare" ADD CONSTRAINT "PublicShare_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicShare" ADD CONSTRAINT "PublicShare_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicShare" ADD CONSTRAINT "PublicShare_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicShare" ADD CONSTRAINT "PublicShare_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert special workspace for cross-workspace notifications
INSERT INTO "Workspace" (id, name, description, type, "createdAt", "updatedAt", "allowPublicSharing")
VALUES ('00000000-0000-0000-0000-000000000000', 'System', 'Special workspace for cross-workspace notifications', 'TEAM', NOW(), NOW(), false)
ON CONFLICT (id) DO NOTHING;
