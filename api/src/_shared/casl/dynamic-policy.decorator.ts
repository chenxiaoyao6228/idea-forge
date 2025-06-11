import { SetMetadata } from "@nestjs/common";
import { CHECK_POLICY_KEY } from "./policy.decorator";
import { ModelName } from "../database/prisma/prisma.extension";
import { Action } from "./ability.class";

export const CheckDynamicPolicy = (action: Action, model: ModelName) => SetMetadata(CHECK_POLICY_KEY, { action, model, dynamic: true });
