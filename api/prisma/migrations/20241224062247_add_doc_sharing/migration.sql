/*
  Warnings:

  - You are about to drop the column `sharedPassword` on the `Doc` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Doc" DROP COLUMN "sharedPassword";

-- CreateTable
CREATE TABLE "DocShare" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'READ',
    "noticeType" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocShare_docId_userId_key" ON "DocShare"("docId", "userId");

-- AddForeignKey
ALTER TABLE "DocShare" ADD CONSTRAINT "DocShare_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Doc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocShare" ADD CONSTRAINT "DocShare_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocShare" ADD CONSTRAINT "DocShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
