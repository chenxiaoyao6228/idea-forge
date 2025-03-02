import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const I18n = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.i18n;
});
