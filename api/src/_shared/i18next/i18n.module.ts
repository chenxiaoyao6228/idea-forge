import { Module, Global } from "@nestjs/common";
import { I18nNextService } from "./i18n.service";

@Global()
@Module({
  providers: [I18nNextService],
  exports: [I18nNextService],
})
export class I18nNextModule {}
