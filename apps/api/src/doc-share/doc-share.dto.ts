import { createZodDto } from "nestjs-zod";

import { docShareInfoSchema, createShareSchema, updateShareSchema, revokeShareSchema, shareListRequestSchema } from "@idea/contracts";

export class DocShareInfoDto extends createZodDto(docShareInfoSchema) {}
export class CreateShareDto extends createZodDto(createShareSchema) {}
export class UpdateShareDto extends createZodDto(updateShareSchema) {}
export class RevokeShareDto extends createZodDto(revokeShareSchema) {}
export class ShareListRequestDto extends createZodDto(shareListRequestSchema) {}
export class ListSharedWithMeDto extends createZodDto(shareListRequestSchema) {}
export class ListSharedByMeDto extends createZodDto(shareListRequestSchema) {}
