import { Module } from "@nestjs/common";
import { FileService } from "./file-store.service";
import { OssService } from "./oss.service";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { FileController } from "./file-store.controller";

@Module({
  imports: [PrismaModule],
  providers: [FileService, OssService],
  exports: [FileService, OssService],
  controllers: [FileController],
})
export class FileStoreModule {}
