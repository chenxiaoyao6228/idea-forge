import { ResourceType, UnifiedPermission } from "@prisma/client";

import { Inject, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { ExtendedPrismaClient, ModelName, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";
import { PermissionService } from "@/permission/permission.service";

@Injectable()
@DefineAbility("Doc" as ModelName)
export class DocumentAbility extends BaseAbility {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
    private readonly permissionService: PermissionService,
  ) {
    super();
  }
  // Will be called on each request that triggers a policy check
  async createForUser(user: User): Promise<AppAbility> {
    return this.createAbilityAsync(async ({ can }) => {
      const userPermissions = await this.permissionService.getUserAllPermissions(user.id);

      for (const perm of userPermissions) {
        this.definePermissionsByLevel(can, perm);
      }

      can([Action.Read, Action.Update, Action.Delete, Action.Share], "Doc", { authorId: user.id });
    });
  }

  private definePermissionsByLevel(can: any, perm: UnifiedPermission) {
    if (perm.resourceType !== "DOCUMENT") return;

    switch (perm.permission) {
      case "OWNER":
      case "MANAGE":
        can([Action.Read, Action.Update, Action.Delete, Action.Share, Action.Move], "Doc", { id: perm.resourceId });
        break;
      case "EDIT":
        can([Action.Read, Action.Update], "Doc", { id: perm.resourceId });
        break;
      case "COMMENT":
        can([Action.Read, Action.Comment], "Doc", { id: perm.resourceId });
        break;
      case "READ":
        can(Action.Read, "Doc", { id: perm.resourceId });
        break;
    }
  }
}
