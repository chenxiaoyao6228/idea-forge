import { SetMetadata } from "@nestjs/common";

export const OMIT_RESPONSE_PROTECT_KEY = "__omit_response_protect_keys__";

export function ProtectKeys(keys: string[]): MethodDecorator {
  return (target, key, descriptor: PropertyDescriptor) => {
    SetMetadata(OMIT_RESPONSE_PROTECT_KEY, keys)(descriptor.value);
  };
}
