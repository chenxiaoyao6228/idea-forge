import { Inject, Injectable } from "@nestjs/common";
import { User, Doc, Permission, WorkspaceRole, SubspaceRole } from "@prisma/client";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { ExtendedPrismaClient, ModelName, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";
import { PermissionHierarchyService } from "@/_shared/casl/permission-hierarchy.service";

@Injectable()
@DefineAbility("Doc" as ModelName)
export class DocumentAbility extends BaseAbility {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
    private readonly permissionHierarchy: PermissionHierarchyService,
  ) {
    super();
  }

  async createForUser(user: User): Promise<AppAbility> {
    return this.createAbilityAsync(async ({ can, cannot }) => {
      const workspaceMemberships = await this.prisma.workspaceMember.findMany({
        where: { userId: user.id },
        include: { workspace: true },
      });

      const subspaceMemberships = await this.prisma.subspaceMember.findMany({
        where: { userId: user.id },
        include: { subspace: true },
      });

      const sharedDocs = await this.prisma.docUserPermission.findMany({
        where: { userId: user.id },
        include: { doc: true },
      });

      // Define capabilities based on workspace role
      for (const membership of workspaceMemberships) {
        if (membership.role === WorkspaceRole.OWNER) {
          can(Action.Manage, "all", { workspaceId: membership.workspaceId });
        } else if (membership.role === WorkspaceRole.ADMIN) {
          can([Action.Read, Action.Update, Action.Create, Action.Delete, Action.Share], "Doc", {
            workspaceId: membership.workspaceId,
            visibility: "WORKSPACE",
          });
        } else if (membership.role === WorkspaceRole.MEMBER) {
          can(Action.Read, "Doc", {
            workspaceId: membership.workspaceId,
            visibility: "WORKSPACE",
          });
          can(Action.Create, "Doc", { workspaceId: membership.workspaceId });
        }
      }

      // Define capabilities based on subspace role
      for (const membership of subspaceMemberships) {
        if (membership.role === SubspaceRole.ADMIN) {
          can([Action.Read, Action.Update, Action.Create, Action.Delete, Action.Share], "Doc", {
            subspaceId: membership.subspaceId,
          });
        } else if (membership.role === SubspaceRole.MEMBER) {
          can(Action.Read, "Doc", { subspaceId: membership.subspaceId });
          can(Action.Create, "Doc", { subspaceId: membership.subspaceId });
        }
      }

      // Define capabilities based on document sharing
      for (const share of sharedDocs) {
        this.defineDocumentPermissions(can, share.permission, share.docId);
      }

      // Author can always manage their own documents
      can([Action.Read, Action.Update, Action.Delete, Action.Share], "Doc", { authorId: user.id });

      // Public documents can be read by anyone
      can(Action.Read, "Doc", { visibility: "PUBLIC" });
    });
  }

  // New: Method for dynamic permission checking
  async checkDocumentPermission(user: User, docId: string, action: Action): Promise<boolean> {
    const permission = await this.permissionHierarchy.resolveUserHierarchicalPermissions(user.id, docId, "Doc");

    return this.checkPermissionLevel(action, permission);
  }

  private checkPermissionLevel(action: Action, permission: Permission): boolean {
    const actionPermissionMap = {
      [Action.Read]: ["READ", "COMMENT", "EDIT", "SHARE", "MANAGE"],
      [Action.Comment]: ["COMMENT", "EDIT", "SHARE", "MANAGE"],
      [Action.Update]: ["EDIT", "SHARE", "MANAGE"],
      [Action.Share]: ["SHARE", "MANAGE"],
      [Action.Delete]: ["MANAGE"],
      [Action.Move]: ["MANAGE"],
    };

    return actionPermissionMap[action]?.includes(permission) || false;
  }

  private defineDocumentPermissions(can: any, permission: Permission, docId: string) {
    switch (permission) {
      case Permission.MANAGE:
        can([Action.Read, Action.Update, Action.Delete, Action.Share, Action.Move], "Doc", { id: docId });
        break;
      case Permission.SHARE:
        can([Action.Read, Action.Update, Action.Share], "Doc", { id: docId });
        break;
      case Permission.EDIT:
        can([Action.Read, Action.Update], "Doc", { id: docId });
        break;
      case Permission.COMMENT:
        can([Action.Read, Action.Comment], "Doc", { id: docId });
        break;
      case Permission.READ:
        can(Action.Read, "Doc", { id: docId });
        break;
    }
  }
}
