/*
  Warnings:

  - You are about to drop the column `position` on the `Doc` table. All the data in the column will be lost.
  - You are about to drop the column `allowPublicDocs` on the `Workspace` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Doc" DROP COLUMN "position";

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "allowPublicDocs",
ADD COLUMN     "memberSubspaceCreate" BOOLEAN NOT NULL DEFAULT false;
