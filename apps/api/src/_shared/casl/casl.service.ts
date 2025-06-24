import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DiscoveryService, Reflector } from "@nestjs/core";
import { BaseAbility } from "./ability.class";
import { ABILITY_FACTORY_KEY } from "./ability.decorator";
import { ModelName } from "@casl/prisma/dist/types/prismaClientBoundTypes";

@Injectable()
export class AbilityService implements OnModuleInit {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  private logger = new Logger("AbilityService");

  abilityMap: Record<ModelName, BaseAbility>;

  onModuleInit() {
    this.createAbility();
  }

  private createAbility() {
    const providers = this.discovery.getProviders();

    const abilityMap = {};

    providers.forEach((provider) => {
      try {
        const model = this.reflector.get(ABILITY_FACTORY_KEY, provider.metatype);

        if (model) abilityMap[model] = provider.instance;

        return model;
      } catch {}
    });

    this.abilityMap = abilityMap as Record<ModelName, BaseAbility>;
    return abilityMap;
  }
}
