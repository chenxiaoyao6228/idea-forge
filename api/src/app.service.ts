import { Injectable } from "@nestjs/common";
import { I18nContextManager } from "./_shared/i18next/i18n.context";

@Injectable()
export class AppService {
  getHello(): string {
    return "yyy";
  }

  testI18n(): string {
    console.log("testI18n");
    const t = I18nContextManager.getT();
    return t("helloworld", { name: "John" });
  }
}
