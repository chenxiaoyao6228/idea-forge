import { createZodDto } from "nestjs-zod";
import {
  CreateSubscriptionRequestSchema,
  ListSubscriptionsRequestSchema,
  GetSubscriptionRequestSchema,
  DeleteSubscriptionRequestSchema,
} from "@idea/contracts";

export class CreateSubscriptionDto extends createZodDto(CreateSubscriptionRequestSchema) {}
export class ListSubscriptionsDto extends createZodDto(ListSubscriptionsRequestSchema) {}
export class GetSubscriptionDto extends createZodDto(GetSubscriptionRequestSchema) {}
export class DeleteSubscriptionDto extends createZodDto(DeleteSubscriptionRequestSchema) {}
