import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { GuestCollaboratorsService } from "./guest-collaborators.service";
import { InviteGuestDto, BatchInviteGuestsDto, UpdateGuestPermissionDto, GetWorkspaceGuestsDto, RemoveGuestFromDocumentDto } from "./guest-collaborators.dto";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { PolicyGuard } from "@/_shared/casl/policy.guard";
import { CheckPolicy } from "@/_shared/casl/policy.decorator";
import { Action } from "@/_shared/casl/ability.class";

@UseGuards(PolicyGuard)
@Controller("/api/guest-collaborators")
export class GuestCollaboratorsController {
  constructor(private readonly guestCollaboratorsService: GuestCollaboratorsService) {}

  @Post("invite")
  @CheckPolicy(Action.Create, "GuestCollaborator")
  async inviteGuest(@GetUser("id") userId: string, @Body() dto: InviteGuestDto) {
    return this.guestCollaboratorsService.inviteGuestToDocument(userId, dto);
  }

  @Post("batch-invite")
  @CheckPolicy(Action.Create, "GuestCollaborator")
  async batchInviteGuests(@GetUser("id") userId: string, @Body() dto: BatchInviteGuestsDto) {
    return this.guestCollaboratorsService.batchInviteGuestsToDocument(userId, dto);
  }

  @Post("workspace/guests")
  @CheckPolicy(Action.Read, "GuestCollaborator")
  async getWorkspaceGuests(@GetUser("id") userId: string, @Body() dto: GetWorkspaceGuestsDto) {
    return this.guestCollaboratorsService.getWorkspaceGuests(userId, dto);
  }

  @Get("document/:documentId")
  @CheckPolicy(Action.Read, "GuestCollaborator")
  async getGuestsOfDocument(@Param("documentId") documentId: string) {
    return this.guestCollaboratorsService.getGuestsOfDocument(documentId);
  }

  @Patch(":guestId/permission")
  @CheckPolicy(Action.Update, "GuestCollaborator")
  async updateGuestPermission(@GetUser("id") userId: string, @Param("guestId") guestId: string, @Body() dto: UpdateGuestPermissionDto) {
    return this.guestCollaboratorsService.updateGuestPermission(userId, guestId, dto);
  }

  @Delete(":guestId")
  @CheckPolicy(Action.Delete, "GuestCollaborator")
  async removeGuestFromWorkspace(@GetUser("id") userId: string, @Param("guestId") guestId: string) {
    await this.guestCollaboratorsService.removeGuestFromWorkspace(userId, guestId);
    return { message: "Guest removed successfully" };
  }

  @Delete(":guestId/documents/:documentId")
  @CheckPolicy(Action.Delete, "GuestCollaborator")
  async removeGuestFromDocument(@GetUser("id") userId: string, @Param("guestId") guestId: string, @Param("documentId") documentId: string) {
    const dto: RemoveGuestFromDocumentDto = { documentId };
    await this.guestCollaboratorsService.removeGuestFromDocument(userId, guestId, dto);
    return { message: "Guest access removed successfully" };
  }
}
