import { subject } from "@casl/ability";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AbilityService } from "./casl.service";
import { CHECK_POLICY_KEY, PolicyObject } from "./policy.decorator";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { type ExtendedPrismaClient, InjectPrismaClient } from "@/_shared/database/prisma/prisma.extension";
import { getRequestItemId } from "./util";

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private abilityService: AbilityService,
    @InjectPrismaClient()
    private readonly prisma: ExtendedPrismaClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const { user } = request;

    if (!user) throw new UnauthorizedException();

    const policy = this.reflector.getAllAndOverride<PolicyObject>(CHECK_POLICY_KEY, [context.getHandler(), context.getClass()]);

    if (!policy) throw new ApiException(ErrorCodeEnum.PermissionDenied);

    const { action, model } = policy;

    const ability = this.abilityService.abilityMap[model].createForUser(user);

    const id = getRequestItemId(request);

    if (id) {
      const item = await this.prisma[model].findUniqueOrThrow({
        where: { id },
      });

      return ability.can(action, subject(model, item));
    }

    return ability.can(action, model);
  }
}
