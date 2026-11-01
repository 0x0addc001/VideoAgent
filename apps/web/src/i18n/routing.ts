import { defineRouting } from "next-intl/routing";
import { supportedLocales } from "@/i18n/config";

export const routing = defineRouting({
  locales: supportedLocales,
  defaultLocale: "en",
  localePrefix: "always",
});

