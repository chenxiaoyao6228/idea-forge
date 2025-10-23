import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { CommentService } from "./comment.service";
import { CommentController } from "./comment.controller";
import { CommentAbility } from "./comment.ability";
import { CommentPresenter } from "./comment.presenter";
import { CommentProcessor } from "./processors/comment.processor";
import { CommentGateway } from "./comment.gateway";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { DocumentModule } from "@/document/document.module";
import { PermissionModule } from "@/permission/permission.module";
import { NotificationModule } from "@/notification/notification.module";

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: "comments",
    }),
    forwardRef(() => DocumentModule),
    forwardRef(() => PermissionModule),
    forwardRef(() => NotificationModule),
  ],
  providers: [CommentService, CommentAbility, CommentPresenter, CommentProcessor, CommentGateway],
  controllers: [CommentController],
  exports: [CommentService, CommentAbility, CommentPresenter, CommentGateway],
})
export class CommentModule {}
