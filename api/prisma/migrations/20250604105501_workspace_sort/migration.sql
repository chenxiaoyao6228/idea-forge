-- AlterTable
ALTER TABLE "WorkspaceMember" ADD COLUMN     "index" TEXT;

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_index_idx" ON "WorkspaceMember"("userId", "index");
