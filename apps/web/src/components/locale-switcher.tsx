"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { localeLabels, supportedLocales, type AppLocale } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function chooseLocale(nextLocale: AppLocale) {
    setIsOpen(false);
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={locale === "zh-CN" ? "切换语言" : "Change language"}
        className={cn(
          "grid size-11 place-items-center rounded-none border-0 bg-transparent text-white/75 transition",
          "hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7643]/40",
          isPending && "opacity-55",
        )}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Languages className="h-5 w-5" />
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+10px)] w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#17140f] p-1.5 shadow-2xl shadow-black/40"
          role="menu"
        >
          {supportedLocales.map((item) => (
            <button
              aria-current={item === locale ? "true" : undefined}
              className={cn(
                "block w-full rounded-xl px-3 py-2.5 text-left text-[17px] text-white/65 transition hover:bg-white/6 hover:text-white",
                item === locale && "bg-white/6 text-white",
              )}
              key={item}
              onClick={() => chooseLocale(item)}
              role="menuitem"
              type="button"
            >
              {localeLabels[item]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
