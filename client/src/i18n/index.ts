import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enUS from "./locales/en-US.json";
import zhCN from "./locales/zh-CN.json";

// 语言枚举
export enum Language {
  enUS = "en-US", // 英语
  zhCN = "zh-CN", // Chinese
  //   deDE = "de-DE", //
  //   svSE = "sv-SE", // 瑞典语
  //   nbNO = "nb-NO", // 挪威语
  //   fiFI = "fi-FI", // 芬兰语
}

// 语言列表，使用语言枚举
export const LanguageList: { key: Language; label: string }[] = [
  { key: Language.enUS, label: "English" },
  { key: Language.zhCN, label: "Chinese" },
  //   { key: Language.deDE, label: "Deutsch" },
  //   { key: Language.svSE, label: "Svenska" },
  //   { key: Language.nbNO, label: "Norsk" },
  //   { key: Language.fiFI, label: "Suomen" },
];

const userInfo = localStorage.getItem("user-info");
const getPersistedLanguage = () => {
  if (!userInfo) {
    return Language.enUS;
  }

  try {
    const parsedUserInfo = JSON.parse(userInfo);
    const userPreferences = parsedUserInfo.state?.userPreferences;
    return userPreferences?.language || Language.enUS;
  } catch (error) {
    console.error("Error parsing user info:", error);
    return Language.enUS;
  }
};

const persistedLanguage = getPersistedLanguage();

const resources = {
  [Language.enUS]: {
    translation: enUS,
  },
  [Language.zhCN]: {
    translation: zhCN,
  },
};

const options = {
  resources,
  lng: persistedLanguage,
  fallbackLng: Language.enUS,
  interpolation: {
    escapeValue: false,
  },
};

const i18nIns = i18n.createInstance();

i18nIns.use(initReactI18next).init(options);

export default i18nIns;
