/*
  Warnings:

  - You are about to drop the column `fileId` on the `CoverImage` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CoverImage" DROP CONSTRAINT "CoverImage_fileId_fkey";

-- DropIndex
DROP INDEX "CoverImage_fileId_key";

-- AlterTable
ALTER TABLE "CoverImage" DROP COLUMN "fileId";
