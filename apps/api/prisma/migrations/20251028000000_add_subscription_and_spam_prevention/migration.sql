-- CreateTable
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT,
    "subspaceId" TEXT,
    "event" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DocumentView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_documentId_idx" ON "Subscription"("documentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_subspaceId_idx" ON "Subscription"("subspaceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Subscription_deletedAt_idx" ON "Subscription"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_userId_documentId_subspaceId_key" ON "Subscription"("userId", "documentId", "subspaceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentView_userId_documentId_key" ON "DocumentView"("userId", "documentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DocumentView_userId_documentId_updatedAt_idx" ON "DocumentView"("userId", "documentId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DocumentView_documentId_updatedAt_idx" ON "DocumentView"("documentId", "updatedAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT IF NOT EXISTS "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT IF NOT EXISTS "Subscription_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT IF NOT EXISTS "Subscription_subspaceId_fkey" FOREIGN KEY ("subspaceId") REFERENCES "Subspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentView" ADD CONSTRAINT IF NOT EXISTS "DocumentView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentView" ADD CONSTRAINT IF NOT EXISTS "DocumentView_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (Add lastPublishedAt and lastPublishedById to Doc if not exists)
ALTER TABLE "Doc" ADD COLUMN IF NOT EXISTS "lastPublishedAt" TIMESTAMP(3);
ALTER TABLE "Doc" ADD COLUMN IF NOT EXISTS "lastPublishedById" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Doc_lastPublishedAt_idx" ON "Doc"("lastPublishedAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Doc_lastPublishedById_fkey'
    ) THEN
        ALTER TABLE "Doc" ADD CONSTRAINT "Doc_lastPublishedById_fkey" FOREIGN KEY ("lastPublishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
