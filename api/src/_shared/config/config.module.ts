import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as config from "./configs";
import { validateConfig } from "./config-validation";

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`${process.cwd()}/../.env`, `${process.cwd()}/../.env.${process.env.NODE_ENV}`],
      isGlobal: true,
      // Load env files from most specific to least specific
      expandVariables: true,
      load: [...Object.values(config)],
      validate: validateConfig,
    }),
  ],
})
export class ConfigsModule {}
