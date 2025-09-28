-- Add guestCollaboratorId column to DocumentPermission table
ALTER TABLE "DocumentPermission" ADD COLUMN "guestCollaboratorId" TEXT;

-- Add foreign key constraint for guestCollaboratorId
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_guestCollaboratorId_fkey" FOREIGN KEY ("guestCollaboratorId") REFERENCES "GuestCollaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add unique constraint for guestCollaboratorId
ALTER TABLE "DocumentPermission" ADD CONSTRAINT "DocumentPermission_guestCollaboratorId_docId_inheritedFromType_key" UNIQUE ("guestCollaboratorId", "docId", "inheritedFromType");

-- Add index for guestCollaboratorId
CREATE INDEX "DocumentPermission_guestCollaboratorId_docId_idx" ON "DocumentPermission"("guestCollaboratorId", "docId");
