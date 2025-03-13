import { Injectable } from "@nestjs/common";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import { join } from "node:path";
// import { initZodI18n } from "shared";
import i18nextHttpMiddleware from "i18next-http-middleware";

@Injectable()
export class I18nNextService {
  public readonly i18next = i18next;
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
    const loadPath = join(localesPath, "{{lng}}.json");

    console.log("loadPath=====", loadPath);

    await i18next
      .use(Backend)
      .use(i18nextHttpMiddleware.LanguageDetector)
      .init({
        fallbackLng: "en",
        supportedLngs: ["en", "zh"],
        // language detection options
        detection: {
          // sort by priority
          order: ["querystring", "header"],
          // header detection config
          lookupHeader: "accept-language",
          // query string config
          lookupQuerystring: "lang",
          // cache options
          caches: false,
          // fallback language when language is not supported
          fallbackLng: "en",
        },
        backend: {
          loadPath: loadPath,
          watch: true,
        },
        ns: ["common", "validation"],
        defaultNS: "common",
        preload: ["en", "zh"],
      });

    // initZodI18n(i18next);
  }

  getI18n() {
    return this.i18next;
  }

  translate(key: string, options?: any): string {
    return i18next.t(key, options) as string;
  }
}
