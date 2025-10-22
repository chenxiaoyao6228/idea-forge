import { Module, forwardRef } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DocumentService } from "./document.service";
import { DocumentController } from "./document.controller";
import { ShareDocumentService } from "./share-document.services";
import { ShareDocumentController } from "./share-document.controller";
import { FileStoreModule } from "@/file-store/file-store.module";
import { SystemDocumentService } from "./system-document.service";
import { SearchDocumentService } from "./search-document.service";
import { MoveDocumentService } from "./move-document.service";
import { SubspaceModule } from "@/subspace/subspace.module";
import { EventsModule } from "@/_shared/events/events.module";
import { GroupModule } from "@/group/group.module";
import { DocumentAbility } from "./document.ability";
import { PermissionModule } from "@/permission/permission.module";
import { DocumentTrashService } from "./trash-document.service";
import { EventDeduplicator } from "@/_shared/queues/helpers/event-deduplicator";
import { NotificationModule } from "@/notification/notification.module";

@Module({
  imports: [FileStoreModule, ScheduleModule.forRoot(), SubspaceModule, EventsModule, GroupModule, PermissionModule, forwardRef(() => NotificationModule)],
  controllers: [DocumentController, ShareDocumentController],
  providers: [
    DocumentService,
    ShareDocumentService,
    SystemDocumentService,
    MoveDocumentService,
    SearchDocumentService,
    DocumentTrashService,
    DocumentAbility,
    EventDeduplicator,
  ],
  exports: [DocumentService, SystemDocumentService, SearchDocumentService, MoveDocumentService, DocumentTrashService],
})
export class DocumentModule {}
