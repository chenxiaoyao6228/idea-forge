import { UnifiedPermission, ResourceType, PermissionLevel } from "@prisma/client";

import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { ModelName } from "@/_shared/database/prisma/prisma.extension";
import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";
import { PermissionService } from "@/permission/permission.service";

@Injectable()
@DefineAbility("Doc" as ModelName)
export class DocumentAbility extends BaseAbility {
  constructor(private readonly permissionService: PermissionService) {
    super();
  }
  // Will be called on each request that triggers a policy check
  async createForUser(user: User): Promise<AppAbility> {
    return this.createAbilityAsync(async (builder) => {
      const { can } = builder;

      const documentPermissions = await this.permissionService.getUserDocumentPermissions(user.id);
      const docIds = documentPermissions.map((p) => p.resourceId);
      const uniqueDocIds = Array.from(new Set(docIds));
      for (const docId of uniqueDocIds) {
        const level = await this.permissionService.resolveUserPermission(user.id, ResourceType.DOCUMENT, docId);
        this.definePermissionsByLevel(can, docId, level);
      }
      // Author always has full permissions on their own docs
      can([Action.Read, Action.Update, Action.Delete, Action.Share], "Doc", { authorId: user.id });
    });
  }

  private definePermissionsByLevel(can: any, docId: string, level: PermissionLevel) {
    switch (level) {
      case PermissionLevel.OWNER:
      case PermissionLevel.MANAGE:
        can([Action.Read, Action.Update, Action.Delete, Action.Share, Action.Move], "Doc", { id: docId });
        break;
      case PermissionLevel.EDIT:
        can([Action.Read, Action.Update], "Doc", { id: docId });
        break;
      case PermissionLevel.COMMENT:
        can([Action.Read, Action.Comment], "Doc", { id: docId });
        break;
      case PermissionLevel.READ:
        can(Action.Read, "Doc", { id: docId });
        break;
    }
  }
}
