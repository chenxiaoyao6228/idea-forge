import dayjs from "dayjs";
import {
  format,
  formatDistanceToNow,
  formatDistanceToNowStrict,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
  parseISO,
  isValid,
} from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { enUS, zhCN } from "date-fns/locale";

// Types
export interface TimeFormatOptions {
  locale?: "en" | "zh";
  timezone?: string;
  dateFormat?: string;
  timeFormat?: "12h" | "24h";
  includeTime?: boolean;
  relative?: boolean;
  strict?: boolean;
}

export interface WorkspaceTimeSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  locale: "en" | "zh";
}

export interface LocaleConfig {
  locale: "en" | "zh";
  dateFnsLocale: any;
  dayjsLocale: string;
  defaultDateFormat: string;
  defaultTimeFormat: "12h" | "24h";
}

// Locale configurations
const LOCALE_CONFIGS: Record<string, LocaleConfig> = {
  en: {
    locale: "en",
    dateFnsLocale: enUS,
    dayjsLocale: "en",
    defaultDateFormat: "MM/dd/yyyy",
    defaultTimeFormat: "12h",
  },
  zh: {
    locale: "zh",
    dateFnsLocale: zhCN,
    dayjsLocale: "zh-cn",
    defaultDateFormat: "yyyy/MM/dd",
    defaultTimeFormat: "24h",
  },
};

// Default settings
const DEFAULT_TIMEZONE = "UTC";
const DEFAULT_LOCALE = "en";

// Helper function to get current locale from i18next
function getCurrentLocale(): "en" | "zh" {
  if (typeof window !== "undefined" && (window as any).i18next) {
    const currentLang = (window as any).i18next.language || (window as any).i18next.language?.split("-")[0];
    return currentLang === "zh" ? "zh" : "en";
  }
  return DEFAULT_LOCALE;
}

// Helper function to get workspace settings
function getWorkspaceSettings(): Partial<WorkspaceTimeSettings> {
  try {
    // Import workspace store dynamically to avoid circular dependencies
    if (typeof window !== "undefined") {
      // Access the workspace store from the global state
      const workspaceStore = (window as any).__WORKSPACE_STORE__;
      if (workspaceStore?.currentWorkspace?.settings) {
        const settings = workspaceStore.currentWorkspace.settings;
        return {
          timezone: settings.timezone || DEFAULT_TIMEZONE,
          dateFormat: settings.dateFormat || LOCALE_CONFIGS[getCurrentLocale()].defaultDateFormat,
          timeFormat: LOCALE_CONFIGS[getCurrentLocale()].defaultTimeFormat,
          locale: getCurrentLocale(),
        };
      }
    }
  } catch (error) {
    console.warn("Failed to get workspace settings:", error);
  }

  // Fallback to defaults
  const locale = getCurrentLocale();
  return {
    timezone: DEFAULT_TIMEZONE,
    dateFormat: LOCALE_CONFIGS[locale].defaultDateFormat,
    timeFormat: LOCALE_CONFIGS[locale].defaultTimeFormat,
    locale,
  };
}

// Helper function to parse date input
function parseDateInput(date: string | Date | number): Date {
  if (date instanceof Date) {
    return date;
  }

  if (typeof date === "number") {
    return new Date(date);
  }

  // Try parsing with date-fns first
  const parsed = parseISO(date);
  if (isValid(parsed)) {
    return parsed;
  }

  // Fallback to native Date parsing
  const fallback = new Date(date);
  if (isValid(fallback)) {
    return fallback;
  }

  throw new Error(`Invalid date input: ${date}`);
}

// Core formatting functions
export function formatDate(date: string | Date | number, options: TimeFormatOptions = {}): string {
  try {
    const parsedDate = parseDateInput(date);
    const locale = options.locale || getCurrentLocale();
    const timezone = options.timezone || getWorkspaceSettings().timezone || DEFAULT_TIMEZONE;
    const dateFormat = options.dateFormat || getWorkspaceSettings().dateFormat || LOCALE_CONFIGS[locale].defaultDateFormat;

    // Use date-fns for timezone-aware formatting
    return formatInTimeZone(parsedDate, timezone, dateFormat, {
      locale: LOCALE_CONFIGS[locale].dateFnsLocale,
    });
  } catch (error) {
    console.warn("Date formatting error:", error);
    return "Invalid Date";
  }
}

export function formatTime(date: string | Date | number, options: TimeFormatOptions = {}): string {
  try {
    const parsedDate = parseDateInput(date);
    const locale = options.locale || getCurrentLocale();
    const timezone = options.timezone || getWorkspaceSettings().timezone || DEFAULT_TIMEZONE;
    const timeFormat = options.timeFormat || getWorkspaceSettings().timeFormat || LOCALE_CONFIGS[locale].defaultTimeFormat;

    const timePattern = timeFormat === "12h" ? "h:mm a" : "HH:mm";

    return formatInTimeZone(parsedDate, timezone, timePattern, {
      locale: LOCALE_CONFIGS[locale].dateFnsLocale,
    });
  } catch (error) {
    console.warn("Time formatting error:", error);
    return "Invalid Time";
  }
}

export function formatDateTime(date: string | Date | number, options: TimeFormatOptions = {}): string {
  try {
    const parsedDate = parseDateInput(date);
    const locale = options.locale || getCurrentLocale();
    const timezone = options.timezone || getWorkspaceSettings().timezone || DEFAULT_TIMEZONE;
    const dateFormat = options.dateFormat || getWorkspaceSettings().dateFormat || LOCALE_CONFIGS[locale].defaultDateFormat;
    const timeFormat = options.timeFormat || getWorkspaceSettings().timeFormat || LOCALE_CONFIGS[locale].defaultTimeFormat;

    const timePattern = timeFormat === "12h" ? "h:mm a" : "HH:mm";
    const dateTimePattern = `${dateFormat} ${timePattern}`;

    return formatInTimeZone(parsedDate, timezone, dateTimePattern, {
      locale: LOCALE_CONFIGS[locale].dateFnsLocale,
    });
  } catch (error) {
    console.warn("DateTime formatting error:", error);
    return "Invalid DateTime";
  }
}

// Relative time formatting (will be enhanced with i18n in next phase)
export function formatRelative(date: string | Date | number, options: TimeFormatOptions = {}): string {
  try {
    const parsedDate = parseDateInput(date);
    const locale = options.locale || getCurrentLocale();
    const strict = options.strict ?? false;

    // Use date-fns for relative formatting
    const formatFn = strict ? formatDistanceToNowStrict : formatDistanceToNow;

    return formatFn(parsedDate, {
      addSuffix: true,
      locale: LOCALE_CONFIGS[locale].dateFnsLocale,
    });
  } catch (error) {
    console.warn("Relative time formatting error:", error);
    return "Invalid Date";
  }
}

// Smart relative time with i18next integration
export function formatSmartRelative(date: string | Date | number, options: TimeFormatOptions & { t?: (key: string, options?: any) => string } = {}): string {
  try {
    const parsedDate = parseDateInput(date);
    const now = new Date();
    const locale = options.locale || getCurrentLocale();
    const t = options.t || getTranslationFunction();

    // Calculate differences
    const diffMinutes = differenceInMinutes(now, parsedDate);
    const diffHours = differenceInHours(now, parsedDate);
    const diffDays = differenceInDays(now, parsedDate);
    const diffWeeks = differenceInWeeks(now, parsedDate);
    const diffMonths = differenceInMonths(now, parsedDate);
    const diffYears = differenceInYears(now, parsedDate);

    // Smart relative formatting logic with i18next
    if (diffMinutes < 1) {
      return t("time.justNow");
    }
    if (diffMinutes < 60) {
      return t("time.minutesAgo", { minutes: diffMinutes });
    }
    if (diffHours < 24) {
      return t("time.hoursAgo", { hours: diffHours });
    }
    if (isToday(parsedDate)) {
      return t("time.today");
    }
    if (isYesterday(parsedDate)) {
      return t("time.yesterday");
    }
    if (diffDays < 7) {
      return t("time.daysAgo", { days: diffDays });
    }
    if (diffWeeks < 4) {
      return t("time.weeksAgo", { weeks: diffWeeks });
    }
    if (diffMonths < 12) {
      return t("time.monthsAgo", { months: diffMonths });
    }
    return t("time.yearsAgo", { years: diffYears });
  } catch (error) {
    console.warn("Smart relative time formatting error:", error);
    return "Invalid Date";
  }
}

// Helper function to get translation function
function getTranslationFunction(): (key: string, options?: any) => string {
  if (typeof window !== "undefined" && (window as any).i18next) {
    return (window as any).i18next.t.bind((window as any).i18next);
  }

  // Fallback function
  return (key: string, options?: any) => {
    const locale = getCurrentLocale();
    const translations: Record<string, Record<string, string>> = {
      en: {
        "time.today": "Today",
        "time.yesterday": "Yesterday",
        "time.justNow": "Just now",
        "time.minutesAgo": `${options?.minutes || 0} minutes ago`,
        "time.hoursAgo": `${options?.hours || 0} hours ago`,
        "time.daysAgo": `${options?.days || 0} days ago`,
        "time.weeksAgo": `${options?.weeks || 0} weeks ago`,
        "time.monthsAgo": `${options?.months || 0} months ago`,
        "time.yearsAgo": `${options?.years || 0} years ago`,
      },
      zh: {
        "time.today": "今天",
        "time.yesterday": "昨天",
        "time.justNow": "刚刚",
        "time.minutesAgo": `${options?.minutes || 0}分钟前`,
        "time.hoursAgo": `${options?.hours || 0}小时前`,
        "time.daysAgo": `${options?.days || 0}天前`,
        "time.weeksAgo": `${options?.weeks || 0}周前`,
        "time.monthsAgo": `${options?.months || 0}个月前`,
        "time.yearsAgo": `${options?.years || 0}年前`,
      },
    };

    return translations[locale]?.[key] || key;
  };
}

// Date comparison helpers
export function isTodayDate(date: string | Date | number): boolean {
  try {
    const parsedDate = parseDateInput(date);
    return isToday(parsedDate);
  } catch {
    return false;
  }
}

export function isYesterdayDate(date: string | Date | number): boolean {
  try {
    const parsedDate = parseDateInput(date);
    return isYesterday(parsedDate);
  } catch {
    return false;
  }
}

export function isThisWeekDate(date: string | Date | number): boolean {
  try {
    const parsedDate = parseDateInput(date);
    return isThisWeek(parsedDate);
  } catch {
    return false;
  }
}

export function isThisYearDate(date: string | Date | number): boolean {
  try {
    const parsedDate = parseDateInput(date);
    return isThisYear(parsedDate);
  } catch {
    return false;
  }
}

// Timezone utilities
export function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const zoned = toZonedTime(now, timezone);
    const utc = fromZonedTime(now, timezone);
    return (utc.getTime() - zoned.getTime()) / (1000 * 60);
  } catch (error) {
    console.warn("Timezone offset calculation error:", error);
    return 0;
  }
}

// Parse date with format detection
export function parseDate(dateString: string, format?: string): Date {
  try {
    if (format) {
      // Use dayjs for format-specific parsing
      const parsed = dayjs(dateString, format);
      if (parsed.isValid()) {
        return parsed.toDate();
      }
    }

    // Fallback to general parsing
    return parseDateInput(dateString);
  } catch (error) {
    console.warn("Date parsing error:", error);
    throw new Error(`Failed to parse date: ${dateString}`);
  }
}

// Utility to get available timezones (commonly used ones)
export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

// Utility to get available date formats
export const COMMON_DATE_FORMATS = [
  { value: "yyyy/MM/dd", label: "2025/01/15", description: "Year/Month/Day" },
  { value: "MM/dd/yyyy", label: "01/15/2025", description: "Month/Day/Year (US)" },
  { value: "dd/MM/yyyy", label: "15/01/2025", description: "Day/Month/Year (EU)" },
  { value: "yyyy-MM-dd", label: "2025-01-15", description: "ISO format" },
  { value: "dd-MM-yyyy", label: "15-01-2025", description: "Day-Month-Year" },
  { value: "MM-dd-yyyy", label: "01-15-2025", description: "Month-Day-Year" },
];

// React hook for easy integration with components
export function useTimeFormat() {
  // This will be properly implemented when we integrate with React components
  // For now, return the utility functions with current locale and workspace settings
  const locale = getCurrentLocale();
  const workspaceSettings = getWorkspaceSettings();

  return {
    formatDate: (date: string | Date | number, options?: TimeFormatOptions) => formatDate(date, { ...options, locale, ...workspaceSettings }),
    formatTime: (date: string | Date | number, options?: TimeFormatOptions) => formatTime(date, { ...options, locale, ...workspaceSettings }),
    formatDateTime: (date: string | Date | number, options?: TimeFormatOptions) => formatDateTime(date, { ...options, locale, ...workspaceSettings }),
    formatRelative: (date: string | Date | number, options?: TimeFormatOptions) => formatRelative(date, { ...options, locale, ...workspaceSettings }),
    formatSmartRelative: (date: string | Date | number, options?: TimeFormatOptions) => formatSmartRelative(date, { ...options, locale, ...workspaceSettings }),
    isTodayDate,
    isYesterdayDate,
    isThisWeekDate,
    isThisYearDate,
    getTimezoneOffset,
    parseDate,
    COMMON_TIMEZONES,
    COMMON_DATE_FORMATS,
    LOCALE_CONFIGS,
    workspaceSettings,
  };
}

// Main export for easy access
export default {
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
  useTimeFormat,
  COMMON_TIMEZONES,
  COMMON_DATE_FORMATS,
  LOCALE_CONFIGS,
};
