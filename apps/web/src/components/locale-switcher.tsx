"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import { localeLabels, supportedLocales, type AppLocale } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="relative inline-flex items-center gap-2">
      <Languages aria-hidden="true" className="h-4 w-4 text-white/55" />
      <span className="sr-only">Language</span>
      <select
        aria-label="Language"
        className={cn(
          "cursor-pointer appearance-none rounded-full border border-white/10 bg-white/5 py-2 pl-3 pr-8 text-sm text-white outline-none transition",
          "hover:border-white/20 focus:border-[#ff7a45] focus:ring-2 focus:ring-[#ff7a45]/25",
          isPending && "opacity-60",
        )}
        defaultValue={locale}
        onChange={(event) => {
          const nextLocale = event.target.value as AppLocale;
          startTransition(() => {
            router.replace(pathname, { locale: nextLocale });
          });
        }}
      >
        {supportedLocales.map((item) => (
          <option className="bg-[#16130f] text-white" key={item} value={item}>
            {localeLabels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}

