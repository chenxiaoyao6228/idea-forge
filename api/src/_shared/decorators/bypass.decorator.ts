import { SetMetadata } from "@nestjs/common";

export const BYPASS_KEY = "__bypass_key__";

export function Bypass() {
  return SetMetadata(BYPASS_KEY, true);
}
