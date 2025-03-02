import { Injectable } from "@nestjs/common";
import i18next from "i18next";
import { z } from "zod";
import { zodI18nMap } from "zod-i18n-map";
import Backend from "i18next-fs-backend";
import { join } from "node:path";

@Injectable()
export class I18nNextService {
  localesPath: string;
  constructor() {
    this.initializeI18n();
    this.localesPath = join(__dirname, "locales");
  }

  private async initializeI18n() {
    const localesPath =
      process.env.NODE_ENV === "production"
        ? join(__dirname, "locales") // production
        : join(__dirname, "../locales"); // development

    console.log("localesPath=====", localesPath);

    const loadPath = join(localesPath, "{{lng}}.json");

    console.log("loadPath=====", loadPath);

    await i18next.use(Backend).init({
      fallbackLng: "en",
      supportedLngs: ["en", "zh"],
      // resources: {
      //   en: {
      //     translation: require(join(localesPath, "en.json")),
      //   },
      //   zh: {
      //     translation: require(join(localesPath, "zh.json")),
      //   },
      // },
      backend: {
        loadPath: loadPath,
      },
      ns: ["common", "validation"],
      defaultNS: "common",
    });

    // 配置 zod 的 i18n
    z.setErrorMap(zodI18nMap);
  }

  async testTranslate() {
    console.log("--------------------------------");
    console.log("localesPath=====", this.localesPath);
    const text = await this.translate("helloworld", { name: "Toon" });
    console.log("--------------------------------");
    return text;
  }

  translate(key: string, options?: any): string {
    return i18next.t(key, options) as string;
  }

  async changeLanguage(lang: string): Promise<void> {
    await i18next.changeLanguage(lang);
  }

  getCurrentLanguage(): string {
    return i18next.language;
  }
}
