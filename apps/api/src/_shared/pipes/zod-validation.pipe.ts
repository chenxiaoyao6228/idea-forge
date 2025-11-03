// For more information, see: https://github.com/BenLorantfy/nestjs-zod?tab=readme-ov-file#using-zodvalidationpipe
import { UnprocessableEntityException } from "@nestjs/common";
import { createZodValidationPipe } from "nestjs-zod";
import { ZodError } from "zod";

export const ZodValidationPipe = createZodValidationPipe({
  createValidationException: (error: ZodError) => {
    const firstError = error.errors[0];

    if ("expected" in firstError) {
      let formattedErrorMessage: string = firstError.code;
      if (firstError.path.length !== 0)
        formattedErrorMessage = `Path \`${firstError.path}\` should be \`${firstError.expected}\`, but got \`${firstError.received}\``;

      return new UnprocessableEntityException(formattedErrorMessage);
    }

    return new UnprocessableEntityException(`\`${firstError.path}\`: ${firstError.message}`);
  },
});
