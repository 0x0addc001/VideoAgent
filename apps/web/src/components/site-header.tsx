import { ArrowUpRight, Clapperboard } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";

export async function SiteHeader() {
  const t = await getTranslations();

  return (
    <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Link className="group flex items-center gap-3" href="/">
        <span className="grid size-10 place-items-center rounded-2xl bg-[#ff7542] text-[#16130f] shadow-[0_0_35px_rgba(255,117,66,0.26)]">
          <Clapperboard className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <span>
          <span className="block font-display text-xl font-semibold tracking-[-0.02em] text-white">
            {t("brand.name")}
          </span>
        </span>
      </Link>

      <nav className="flex items-center gap-2 sm:gap-4" aria-label="Primary navigation">
        <Link
          className="hidden px-3 py-2 text-[17px] text-white/60 transition hover:text-white sm:block"
          href="/#product"
        >
          {t("nav.product")}
        </Link>
        <Link
          className="hidden px-3 py-2 text-[17px] text-white/60 transition hover:text-white sm:block"
          href="/#workflow"
        >
          {t("nav.workflow")}
        </Link>
        <details className="group relative hidden sm:block">
          <summary className="cursor-pointer list-none px-3 py-2 text-[17px] text-white/60 transition hover:text-white [&::-webkit-details-marker]:hidden">
            {t("nav.docs")}
          </summary>
          <div className="absolute left-1/2 top-[calc(100%+10px)] grid w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#17140f] p-1.5 shadow-2xl shadow-black/40">
            {[
              ["software-design.html", t("documents.design")],
              ["software-implementation.html", t("documents.implementation")],
              ["software-test-plan.html", t("documents.testing")],
            ].map(([path, label]) => (
              <a
                className="rounded-xl px-3 py-2.5 text-[17px] text-white/60 transition hover:bg-white/6 hover:text-white"
                href={`https://0x0addc001.github.io/VideoAgent/docs/${path}`}
                key={path}
                rel="noreferrer"
                target="_blank"
              >
                {label}
              </a>
            ))}
          </div>
        </details>
        <LocaleSwitcher />
        <Link
          className="group flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[17px] font-semibold text-[#16130f] transition hover:bg-[#ffd6c5]"
          href="/register"
        >
          {t("nav.start")}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </nav>
    </header>
  );
}

