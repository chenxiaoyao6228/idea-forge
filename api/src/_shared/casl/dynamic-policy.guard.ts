import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Permission } from "@prisma/client";
import { CanActivate } from "@nestjs/common";
import { Action } from "./ability.class";
import { Reflector } from "@nestjs/core";
import { CHECK_POLICY_KEY, PolicyObject } from "./policy.decorator";
import { ExtendedPrismaClient } from "../database/prisma/prisma.extension";
import { PermissionResolverService } from "@/document/permission-resolver.service";
import { InjectPrismaClient } from "../database/prisma/prisma.extension";
import { AbilityService } from "./casl.service";
import { subject } from "@casl/ability";
import { getRequestItemId } from "./util";
import { ApiException } from "../exceptions/api.exception";
import { ErrorCodeEnum } from "../constants/api-response-constant";

@Injectable()
export class DynamicPolicyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private abilityService: AbilityService,
    private permissionResolver: PermissionResolverService,
    @InjectPrismaClient() private readonly prisma: ExtendedPrismaClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) throw new ApiException(ErrorCodeEnum.PermissionDenied);

    const policy = this.reflector.getAllAndOverride<PolicyObject>(CHECK_POLICY_KEY, [context.getHandler(), context.getClass()]);

    if (!policy) throw new ApiException(ErrorCodeEnum.PermissionDenied);

    const { action, model } = policy;
    const id = getRequestItemId(request);

    if (model === "Doc" && id) {
      // use permission resolver to get final permission
      const finalPermission = await this.permissionResolver.resolveUserPermission(user.id, id);
      return this.checkPermissionLevel(action, finalPermission);
    }

    // fallback to standard CASL check
    const ability = await this.abilityService.abilityMap[model].createForUser(user);

    if (id) {
      const item = await this.prisma[model].findUniqueOrThrow({ where: { id } });
      return ability.can(action, subject(model, item));
    }

    return ability.can(action, model);
  }

  private checkPermissionLevel(action: Action, permission: Permission): boolean {
    const actionPermissionMap = {
      [Action.Read]: ["READ", "COMMENT", "EDIT", "SHARE", "MANAGE"],
      [Action.Comment]: ["COMMENT", "EDIT", "SHARE", "MANAGE"],
      [Action.Update]: ["EDIT", "SHARE", "MANAGE"],
      [Action.Share]: ["SHARE", "MANAGE"],
      [Action.Delete]: ["MANAGE"],
      [Action.Move]: ["MANAGE"],
      [Action.ManagePermissions]: ["MANAGE"],
      [Action.ViewPermissions]: ["SHARE", "MANAGE"],
      [Action.BulkMove]: ["MANAGE"],
      [Action.BulkDelete]: ["MANAGE"],
      [Action.BulkShare]: ["SHARE", "MANAGE"],
      [Action.BulkExport]: ["READ", "COMMENT", "EDIT", "SHARE", "MANAGE"],
    };

    return actionPermissionMap[action]?.includes(permission) || false;
  }
}
