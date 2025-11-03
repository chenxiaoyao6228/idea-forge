import { Module } from "@nestjs/common";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { EventsModule } from "@/_shared/events/events.module";

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
