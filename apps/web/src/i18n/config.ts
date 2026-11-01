export const supportedLocales = ["en", "zh-CN"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const localeLabels: Record<AppLocale, string> = {
  en: "English",
  "zh-CN": "简体中文",
};

export function isAppLocale(value: string): value is AppLocale {
  return supportedLocales.includes(value as AppLocale);
}

