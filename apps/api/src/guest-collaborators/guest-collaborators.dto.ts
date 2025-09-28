import { createZodDto } from "nestjs-zod";
import {
  inviteGuestSchema,
  batchInviteGuestsSchema,
  updateGuestPermissionSchema,
  getWorkspaceGuestsSchema,
  removeGuestFromDocumentSchema,
} from "@idea/contracts";

export class InviteGuestDto extends createZodDto(inviteGuestSchema) {}
export class BatchInviteGuestsDto extends createZodDto(batchInviteGuestsSchema) {}
export class UpdateGuestPermissionDto extends createZodDto(updateGuestPermissionSchema) {}
export class GetWorkspaceGuestsDto extends createZodDto(getWorkspaceGuestsSchema) {}
export class RemoveGuestFromDocumentDto extends createZodDto(removeGuestFromDocumentSchema) {}
