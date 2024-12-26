import { Module, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { UploadController } from "./upload.controller";
import { CosService } from "./upload.service";
import { ConfigsModule } from "@/_shared/config/config.module";
import { RawBodyMiddleware } from "./raw-body.middleware";

@Module({
  imports: [ConfigsModule],
  controllers: [UploadController],
  providers: [CosService],
})
export class UploadModule {
  configure(consumer: MiddlewareConsumer) {
    if (process.env.NODE_ENV === "development") {
      consumer.apply(RawBodyMiddleware).forRoutes({
        path: "api/upload/local/*",
        method: RequestMethod.PUT,
      });
    }
  }
}
