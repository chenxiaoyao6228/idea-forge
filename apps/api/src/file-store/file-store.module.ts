import { Module } from "@nestjs/common";
import { FileService } from "./file-store.service";
import { OssService } from "./oss.service";
import { FilePathService } from "./file-path.service";
import { FileCleanupService } from "./file-cleanup.service";
import { FileController } from "./file-store.controller";

@Module({
  imports: [],
  providers: [FileService, OssService, FilePathService, FileCleanupService],
  exports: [FileService, OssService, FilePathService, FileCleanupService],
  controllers: [FileController],
})
export class FileStoreModule {}
