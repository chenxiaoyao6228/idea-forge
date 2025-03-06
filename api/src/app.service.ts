import { Inject, Injectable } from "@nestjs/common";
import { I18nContext, I18nService } from "nestjs-i18n";
import { I18nTranslations } from "./_generated/i18n.generated";
import { I18nContextManager } from "./_shared/i18next/i18n.context";

@Injectable()
export class AppService {
  @Inject()
  i18n: I18nService<I18nTranslations>;

  getHello(): string {
    return "yyy";
  }

  testI18n(): string {
    console.log("testI18n");
    const t = I18nContextManager.getT();
    return t("helloworld", { name: "John" });
  }
}
