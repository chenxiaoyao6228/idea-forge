import { Module } from "@nestjs/common";

import { DocumentService } from "./ document.service";
import { DocumentController } from "./document.controller";

@Module({
  imports: [],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
