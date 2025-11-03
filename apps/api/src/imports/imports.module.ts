import { Module } from "@nestjs/common";
import { ImportsController } from "./imports.controller";
import { ImportsService } from "./imports.service";
import { ImportProcessor } from "./processors/import.processor";
import { FileStoreModule } from "@/file-store/file-store.module";
import { EventsModule } from "@/_shared/events/events.module";
import { DocumentModule } from "@/document/document.module";

@Module({
  imports: [FileStoreModule, EventsModule, DocumentModule],
  controllers: [ImportsController],
  providers: [ImportsService, ImportProcessor],
  exports: [ImportsService],
})
export class ImportsModule {}
