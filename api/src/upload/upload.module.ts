import { Module } from "@nestjs/common";
import { UploadController } from "./upload.controller";
import { CosService } from "./upload.service";
import { ConfigsModule } from "@/_shared/config/config.module";

@Module({
  imports: [ConfigsModule],
  controllers: [UploadController],
  providers: [CosService],
})
export class UploadModule {}
