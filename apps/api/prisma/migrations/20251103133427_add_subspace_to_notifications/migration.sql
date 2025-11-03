-- AlterTable
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "subspaceId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_subspaceId_userId_idx" ON "Notification"("subspaceId", "userId");

-- AddForeignKey
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_subspaceId_fkey'
  ) THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_subspaceId_fkey" 
    FOREIGN KEY ("subspaceId") REFERENCES "Subspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
