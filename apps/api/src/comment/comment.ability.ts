import { Injectable } from "@nestjs/common";
import { User } from "@idea/contracts";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";
import { ModelName } from "@casl/prisma/dist/types/prismaClientBoundTypes";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

@Injectable()
@DefineAbility("Comment" as ModelName)
export class CommentAbility extends BaseAbility {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async createForUser(user: User, context?: Record<string, unknown>): Promise<AppAbility> {
    return this.createAbilityAsync(async (builder) => {
      const { can } = builder;

      // Global permissions

      // User can always update/delete their own comments
      can([Action.Update, Action.Delete], "Comment", { createdById: user.id });

      // User can always read comments (document permission will be checked at service layer)
      can(Action.Read, "Comment");

      // User can create comments (document permission will be checked at service layer)
      can(Action.Create, "Comment");
    });
  }
}
