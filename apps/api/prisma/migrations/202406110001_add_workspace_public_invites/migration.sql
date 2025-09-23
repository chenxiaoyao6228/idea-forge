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

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePublicInvite_token_key" ON "WorkspacePublicInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePublicInvite_workspaceId_key" ON "WorkspacePublicInvite"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspacePublicInvite" ADD CONSTRAINT "WorkspacePublicInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspacePublicInvite" ADD CONSTRAINT "WorkspacePublicInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
