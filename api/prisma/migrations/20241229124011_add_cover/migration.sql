/*
  Warnings:

  - A unique constraint covering the columns `[fileId]` on the table `CoverImage` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fileId` to the `CoverImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CoverImage" ADD COLUMN     "fileId" TEXT NOT NULL,
ADD COLUMN     "isPreset" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "CoverImage_fileId_key" ON "CoverImage"("fileId");

-- AddForeignKey
ALTER TABLE "CoverImage" ADD CONSTRAINT "CoverImage_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
