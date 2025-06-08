/*
  Warnings:

  - The primary key for the `AITokenUsage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `PublicEditHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PublicShare` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AITokenUsage" DROP CONSTRAINT "AITokenUsage_userId_fkey";

-- DropForeignKey
ALTER TABLE "Connection" DROP CONSTRAINT "Connection_userId_fkey";

-- DropForeignKey
ALTER TABLE "Doc" DROP CONSTRAINT "Doc_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Doc" DROP CONSTRAINT "Doc_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Doc" DROP CONSTRAINT "Doc_lastModifiedById_fkey";

-- DropForeignKey
ALTER TABLE "DocGroupPermission" DROP CONSTRAINT "DocGroupPermission_createdById_fkey";

-- DropForeignKey
ALTER TABLE "DocGroupPermission" DROP CONSTRAINT "DocGroupPermission_userId_fkey";

-- DropForeignKey
ALTER TABLE "DocRevision" DROP CONSTRAINT "DocRevision_authorId_fkey";

-- DropForeignKey
ALTER TABLE "DocShare" DROP CONSTRAINT "DocShare_authorId_fkey";

-- DropForeignKey
ALTER TABLE "DocShare" DROP CONSTRAINT "DocShare_userId_fkey";

-- DropForeignKey
ALTER TABLE "DocUserPermission" DROP CONSTRAINT "DocUserPermission_createdById_fkey";

-- DropForeignKey
ALTER TABLE "DocUserPermission" DROP CONSTRAINT "DocUserPermission_userId_fkey";

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_userId_fkey";

-- DropForeignKey
ALTER TABLE "GuestCollaborator" DROP CONSTRAINT "GuestCollaborator_invitedById_fkey";

-- DropForeignKey
ALTER TABLE "MemberGroupUser" DROP CONSTRAINT "MemberGroupUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "Password" DROP CONSTRAINT "Password_userId_fkey";

-- DropForeignKey
ALTER TABLE "PublicEditHistory" DROP CONSTRAINT "PublicEditHistory_shareId_fkey";

-- DropForeignKey
ALTER TABLE "PublicShare" DROP CONSTRAINT "PublicShare_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "PublicShare" DROP CONSTRAINT "PublicShare_docId_fkey";

-- DropForeignKey
ALTER TABLE "Star" DROP CONSTRAINT "Star_userId_fkey";

-- DropForeignKey
ALTER TABLE "SubspaceMember" DROP CONSTRAINT "SubspaceMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "SubspaceMemberPermission" DROP CONSTRAINT "SubspaceMemberPermission_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserLoginHistory" DROP CONSTRAINT "UserLoginHistory_userId_fkey";

-- DropForeignKey
ALTER TABLE "WorkspaceMember" DROP CONSTRAINT "WorkspaceMember_userId_fkey";

-- AlterTable
ALTER TABLE "AITokenUsage" DROP CONSTRAINT "AITokenUsage_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "AITokenUsage_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "AITokenUsage_id_seq";

-- AlterTable
ALTER TABLE "Connection" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Doc" ALTER COLUMN "authorId" SET DATA TYPE TEXT,
ALTER COLUMN "createdById" SET DATA TYPE TEXT,
ALTER COLUMN "lastModifiedById" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "DocGroupPermission" ALTER COLUMN "createdById" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "DocRevision" ALTER COLUMN "authorId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "DocShare" ALTER COLUMN "authorId" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "DocUserPermission" ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "createdById" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "GuestCollaborator" ALTER COLUMN "invitedById" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "MemberGroupUser" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Password" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Star" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "SubspaceMember" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "SubspaceMemberPermission" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AlterTable
ALTER TABLE "UserLoginHistory" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "WorkspaceMember" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "PublicEditHistory";

-- DropTable
DROP TABLE "PublicShare";

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocRevision" ADD CONSTRAINT "DocRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubspaceMember" ADD CONSTRAINT "SubspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubspaceMemberPermission" ADD CONSTRAINT "SubspaceMemberPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberGroupUser" ADD CONSTRAINT "MemberGroupUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocGroupPermission" ADD CONSTRAINT "DocGroupPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocGroupPermission" ADD CONSTRAINT "DocGroupPermission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocUserPermission" ADD CONSTRAINT "DocUserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocUserPermission" ADD CONSTRAINT "DocUserPermission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCollaborator" ADD CONSTRAINT "GuestCollaborator_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Password" ADD CONSTRAINT "Password_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocShare" ADD CONSTRAINT "DocShare_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocShare" ADD CONSTRAINT "DocShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AITokenUsage" ADD CONSTRAINT "AITokenUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLoginHistory" ADD CONSTRAINT "UserLoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Star" ADD CONSTRAINT "Star_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
