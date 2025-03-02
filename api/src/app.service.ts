import { Inject, Injectable } from "@nestjs/common";
import { I18nContext, I18nService } from "nestjs-i18n";
import { I18nTranslations } from "./_generated/i18n.generated";

@Injectable()
export class AppService {
  @Inject()
  i18n: I18nService<I18nTranslations>;

  getHello(): string {
    // return this.i18n.t("translation.test", { args: { name: "John" } });
    return "yyy";
  }
}
