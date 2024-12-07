import type { ZodSchema } from "zod";

export interface ZodDto<T = any> {
  new (): T;
  schema: ZodSchema;
  isZodDto: true;
  create(input: unknown): T;
}

export function createZodDto<T>(schema: ZodSchema<T>): ZodDto<T> {
  class ZodDtoClass {
    static schema = schema;
    static isZodDto = true as const;

    static create(input: unknown): T {
      return schema.parse(input);
    }
  }

  return ZodDtoClass as unknown as ZodDto<T>;
}
