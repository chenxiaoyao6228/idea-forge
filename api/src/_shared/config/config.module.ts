import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as config from "./configs";
import { validateConfig } from "./config-validation";

const isTest = process.env.NODE_ENV === "test";
/*
  .env.testcontainers.ts is created by test/setup/test-container-setup.ts on the fly,
  and will be deleted after tests are done. so you don't to create it manually.
*/
const envFilePath = isTest
  ? [process.cwd() + "/.env.testcontainers", process.cwd() + "/.env.test"]
  : [process.cwd() + `/../.env.${process.env.NODE_ENV}`, process.cwd() + "/.env"];

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
      isGlobal: true,
      // Load env files from most specific to least specific
      expandVariables: true,
      load: [...Object.values(config)],
      validate: validateConfig,
    }),
  ],
})
export class ConfigsModule {}
