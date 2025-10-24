import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { CommentService } from "./comment.service";
import { CommentController } from "./comment.controller";
import { CommentAbility } from "./comment.ability";
import { CommentPresenter } from "./comment.presenter";
import { CommentProcessor } from "./processors/comment.processor";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { DocumentModule } from "@/document/document.module";
import { PermissionModule } from "@/permission/permission.module";
import { NotificationModule } from "@/notification/notification.module";
import { EventsModule } from "@/_shared/events/events.module";

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    BullModule.registerQueue({
      name: "comments",
    }),
    forwardRef(() => DocumentModule),
    forwardRef(() => PermissionModule),
    forwardRef(() => NotificationModule),
  ],
  providers: [CommentService, CommentAbility, CommentPresenter, CommentProcessor],
  controllers: [CommentController],
  exports: [CommentService, CommentAbility, CommentPresenter],
})
export class CommentModule {}
