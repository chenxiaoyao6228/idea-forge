import { Global, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { AbilityService } from "./casl.service";

@Module({
  imports: [DiscoveryModule],
  providers: [AbilityService],
  exports: [AbilityService],
})
@Global()
export class CaslModule {}
