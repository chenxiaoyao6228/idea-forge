// For more, see:  https://github.com/aiji42/zod-i18n

import { z } from "zod";
import { makeZodI18nMap } from "zod-i18n-map";

// Import your language translation files
import enTranslation from "zod-i18n-map/locales/en/zod.json";
import zhTranslation from "zod-i18n-map/locales/zh-CN/zod.json";

// cusom zod error map
import enCustomTranslation from "../locales/en.json";
import zhCustomTranslation from "../locales/zh.json";

export function initZodI18n(i18n: any) {
  i18n.init({
    partialBundledLanguages: true, // important
    resources: {
      en: { zod: enTranslation, custom: enCustomTranslation },
      zh: { zod: zhTranslation, custom: zhCustomTranslation },
    },
  });
  z.setErrorMap(makeZodI18nMap({ ns: ["zod", "custom"] }));
}

// export configured zod instance
export { z };
