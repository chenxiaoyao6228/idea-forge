-- AlterTable
ALTER TABLE "Doc" ADD COLUMN     "subspaceAdminPermission" "PermissionLevel",
ADD COLUMN     "subspaceMemberPermission" "PermissionLevel",
ADD COLUMN     "nonSubspaceMemberPermission" "PermissionLevel";
