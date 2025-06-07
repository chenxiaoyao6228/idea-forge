/*
  Warnings:

  - Added the required column `createdById` to the `Doc` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastModifiedById` to the `Doc` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DocGroupPermission_userId_groupId_key";

-- AlterTable
ALTER TABLE "Doc" ADD COLUMN     "createdById" INTEGER NOT NULL,
ADD COLUMN     "lastModifiedById" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
