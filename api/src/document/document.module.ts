import { Module } from "@nestjs/common";

import { DocumentService } from "./ document.service";
import { DocumentController } from "./document.controller";
import { ShareDocumentService } from "./share-document.services";
import { ShareDocumentController } from "./share-document.controller";

@Module({
  imports: [],
  controllers: [DocumentController, ShareDocumentController],
  providers: [DocumentService, ShareDocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
