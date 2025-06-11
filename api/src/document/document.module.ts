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
import { DocShareModule } from "@/doc-share/doc-share.module";
import { GroupModule } from "@/group/group.module";
import { PermissionInheritanceService } from "./permission-inheritance.service";
import { PermissionResolverService } from "./permission-resolver.service";
import { PermissionHierarchyService } from "@/_shared/casl/permission-hierarchy.service";

@Module({
  imports: [FileStoreModule, ScheduleModule.forRoot(), SubspaceModule, EventsModule, DocShareModule, GroupModule],
  controllers: [DocumentController, ShareDocumentController],
  providers: [
    DocumentService,
    ShareDocumentService,
    SystemDocumentService,
    MoveDocumentService,
    SearchDocumentService,
    PermissionInheritanceService,
    PermissionResolverService,
    PermissionHierarchyService,
    DocumentAbility,
  ],
  exports: [DocumentService, SystemDocumentService, SearchDocumentService, MoveDocumentService],
})
export class DocumentModule {}
