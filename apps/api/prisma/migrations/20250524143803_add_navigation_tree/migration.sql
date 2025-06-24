/*
  Warnings:

  - You are about to drop the column `isArchived` on the `Doc` table. All the data in the column will be lost.
  - You are about to drop the column `isPrivate` on the `Doc` table. All the data in the column will be lost.
  - You are about to drop the column `isStarred` on the `Doc` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "SubspaceType" ADD VALUE 'PERSONAL';

-- AlterTable
ALTER TABLE "Doc" DROP COLUMN "isArchived",
DROP COLUMN "isPrivate",
DROP COLUMN "isStarred",
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Subspace" ADD COLUMN     "navigationTree" JSONB;
