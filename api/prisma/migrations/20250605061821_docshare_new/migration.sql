-- AlterTable
ALTER TABLE "DocShare" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "includeChildDocuments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAccessedAt" TIMESTAMP(3),
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "urlId" TEXT,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "DocShare_userId_createdAt_idx" ON "DocShare"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DocShare_docId_includeChildDocuments_idx" ON "DocShare"("docId", "includeChildDocuments");
