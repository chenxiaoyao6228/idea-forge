import { AsyncLocalStorage } from "node:async_hooks";
import { TFunction } from "i18next";

interface I18nContext {
  t: TFunction;
  locale: string;
}

export class I18nContextManager {
  private static storage = new AsyncLocalStorage<I18nContext>();

  static run<T>(context: I18nContext, fn: () => T): T {
    if (!context.t || typeof context.t !== "function") {
      throw new Error("Invalid translation function in context");
    }

    try {
      return I18nContextManager.storage.run(context, fn);
    } catch (error) {
      console.error("Error in i18n context:", error);
      throw error;
    }
  }

  static getT(): TFunction {
    const context = I18nContextManager.storage.getStore();
    if (!context) {
      throw new Error("No i18n context found. Ensure the code is running within an i18n context");
    }
    return context.t;
  }
}
