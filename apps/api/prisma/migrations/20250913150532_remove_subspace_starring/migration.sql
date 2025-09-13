/*
  Warnings:

  - You are about to drop the column `subspaceId` on the `Star` table. All the data in the column will be lost.
  - You are about to drop the column `isArchived` on the `Subspace` table. All the data in the column will be lost.
  - Made the column `docId` on table `Star` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Star" DROP CONSTRAINT "Star_subspaceId_fkey";

-- DropIndex
DROP INDEX "Star_docId_subspaceId_key";

-- DropIndex
DROP INDEX "Star_userId_subspaceId_key";

-- AlterTable
ALTER TABLE "Star" DROP COLUMN "subspaceId",
ALTER COLUMN "docId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Subspace" DROP COLUMN "isArchived",
ADD COLUMN     "archivedAt" TIMESTAMP(3);
