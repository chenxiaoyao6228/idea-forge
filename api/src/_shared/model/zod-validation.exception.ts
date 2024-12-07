import { UnprocessableEntityException } from "@nestjs/common";
import type { ZodError } from "zod";

export class ZodValidationException extends UnprocessableEntityException {
  constructor(error: ZodError) {
    const firstError = error.errors[0];

    let message = "";
    if ("expected" in firstError) {
      message =
        firstError.path.length !== 0 ? `Path \`${firstError.path}\` should be \`${firstError.expected}\`, but got \`${firstError.received}\`` : firstError.code;
    } else {
      message = `\`${firstError.path}\`: ${firstError.message}`;
    }

    super(message);
  }
}
