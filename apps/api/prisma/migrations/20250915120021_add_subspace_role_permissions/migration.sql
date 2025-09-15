-- AlterTable
ALTER TABLE "Subspace" ADD COLUMN     "nonSubspaceMemberPermission" "PermissionLevel" NOT NULL DEFAULT 'COMMENT',
ADD COLUMN     "subspaceAdminPermission" "PermissionLevel" NOT NULL DEFAULT 'OWNER',
ADD COLUMN     "subspaceMemberPermission" "PermissionLevel" NOT NULL DEFAULT 'OWNER';
