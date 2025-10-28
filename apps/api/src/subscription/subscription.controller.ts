import { Controller, Post, Body, Get, Param } from "@nestjs/common";
import { SubscriptionService } from "./subscription.service";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { CreateSubscriptionDto, ListSubscriptionsDto, GetSubscriptionDto, DeleteSubscriptionDto } from "./subscription.dto";

@Controller("/api/subscriptions")
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post("create")
  async create(@GetUser("id") userId: string, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.createSubscription(userId, dto);
  }

  @Post("list")
  async list(@GetUser("id") userId: string, @Body() dto: ListSubscriptionsDto) {
    return this.subscriptionService.listUserSubscriptions(userId, dto.documentId, dto.subspaceId);
  }

  @Post("info")
  async info(@GetUser("id") userId: string, @Body() dto: GetSubscriptionDto) {
    return this.subscriptionService.getSubscription(dto.subscriptionId, userId);
  }

  @Post("delete")
  async delete(@GetUser("id") userId: string, @Body() dto: DeleteSubscriptionDto) {
    await this.subscriptionService.deleteSubscription(dto.subscriptionId, userId);
    return {
      success: true,
      message: "Subscription deleted successfully",
    };
  }
}
