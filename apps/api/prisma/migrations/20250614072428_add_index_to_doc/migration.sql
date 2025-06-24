/*
  Warnings:

  - You are about to drop the column `position` on the `Doc` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Doc" DROP COLUMN "position",
ADD COLUMN     "index" TEXT;
