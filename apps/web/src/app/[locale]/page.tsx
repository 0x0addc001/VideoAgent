import {
  ArrowDownRight,
  ArrowRight,
  BrainCircuit,
  Clapperboard,
  Film,
  Layers3,
  Play,
  Scissors,
  Sparkles,
  WandSparkles,
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
  const headlineSize =
    locale === "zh-CN"
      ? "text-[clamp(2.45rem,4.7vw,5rem)]"
      : "text-[clamp(2.9rem,5.8vw,6.5rem)]";
  const features = [
    {
      icon: BrainCircuit,
      number: "01",
      title: t("features.agent.title"),
      body: t("features.agent.body"),
      wide: true,
    },
    {
      icon: Clapperboard,
      number: "02",
      title: t("features.storyboard.title"),
      body: t("features.storyboard.body"),
      wide: false,
    },
    {
      icon: Layers3,
      number: "03",
      title: t("features.providers.title"),
      body: t("features.providers.body"),
      wide: false,
    },
  ];
  const steps = [
    { label: t("workflow.brief"), icon: Sparkles },
    { label: t("workflow.plan"), icon: Clapperboard },
    { label: t("workflow.generate"), icon: Play },
    { label: t("workflow.assemble"), icon: Scissors },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0a08]">
      <div className="film-grain pointer-events-none absolute inset-0 z-0 opacity-35" />
      <div className="hero-orbit pointer-events-none absolute left-[62%] top-[-42rem] z-0 h-[86rem] w-[86rem] -translate-x-1/2 rounded-full opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <SiteHeader />

      <section className="relative z-10 mx-auto grid min-h-[760px] max-w-[92rem] gap-12 px-5 pb-24 pt-10 sm:px-8 lg:grid-cols-[0.94fr_1.06fr] lg:items-center lg:pt-8">
        <div className="animate-reveal relative lg:pl-8">
          <div className="absolute -left-2 top-3 hidden h-[80%] flex-col justify-between border-l border-white/10 pl-4 text-[9px] tracking-[0.24em] text-white/25 lg:flex">
            <span>01</span>
            <span className="[writing-mode:vertical-rl]">DIRECT / GENERATE / EDIT</span>
            <span>03</span>
          </div>

          <div className="mb-7 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#ff7542]/25 bg-[#ff7542]/8 px-3 py-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#ffae8d]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#ff7542] opacity-40" />
                <span className="relative inline-flex size-2 rounded-full bg-[#ff7542]" />
              </span>
              {t("hero.eyebrow")}
            </span>
            <span className="text-[9px] uppercase tracking-[0.24em] text-white/25">
              {t("hero.sequenceLabel")}
            </span>
          </div>

          <h1
            className={`max-w-[48rem] font-medium leading-[0.94] tracking-[-0.06em] text-[#fbf5ea] ${headlineSize}`}
          >
            <span className="block">{t("hero.titleLine1")}</span>
            <span className="mt-2 block bg-gradient-to-r from-[#fbf5ea] via-[#f9e5d4] to-[#e9a17e] bg-clip-text text-transparent">
              {t("hero.titleLine2")}
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-white/48 sm:text-lg sm:leading-8">
            {t("hero.subtitle")}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              className="group inline-flex items-center gap-3 rounded-full bg-[#ff7542] px-6 py-3.5 text-sm font-semibold text-[#17120e] shadow-[0_12px_40px_rgba(255,117,66,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ff8b5e]"
              href="/register"
            >
              {t("nav.start")}
              <ArrowUpRightIcon />
            </Link>
            <Link
              className="group inline-flex items-center gap-3 rounded-full border border-white/12 px-5 py-3.5 text-sm text-white/60 transition hover:border-white/25 hover:text-white"
              href="/#workflow"
            >
              {t("nav.workflow")}
              <ArrowDownRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
            </Link>
          </div>

          <div className="mt-12 flex items-center gap-4 text-[10px] uppercase tracking-[0.18em] text-white/26">
            <span className="h-px w-10 bg-white/15" />
            {t("hero.trustNote")}
          </div>
        </div>

        <div className="animate-reveal relative min-h-[600px] [animation-delay:120ms]">
          <div className="absolute inset-8 rounded-full bg-[#ff7542]/10 blur-[90px]" />
          <span className="absolute -right-4 top-10 hidden text-[clamp(3.5rem,7vw,7rem)] font-semibold tracking-[-0.07em] text-outline sm:block">
            CUT 01
          </span>

          <div className="animate-drift absolute left-1/2 top-1/2 h-[520px] w-[min(100%,570px)] -translate-x-1/2 -translate-y-1/2 sm:h-[610px]">
            <div className="absolute -left-8 top-16 bottom-16 w-14 rounded-2xl border border-white/10 bg-[#11100d] p-2 shadow-2xl">
              <div className="film-perforations h-full w-full rounded-xl opacity-35" />
            </div>

            <div className="absolute inset-0 overflow-hidden rounded-[2.6rem] border border-white/12 bg-[#12110e] p-2.5 shadow-[0_50px_100px_rgba(0,0,0,0.55)]">
              <div className="scene-glow hero-stage-grid relative h-full overflow-hidden rounded-[2rem]">
                <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-white/10 bg-black/20 px-5 py-4 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full border border-white/20">
                      <span className="size-1.5 rounded-full bg-[#ff7542]" />
                    </span>
                    <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-white/60">
                      {t("hero.sceneLabel")}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] tracking-[0.15em] text-white/35">
                    00:20:00
                  </span>
                </div>

                <div className="animate-scan pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-[#ff9b73]/12 to-transparent" />
                <div className="absolute left-1/2 top-[44%] grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/20 text-white/80 backdrop-blur-sm">
                  <Play className="ml-1 h-6 w-6 fill-current" />
                </div>
                <div className="absolute left-7 top-[31%] h-px w-20 bg-white/20" />
                <div className="absolute left-7 top-[31%] h-2 w-px bg-white/40" />
                <span className="absolute left-7 top-[32%] text-[8px] tracking-[0.18em] text-white/30">
                  REC. 24FPS
                </span>

                <div className="absolute inset-x-5 bottom-34 sm:bottom-40">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.22em] text-[#ffad8c]">
                        {t("hero.direction")}
                      </p>
                      <p className="mt-2 max-w-xs text-xl font-medium leading-tight tracking-[-0.03em] text-white/85 sm:text-2xl">
                        {t("hero.promptPlaceholder")}
                      </p>
                    </div>
                    <span className="mb-1 hidden text-[9px] [writing-mode:vertical-rl] tracking-[0.22em] text-white/25 sm:block">
                      WIDE · ANAMORPHIC
                    </span>
                  </div>
                </div>

                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/12 bg-[#0a0907]/85 p-3.5 backdrop-blur-xl sm:inset-x-5 sm:bottom-5 sm:p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ff7542] text-[#16130f]">
                      <WandSparkles className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] uppercase tracking-[0.18em] text-white/32">
                        {t("hero.promptLabel")}
                      </p>
                      <p className="mt-1 truncate text-sm text-white/72">
                        {t("hero.promptPlaceholder")}
                      </p>
                    </div>
                    <Link
                      aria-label={t("hero.promptAction")}
                      className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#16130f] transition hover:bg-[#ffd2bf]"
                      href="/register"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-5 top-[20%] rotate-3 rounded-2xl border border-white/10 bg-[#17130e]/90 px-4 py-3 shadow-xl backdrop-blur">
              <span className="block text-[8px] uppercase tracking-[0.18em] text-white/30">
                Status
              </span>
              <span className="mt-1 flex items-center gap-2 text-[11px] text-white/70">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                {t("hero.direction")}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 overflow-hidden border-y border-white/8 bg-[#100e0b] py-4">
        <div className="flex min-w-max items-center gap-8 whitespace-nowrap px-5 text-[10px] font-medium uppercase tracking-[0.25em] text-white/28 sm:justify-center">
          <span>IDEA</span>
          <span className="size-1 rounded-full bg-[#ff7542]" />
          <span>DIRECTION</span>
          <span className="size-1 rounded-full bg-[#ff7542]" />
          <span>STORYBOARD</span>
          <span className="size-1 rounded-full bg-[#ff7542]" />
          <span>GENERATE</span>
          <span className="size-1 rounded-full bg-[#ff7542]" />
          <span>FINAL CUT</span>
        </div>
      </div>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff9269]">
              THE CREATIVE DESK
            </p>
            <h2 className="mt-5 max-w-md text-balance text-4xl font-medium leading-[1.03] tracking-[-0.045em] text-[#f6efe4] sm:text-5xl">
              {t("features.title")}
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-7 text-white/38">
              {t("brand.tagline")} {t("hero.subtitle")}
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[2rem] border border-white/9 bg-white/9 md:grid-cols-2">
            {features.map(({ icon: Icon, number, title, body, wide }) => (
              <article
                className={`group relative min-h-64 bg-[#12100d] p-7 transition-colors hover:bg-[#17140f] ${
                  wide ? "md:col-span-2" : ""
                }`}
                key={number}
              >
                <div className="flex items-start justify-between">
                  <Icon className="h-5 w-5 text-[#ff8e65]" />
                  <span className="font-mono text-[10px] text-white/22">{number}</span>
                </div>
                <div className={wide ? "mt-16 max-w-lg" : "mt-14"}>
                  <h3 className="text-xl font-medium tracking-[-0.02em] text-[#f6efe4]">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/36">{body}</p>
                </div>
                <span className="absolute bottom-0 left-0 h-px w-0 bg-[#ff7542] transition-all duration-500 group-hover:w-full" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-24 sm:px-8 sm:pb-32" id="workflow">
        <div className="overflow-hidden rounded-[2.75rem] bg-[#eee5d8] text-[#16130f]">
          <div className="grid gap-8 border-b border-[#16130f]/10 p-7 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b94621]">
                THE PROCESS / 04 STEPS
              </p>
              <h2 className="mt-4 max-w-2xl text-balance text-4xl font-medium tracking-[-0.05em] sm:text-6xl">
                {t("workflow.title")}
              </h2>
            </div>
            <Link
              className="group inline-flex w-fit items-center gap-3 rounded-full bg-[#16130f] px-5 py-3.5 text-sm font-semibold text-white"
              href="/register"
            >
              <Film className="h-4 w-4 text-[#ff8c62]" />
              {t("nav.start")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid md:grid-cols-4">
            {steps.map(({ label, icon: Icon }, index) => (
              <div
                className="group relative min-h-64 border-b border-[#16130f]/10 p-7 transition-colors last:border-b-0 hover:bg-white/30 md:border-b-0 md:border-r md:last:border-r-0 sm:p-8"
                key={label}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#a54220]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Icon className="h-4 w-4 text-[#16130f]/25 transition-colors group-hover:text-[#b94621]" />
                </div>
                <p className="mt-24 max-w-36 text-xl font-medium leading-tight tracking-[-0.025em]">
                  {label}
                </p>
                {index < steps.length - 1 ? (
                  <ArrowRight className="absolute -right-2.5 top-1/2 hidden h-5 w-5 rounded-full bg-[#eee5d8] text-[#16130f]/30 md:block" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#ff7542] text-[#16130f]">
              <Clapperboard className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{t("brand.name")}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-white/28">
                {t("brand.tagline")}
              </p>
            </div>
          </div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/22">
            DIRECTION · GENERATION · FINAL CUT · 2026
          </p>
        </div>
      </footer>
    </main>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7 17 17 7M8 7h9v9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
