-- CreateEnum
CREATE TYPE "PermissionLevel_new" AS ENUM ('NONE', 'READ', 'COMMENT', 'EDIT', 'MANAGE');

-- AlterTable
ALTER TABLE "Doc" ALTER COLUMN "subspaceAdminPermission" TYPE "PermissionLevel_new" USING ("subspaceAdminPermission"::text::"PermissionLevel_new");
ALTER TABLE "Doc" ALTER COLUMN "subspaceMemberPermission" TYPE "PermissionLevel_new" USING ("subspaceMemberPermission"::text::"PermissionLevel_new");
ALTER TABLE "Doc" ALTER COLUMN "nonSubspaceMemberPermission" TYPE "PermissionLevel_new" USING ("nonSubspaceMemberPermission"::text::"PermissionLevel_new");

-- AlterTable
ALTER TABLE "DocumentPermission" ALTER COLUMN "permission" TYPE "PermissionLevel_new" USING ("permission"::text::"PermissionLevel_new");

-- AlterTable
ALTER TABLE "DocShare" ALTER COLUMN "permission" DROP DEFAULT;
ALTER TABLE "DocShare" ALTER COLUMN "permission" TYPE "PermissionLevel_new" USING ("permission"::text::"PermissionLevel_new");
ALTER TABLE "DocShare" ALTER COLUMN "permission" SET DEFAULT 'READ';

-- AlterTable
ALTER TABLE "Subspace" ALTER COLUMN "subspaceAdminPermission" TYPE "PermissionLevel_new" USING ("subspaceAdminPermission"::text::"PermissionLevel_new");
ALTER TABLE "Subspace" ALTER COLUMN "subspaceMemberPermission" TYPE "PermissionLevel_new" USING ("subspaceMemberPermission"::text::"PermissionLevel_new");
ALTER TABLE "Subspace" ALTER COLUMN "nonSubspaceMemberPermission" TYPE "PermissionLevel_new" USING ("nonSubspaceMemberPermission"::text::"PermissionLevel_new");

-- DropEnum
DROP TYPE "PermissionLevel";

-- AlterEnum
ALTER TYPE "PermissionLevel_new" RENAME TO "PermissionLevel";
