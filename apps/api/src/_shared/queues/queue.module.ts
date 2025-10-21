import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { WebsocketEventProcessor } from "./processors/websocket-event.processor";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get("REDIS_HOST"),
          port: configService.get("REDIS_PORT"),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: "websocket-events" }),
    BullModule.registerQueue({ name: "imports" }),
  ],
  providers: [WebsocketEventProcessor],
  exports: [BullModule],
})
export class QueueModule {}
