import { PermissionLevel } from "@idea/contracts";

import { Injectable } from "@nestjs/common";
import { User } from "@idea/contracts";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";
import { DocPermissionResolveService } from "@/permission/document-permission.service";
import { ModelName } from "@casl/prisma/dist/types/prismaClientBoundTypes";

type DocumentAbilityContext = {
  doc?: {
    id: string;
    workspaceId: string;
    subspaceId?: string | null;
    authorId: string;
    parentId?: string | null;
  };
};

@Injectable()
@DefineAbility("Doc" as ModelName)
export class DocumentAbility extends BaseAbility {
  constructor(private readonly docPermissionResolveService: DocPermissionResolveService) {
    super();
  }
  // Will be called on each request that triggers a policy check
  async createForUser(user: User, context?: Record<string, unknown>): Promise<AppAbility> {
    return this.createAbilityAsync(async (builder) => {
      const { can } = builder;
      const contextDoc = (context as DocumentAbilityContext | undefined)?.doc;

      if (contextDoc) {
        await this.buildContextSpecificPermissions(can, user, contextDoc);
      } else {
        await this.buildGlobalPermissions(can, user);
      }
    });
  }

  private async buildContextSpecificPermissions(can: any, user: User, contextDoc: DocumentAbilityContext["doc"]) {
    if (!contextDoc) return;

    let level = await this.docPermissionResolveService.resolveUserPermissionForDocument(user.id, {
      id: contextDoc.id,
      workspaceId: contextDoc.workspaceId,
      parentId: contextDoc.parentId ?? null,
      subspaceId: contextDoc.subspaceId ?? null,
    });

    // Author always has MANAGE level permissions on their own documents
    if (contextDoc.authorId === user.id && level !== PermissionLevel.MANAGE) {
      level = PermissionLevel.MANAGE;
    }

    this.defineContentPermissionsByLevel(can, contextDoc.id, level);
  }

  private async buildGlobalPermissions(can: any, user: User) {
    // TODO:
    // Author always has full permissions on their own docs when building global ability
    can([Action.Read, Action.Update, Action.Delete, Action.Share], "Doc", { authorId: user.id });
  }

  private defineContentPermissionsByLevel(can: any, docId: string, level: PermissionLevel) {
    switch (level) {
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
