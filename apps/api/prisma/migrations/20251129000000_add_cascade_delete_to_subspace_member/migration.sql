-- DropForeignKey
ALTER TABLE "SubspaceMember" DROP CONSTRAINT "SubspaceMember_subspaceId_fkey";

-- DropForeignKey
ALTER TABLE "SubspaceMember" DROP CONSTRAINT "SubspaceMember_userId_fkey";

-- AddForeignKey
ALTER TABLE "SubspaceMember" ADD CONSTRAINT "SubspaceMember_subspaceId_fkey" FOREIGN KEY ("subspaceId") REFERENCES "Subspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubspaceMember" ADD CONSTRAINT "SubspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
