import { createZodDto } from "nestjs-zod";
import { UploadCredentialsRequestSchema, ConfirmUploadRequestSchema, ProxyImageRequestSchema } from "contracts";

export class UploadCredentialsDto extends createZodDto(UploadCredentialsRequestSchema) {}
export class ConfirmUploadDto extends createZodDto(ConfirmUploadRequestSchema) {}
export class ProxyImageDto extends createZodDto(ProxyImageRequestSchema) {}
