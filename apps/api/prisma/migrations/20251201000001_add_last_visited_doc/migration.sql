-- CreateTable: WorkspaceLastVisitedDoc
CREATE TABLE IF NOT EXISTS "WorkspaceLastVisitedDoc" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceLastVisitedDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceLastVisitedDoc_userId_workspaceId_key" ON "WorkspaceLastVisitedDoc"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkspaceLastVisitedDoc_userId_idx" ON "WorkspaceLastVisitedDoc"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkspaceLastVisitedDoc_workspaceId_idx" ON "WorkspaceLastVisitedDoc"("workspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkspaceLastVisitedDoc_documentId_idx" ON "WorkspaceLastVisitedDoc"("documentId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'WorkspaceLastVisitedDoc_userId_fkey'
    ) THEN
        ALTER TABLE "WorkspaceLastVisitedDoc" ADD CONSTRAINT "WorkspaceLastVisitedDoc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'WorkspaceLastVisitedDoc_workspaceId_fkey'
    ) THEN
        ALTER TABLE "WorkspaceLastVisitedDoc" ADD CONSTRAINT "WorkspaceLastVisitedDoc_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'WorkspaceLastVisitedDoc_documentId_fkey'
    ) THEN
        ALTER TABLE "WorkspaceLastVisitedDoc" ADD CONSTRAINT "WorkspaceLastVisitedDoc_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
