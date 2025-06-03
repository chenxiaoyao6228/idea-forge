import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DocumentService } from "./document.service";
import { DocumentController } from "./document.controller";
import { ShareDocumentService } from "./share-document.services";
import { ShareDocumentController } from "./share-document.controller";
import { FileStoreModule } from "@/file-store/file-store.module";
import { SystemDocumentService } from "./system-document.service";
import { SearchDocumentService } from "./search-document.service";
import { DocumentAbility } from "./document.ability";
import { MoveDocumentService } from "./move-document.service";
import { SubspaceModule } from "@/subspace/subspace.module";
import { EventsModule } from "@/_shared/events/events.module";

@Module({
  imports: [FileStoreModule, ScheduleModule.forRoot(), SubspaceModule, EventsModule],
  controllers: [DocumentController, ShareDocumentController],
  providers: [DocumentService, ShareDocumentService, SystemDocumentService, MoveDocumentService, SearchDocumentService, DocumentAbility],
  exports: [DocumentService, SystemDocumentService, SearchDocumentService, MoveDocumentService],
})
export class DocumentModule {}
