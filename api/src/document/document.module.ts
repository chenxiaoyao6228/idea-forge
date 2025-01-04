import { Module } from "@nestjs/common";

import { DocumentService } from "./ document.service";
import { DocumentController } from "./document.controller";
import { ShareDocumentService } from "./share-document.services";
import { ShareDocumentController } from "./share-document.controller";
import { FileStoreModule } from "@/file-store/file-store.module";
import { FileService } from "@/file-store/file-store.service";

@Module({
  imports: [FileStoreModule],
  controllers: [DocumentController, ShareDocumentController],
  providers: [DocumentService, ShareDocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
