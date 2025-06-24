import { BullModule, BullRootModuleOptions } from "@nestjs/bull";
import { Global, Module } from "@nestjs/common";
import { WebsocketEventProcessor } from "./processors/websocket-event.processor";
import { ConfigModule, ConfigService } from "@nestjs/config";

// FIXME: not global ?
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<BullRootModuleOptions> => ({
        redis: {
          host: configService.get("REDIS_HOST"),
          port: configService.get("REDIS_PORT"),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: "websocket-events" }),
  ],
  providers: [
    WebsocketEventProcessor,
    // Other processors...
  ],
  exports: [BullModule],
})
export class QueueModule {}
