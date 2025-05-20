import { Inject, Injectable } from "@nestjs/common";
import { User, Doc, Permission, WorkspaceRole, SubspaceRole } from "@prisma/client";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { ExtendedPrismaClient, ModelName, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";

@Injectable()
@DefineAbility("Doc" as ModelName)
export class DocumentAbility extends BaseAbility {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {
    super();
  }
  async createForUser(user: User): Promise<AppAbility> {
    return this.createAbilityAsync(async ({ can, cannot }) => {
      // // Get user's workspace memberships
      // const workspaceMemberships = await this.prisma.workspaceMember.findMany({
      //   where: { userId: user.id },
      //   include: { workspace: true }
      // });
      // // Get user's subspace memberships
      // const subspaceMemberships = await this.prisma.subspaceMember.findMany({
      //   where: { userId: user.id },
      //   include: { subspace: true }
      // });
      // // Get user's group memberships
      // const groupMemberships = await this.prisma.memberGroupUser.findMany({
      //   where: { userId: user.id },
      //   include: { group: true }
      // });
      // // Get documents shared with user
      // const sharedDocs = await this.prisma.docShare.findMany({
      //   where: { userId: user.id },
      //   include: { doc: true }
      // });
      // // Define abilities based on workspace roles
      // for (const membership of workspaceMemberships) {
      //   if (membership.role === WorkspaceRole.OWNER) {
      //     can(Action.Manage, 'all', { workspaceId: membership.workspaceId });
      //   } else if (membership.role === WorkspaceRole.ADMIN) {
      //     can([Action.Read, Action.Update, Action.Create, Action.Delete, Action.Share], 'Doc', {
      //       workspaceId: membership.workspaceId,
      //       visibility: 'WORKSPACE'
      //     });
      //     can([Action.Read, Action.Update, Action.Create, Action.Delete], 'Subspace', {
      //       workspaceId: membership.workspaceId
      //     });
      //   } else if (membership.role === WorkspaceRole.MEMBER) {
      //     can(Action.Read, 'Doc', {
      //       workspaceId: membership.workspaceId,
      //       visibility: 'WORKSPACE'
      //     });
      //     can(Action.Create, 'Doc', { workspaceId: membership.workspaceId });
      //   }
      // }
      // // Define abilities based on subspace roles
      // for (const membership of subspaceMemberships) {
      //   if (membership.role === SubspaceRole.ADMIN) {
      //     can([Action.Read, Action.Update, Action.Create, Action.Delete, Action.Share], 'Doc', {
      //       subspaceId: membership.subspaceId,
      //       visibility: 'WORKSPACE'
      //     });
      //   } else if (membership.role === SubspaceRole.MEMBER) {
      //     can(Action.Read, 'Doc', {
      //       subspaceId: membership.subspaceId,
      //       visibility: 'WORKSPACE'
      //     });
      //     can(Action.Create, 'Doc', { subspaceId: membership.subspaceId });
      //   }
      // }
      // // Define abilities based on document shares
      // for (const share of sharedDocs) {
      //   if (share.permission === Permission.READ) {
      //     can(Action.Read, 'Doc', { id: share.docId });
      //   } else if (share.permission === Permission.EDIT) {
      //     can([Action.Read, Action.Update], 'Doc', { id: share.docId });
      //   } else if (share.permission === Permission.COMMENT) {
      //     can([Action.Read, Action.Comment], 'Doc', { id: share.docId });
      //   } else if (share.permission === Permission.MANAGE) {
      //     can([Action.Read, Action.Update, Action.Delete, Action.Share], 'Doc', { id: share.docId });
      //   }
      // }
      // // Authors can always manage their own documents
      // can([Action.Read, Action.Update, Action.Delete, Action.Share], 'Doc', { authorId: user.id });
      // // Public documents can be read by anyone
      // can(Action.Read, 'Doc', { visibility: 'PUBLIC' });
    });
  }
}
