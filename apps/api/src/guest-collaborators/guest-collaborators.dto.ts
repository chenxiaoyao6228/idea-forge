import { createZodDto } from "nestjs-zod";
import {
  inviteGuestSchema,
  inviteGuestToWorkspaceSchema,
  batchInviteGuestsSchema,
  updateGuestPermissionSchema,
  getWorkspaceGuestsSchema,
  removeGuestFromDocumentSchema,
  promoteGuestToMemberSchema,
} from "@idea/contracts";

export class InviteGuestDto extends createZodDto(inviteGuestSchema) {}
export class InviteGuestToWorkspaceDto extends createZodDto(inviteGuestToWorkspaceSchema) {}
export class BatchInviteGuestsDto extends createZodDto(batchInviteGuestsSchema) {}
export class UpdateGuestPermissionDto extends createZodDto(updateGuestPermissionSchema) {}
export class GetWorkspaceGuestsDto extends createZodDto(getWorkspaceGuestsSchema) {}
export class RemoveGuestFromDocumentDto extends createZodDto(removeGuestFromDocumentSchema) {}
export class PromoteGuestToMemberDto extends createZodDto(promoteGuestToMemberSchema) {}
