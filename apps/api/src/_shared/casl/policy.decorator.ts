import { SetMetadata } from "@nestjs/common";
import { Action } from "./ability.class";
import { ModelName } from "@casl/prisma/dist/types/prismaClientBoundTypes";

export const CHECK_POLICY_KEY = "__check_policy_key__";

export function CheckPolicy(action: Action, model: ModelName) {
  return SetMetadata(CHECK_POLICY_KEY, { action, model });
}
