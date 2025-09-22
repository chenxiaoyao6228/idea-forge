import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DiscoveryService, Reflector } from "@nestjs/core";
import { BaseAbility } from "./ability.class";
import { ABILITY_FACTORY_KEY } from "./ability.decorator";
import { ModelName } from "@casl/prisma/dist/types/prismaClientBoundTypes";
import { packRules } from "@casl/ability/extra";
import type { SerializedAbility, SerializedAbilityMap } from "@idea/contracts";
import type { AppAbility } from "./ability.class";

@Injectable()
export class AbilityService implements OnModuleInit {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  private logger = new Logger("AbilityService");
  private readonly abilityFactories = new Map<ModelName, BaseAbility>();

  onModuleInit() {
    this.collectAbilityFactories();
  }

  private collectAbilityFactories() {
    const providers = this.discovery.getProviders();

    providers.forEach((provider) => {
      try {
        const model = this.reflector.get(ABILITY_FACTORY_KEY, provider.metatype);

        if (model && provider.instance) {
          this.abilityFactories.set(model, provider.instance as BaseAbility);
        }
      } catch (error) {
        // this.logger.verbose(`Unable to register ability factory for provider ${provider.name}: ${(error as Error).message}`);
      }
    });
  }

  private getFactory(model: ModelName): BaseAbility {
    const factory = this.abilityFactories.get(model);

    if (!factory) {
      this.logger.error(`Missing ability factory for model ${model}`);
      throw new Error(`Ability factory for ${model} is not registered`);
    }

    return factory;
  }

  async createAbilityForUser(model: ModelName, user: Record<string, any>): Promise<AppAbility> {
    const factory = this.getFactory(model);
    return factory.createForUser(user);
  }

  async serializeAbilityForUser(model: ModelName, user: Record<string, any>): Promise<SerializedAbility> {
    const ability = await this.createAbilityForUser(model, user);

    return {
      subject: model,
      rules: packRules(ability.rules),
    };
  }

  async serializeAbilitiesForUser(user: Record<string, any>, models?: ModelName[]): Promise<SerializedAbilityMap> {
    const targets = models ?? Array.from(this.abilityFactories.keys());

    const entries = await Promise.all(
      targets.map(async (model) => {
        const serialized = await this.serializeAbilityForUser(model, user);
        return [model, serialized] as const;
      }),
    );

    return Object.fromEntries(entries);
  }
}
