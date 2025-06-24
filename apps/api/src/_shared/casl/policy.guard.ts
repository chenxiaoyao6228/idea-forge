import { ExecutionContext, Injectable } from "@nestjs/common";
import { CanActivate } from "@nestjs/common";
import { Action } from "./ability.class";
import { Reflector } from "@nestjs/core";
import { CHECK_POLICY_KEY } from "./policy.decorator";
import { ModelName } from "@casl/prisma/dist/types/prismaClientBoundTypes";
import { AbilityService } from "./casl.service";
import { subject } from "@casl/ability";
import { getRequestItemId } from "./util";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { PrismaService } from "../database/prisma/prisma.service";

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private abilityService: AbilityService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) throw new ApiException(ErrorCodeEnum.PermissionDenied);

    const policy = this.reflector.getAllAndOverride<{ action: Action; model: ModelName }>(CHECK_POLICY_KEY, [context.getHandler(), context.getClass()]);

    if (!policy) return true;

    const { action, model } = policy;
    const id = getRequestItemId(request);

    try {
      const ability = await this.abilityService.abilityMap[model].createForUser(user);

      if (id) {
        const item = await this.prismaService[model].findUniqueOrThrow({ where: { id } });

        return ability.can(action, subject(model, item));
      }

      return ability.can(action, model);
    } catch (error) {
      if (error instanceof ApiException) throw error;
      console.log("policy guard error", error);
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }
  }
}
