import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DocumentService } from "./ document.service";
import { DocumentController } from "./document.controller";
import { ShareDocumentService } from "./share-document.services";
import { ShareDocumentController } from "./share-document.controller";
import { FileStoreModule } from "@/file-store/file-store.module";
import { FileService } from "@/file-store/file-store.service";
import { SystemDocumentService } from "./system-document.service";
@Module({
  imports: [FileStoreModule, ScheduleModule.forRoot()],
  controllers: [DocumentController, ShareDocumentController],
  providers: [DocumentService, ShareDocumentService, SystemDocumentService],
  exports: [DocumentService, SystemDocumentService],
})
export class DocumentModule {}
