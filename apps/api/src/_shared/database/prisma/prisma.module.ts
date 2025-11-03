import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { extendedPrismaClient, ExtendedPrismaClient } from "./prisma.extension";
import { ConfigService } from "@nestjs/config";
import { ConfigsModule } from "@/_shared/config/config.module";

@Global()
@Module({
  imports: [ConfigsModule],
  providers: [
    {
      provide: PrismaService,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const prismaService = new PrismaService(configService);
        return extendedPrismaClient(prismaService) as PrismaService & ExtendedPrismaClient;
      },
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
