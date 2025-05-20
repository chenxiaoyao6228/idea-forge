import { Global, Module } from "@nestjs/common";
import { CustomPrismaModule } from "nestjs-prisma";
import { PRISMA_CLIENT, extendedPrismaClient } from "./prisma.extension";

const providers = [
  {
    provide: PRISMA_CLIENT,
    useFactory: () => {
      return extendedPrismaClient;
    },
  },
];

@Global()
@Module({
  imports: [
    CustomPrismaModule.forRootAsync({
      name: "PrismaService",
      useFactory: () => {
        return extendedPrismaClient;
      },
    }),
  ],
  providers,
  exports: providers,
})
export class PrismaModule {}
