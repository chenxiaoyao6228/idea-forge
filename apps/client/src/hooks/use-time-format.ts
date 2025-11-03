import { useTranslation } from "react-i18next";
import useWorkspaceStore from "@/stores/workspace-store";
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelative,
  formatSmartRelative,
  isTodayDate,
  isYesterdayDate,
  isThisWeekDate,
  isThisYearDate,
  getTimezoneOffset,
  parseDate,
  COMMON_TIMEZONES,
  COMMON_DATE_FORMATS,
  type TimeFormatOptions,
} from "@/lib/time-format";

/**
 * React hook for time formatting with workspace settings integration
 * Automatically uses current workspace timezone and date format preferences
 */
export function useTimeFormat() {
  const { t, i18n } = useTranslation();
  const { currentWorkspace } = useWorkspaceStore();

  // Get current locale from i18next
  const currentLocale = i18n.language?.split("-")[0] === "zh" ? "zh" : "en";

  // Get workspace settings with fallbacks
  const workspaceSettings = currentWorkspace?.settings;
  const timezone = workspaceSettings?.timezone || "UTC";
  const dateFormat = workspaceSettings?.dateFormat || (currentLocale === "zh" ? "yyyy/MM/dd" : "MM/dd/yyyy");
  const timeFormat = currentLocale === "zh" ? "24h" : "12h";

  // Create options object with workspace settings
  const defaultOptions: TimeFormatOptions = {
    locale: currentLocale,
    timezone,
    dateFormat,
    timeFormat,
  };

  return {
    // Formatting functions with workspace settings
    formatDate: (date: string | Date | number, options?: TimeFormatOptions) => formatDate(date, { ...defaultOptions, ...options }),

    formatTime: (date: string | Date | number, options?: TimeFormatOptions) => formatTime(date, { ...defaultOptions, ...options }),

    formatDateTime: (date: string | Date | number, options?: TimeFormatOptions) => formatDateTime(date, { ...defaultOptions, ...options }),

    formatRelative: (date: string | Date | number, options?: TimeFormatOptions) => formatRelative(date, { ...defaultOptions, ...options }),

    formatSmartRelative: (date: string | Date | number, options?: TimeFormatOptions) => formatSmartRelative(date, { ...defaultOptions, ...options, t }),

    // Date comparison helpers
    isTodayDate,
    isYesterdayDate,
    isThisWeekDate,
    isThisYearDate,

    // Utility functions
    getTimezoneOffset,
    parseDate,

    // Constants and configurations
    COMMON_TIMEZONES,
    COMMON_DATE_FORMATS,

    // Current settings
    currentLocale,
    timezone,
    dateFormat,
    timeFormat,
    workspaceSettings,
  };
}

export default useTimeFormat;
