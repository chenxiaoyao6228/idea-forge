import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as config from "./configs";
import { validateConfig } from "./config-validation";

const isTest = process.env.NODE_ENV === "test";
/*
  .env.testcontainers.ts is created by test/setup/test-container-setup.ts on the fly,
  and will be deleted after tests are done. so you don't to create it manually.

  # Priority Order (Highest to Lowest)
  NestJS `ConfigModule` uses `dotenv` under the hood, `dotenv` has `override: false` by default
  If a variable already exists in `process.env` (from Docker `-e`), it will **NOT** be overridden by the `.env` file

  ```
    1. Docker environment variables (-e flags from docker-compose)  [HIGHEST]
      ↓
    2. .env file (created at container startup from .env.example)
      ↓
    3. .env.example defaults (baked into Docker image)             [LOWEST]
  ```
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
