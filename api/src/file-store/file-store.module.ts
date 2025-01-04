import { Module } from "@nestjs/common";
import { FileService } from "./file-store.service";
import { OssService } from "./oss.service";
import { FileController } from "./file-store.controller";

@Module({
  imports: [],
  providers: [FileService, OssService],
  exports: [FileService, OssService],
  controllers: [FileController],
})
export class FileStoreModule {}
