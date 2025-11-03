-- AlterTable
ALTER TABLE "Doc" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Doc_deletedById_fkey'
    ) THEN
        ALTER TABLE "Doc" ADD CONSTRAINT "Doc_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
