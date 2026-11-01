import {
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  Clapperboard,
  Layers3,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const features = [
    {
      icon: BrainCircuit,
      number: "01",
      title: t("features.agent.title"),
      body: t("features.agent.body"),
    },
    {
      icon: Clapperboard,
      number: "02",
      title: t("features.storyboard.title"),
      body: t("features.storyboard.body"),
    },
    {
      icon: Layers3,
      number: "03",
      title: t("features.providers.title"),
      body: t("features.providers.body"),
    },
  ];
  const steps = [
    t("workflow.brief"),
    t("workflow.plan"),
    t("workflow.generate"),
    t("workflow.assemble"),
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0a08] text-[#f7f0e6]">
      <div className="film-grain pointer-events-none absolute inset-0 z-0 opacity-25" />
      <div className="hero-orbit pointer-events-none absolute right-[-30rem] top-[-48rem] z-0 h-[80rem] w-[80rem] rounded-full opacity-65" />
      <SiteHeader />

      <section className="relative z-10 mx-auto grid min-h-[720px] max-w-[1240px] items-center gap-16 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-[1fr_0.95fr] lg:pt-10">
        <div className="animate-reveal">
          <p className="m-0 text-[17px] font-semibold tracking-[0.14em] text-[#ff8a5c]">
            {t("hero.eyebrow")}
          </p>
          <h1 className="mt-7 max-w-3xl text-balance text-[clamp(4.5rem,8vw,8rem)] leading-[0.88] tracking-[-0.065em] text-[#fff8ee]">
            {t("hero.title")}
          </h1>
          <p className="mt-8 max-w-xl text-[clamp(1.15rem,1.8vw,1.5rem)] leading-[1.6] text-white/55">
            {t("hero.subtitle")}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-[54px] items-center gap-3 rounded-full bg-[#ff7643] px-6 text-[17px] font-semibold text-[#18140f] shadow-[0_16px_42px_rgba(255,118,67,0.16)] transition hover:-translate-y-0.5 hover:bg-[#ff8b5e]"
              href="/register"
            >
              {t("nav.start")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex min-h-[54px] items-center gap-3 rounded-full border border-white/12 px-5 text-[17px] text-white/65 transition hover:border-white/25 hover:text-white"
              href="/#workflow"
            >
              {t("nav.workflow")}
              <ArrowDown className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative min-h-[570px] px-1 py-8 pl-10 sm:pl-14">
          <div className="absolute inset-8 rounded-full bg-[#ff7643]/12 blur-[90px]" />
          <div className="absolute left-0 top-20 h-[330px] w-[44%] -rotate-[9deg] rounded-[28px] border border-white/12 bg-[radial-gradient(circle_at_60%_30%,rgba(255,164,108,0.45),transparent_24%),linear-gradient(150deg,#392117,#122119)] shadow-2xl shadow-black/30" />
          <div className="absolute right-0 top-4 h-[310px] w-[44%] rotate-[8deg] rounded-[28px] border border-white/12 bg-[radial-gradient(circle_at_35%_70%,rgba(106,146,122,0.35),transparent_31%),linear-gradient(145deg,#21160f,#20332a)] shadow-2xl shadow-black/30" />
          <div className="relative ml-auto mt-8 w-[calc(100%-16px)] rotate-[1.2deg] overflow-hidden rounded-[34px] border border-white/12 bg-[#12100d] shadow-[0_50px_110px_rgba(0,0,0,0.45)]">
            <video
              aria-label={t("hero.sceneLabel")}
              autoPlay
              className="aspect-[3/4] w-full object-cover"
              loop
              muted
              playsInline
              poster="/media/vlog-hero-poster.jpg"
              preload="metadata"
            >
              <source src="/media/vlog-hero.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1240px] border-t border-white/10 px-5 py-28 sm:px-8">
        <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="m-0 text-[17px] font-semibold tracking-[0.14em] text-[#ff8a5c]">
              {t("nav.product")}
            </p>
            <h2 className="mt-5 max-w-xl text-balance text-[clamp(3rem,4.5vw,4.6rem)] leading-[1] tracking-[-0.045em]">
              {t("features.title")}
            </h2>
          </div>
          <div className="grid border-t border-white/10 sm:grid-cols-3">
            {features.map(({ icon: Icon, number, title, body }) => (
              <article
                className="min-h-[350px] border-b border-white/10 py-7 sm:border-b-0 sm:border-r sm:px-7 sm:last:border-r-0 sm:first:pl-0"
                key={number}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[17px] text-[#ff8a5c]">{number}</span>
                  <Icon className="h-5 w-5 text-white/40" />
                </div>
                <h3 className="mt-28 max-w-xs font-display text-[clamp(1.8rem,2.5vw,2.5rem)] leading-[1.08] tracking-[-0.035em]">
                  {title}
                </h3>
                <p className="mt-4 text-[17px] leading-7 text-white/45">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="relative z-10 mx-auto max-w-[1240px] px-5 pb-28 sm:px-8"
        id="workflow"
      >
        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#12100d] text-[#f7f0e6]">
          <div className="flex flex-col justify-between gap-7 border-b border-white/10 p-8 sm:p-12 lg:flex-row lg:items-end">
            <div>
              <p className="m-0 text-[17px] font-semibold tracking-[0.12em] text-[#a94523]">
                {t("nav.workflow")}
              </p>
              <h2 className="mt-4 max-w-2xl text-balance font-display text-[clamp(2.8rem,4.6vw,4.5rem)] leading-[1] tracking-[-0.045em]">
                {t("workflow.title")}
              </h2>
            </div>
            <Link
              className="inline-flex w-fit items-center gap-3 rounded-full bg-[#f7f0e6] px-5 py-3.5 text-[17px] font-semibold text-[#18140f]"
              href="/register"
            >
              {t("nav.start")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div
                className="min-h-56 border-b border-white/10 p-7 last:border-b-0 sm:border-r sm:last:border-r-0 sm:p-8 lg:border-b-0"
                key={step}
              >
                <span className="text-[17px] font-semibold text-[#a94523]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="mt-20 max-w-40 font-display text-[clamp(1.35rem,2vw,1.8rem)] leading-[1.15]">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 py-9 sm:px-8 md:flex-row md:items-center md:justify-between">
          <span className="flex items-center gap-3 text-[17px] font-semibold">
            <span className="grid size-10 place-items-center rounded-[13px] bg-[#ff7643] text-[#18140f]">
              <Clapperboard className="h-4 w-4" />
            </span>
            {t("brand.name")}
          </span>
          <a
            className="text-[17px] text-white/35 transition hover:text-white"
            href="https://github.com/0x0addc001/VideoAgent"
          >
            GitHub ↗
          </a>
        </div>
      </footer>
    </main>
  );
}
