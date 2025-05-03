import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { initZodI18n } from "contracts";

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("lng", lng);
  console.log("=====languageChanged =======", lng);
});

const supportedLngs = ["en", "zh"];

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: import.meta.env.MODE !== "production",
    fallbackLng: "en",
    supportedLngs: supportedLngs,
    interpolation: {
      escapeValue: false,
    },
    ns: ["translation"], //Names of the translation files
    backend: {
      loadPath: `${window.location.origin}/locales/{{lng}}.json`, //Path to the translation files
      // TODO: add path to the translation files
      // addPath: `${window.location.origin}/locales/add/{{lng}}`,
    },
    detection: {
      order: ["localStorage"],
      lookupLocalStorage: "lng",
      caches: ["localStorage"],
    },
    saveMissing: true,
    saveMissingTo: "all",
  })
  .then(() => {
    console.log("=====i18n initialized =======");
  });

initZodI18n(i18n);

export const LANGUAGE_NAME_MAP = {
  en: "English",
  zh: "中文",
};

export default i18n;
