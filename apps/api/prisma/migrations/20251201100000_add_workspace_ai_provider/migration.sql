-- CreateTable: WorkspaceAIProvider
-- Stores AI provider configurations per workspace (API keys, models, etc.)
CREATE TABLE "WorkspaceAIProvider" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT,
    "apiKey" TEXT NOT NULL,
    "baseURL" TEXT,
    "models" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceAIProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceAIProvider_workspaceId_isActive_priority_idx" ON "WorkspaceAIProvider"("workspaceId", "isActive", "priority");

-- CreateIndex
CREATE INDEX "WorkspaceAIProvider_workspaceId_idx" ON "WorkspaceAIProvider"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAIProvider_workspaceId_provider_name_key" ON "WorkspaceAIProvider"("workspaceId", "provider", "name");

-- AddForeignKey
ALTER TABLE "WorkspaceAIProvider" ADD CONSTRAINT "WorkspaceAIProvider_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
