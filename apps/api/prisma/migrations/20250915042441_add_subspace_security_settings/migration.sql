-- AlterTable
ALTER TABLE "Subspace" ADD COLUMN     "allowExport" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowGuestCollaborators" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowMemberInvites" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowPublicSharing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowTopLevelEdit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "memberInvitePermission" TEXT NOT NULL DEFAULT 'ALL_MEMBERS',
ADD COLUMN     "topLevelEditPermission" TEXT NOT NULL DEFAULT 'ADMINS_ONLY';
