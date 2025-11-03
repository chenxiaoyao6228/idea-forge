-- AlterTable: Remove visibility field from Doc table
-- Drop the enum type DocVisibility
ALTER TABLE "Doc" DROP COLUMN IF EXISTS "visibility";

-- Drop the enum type after removing all references
DROP TYPE IF EXISTS "DocVisibility";
