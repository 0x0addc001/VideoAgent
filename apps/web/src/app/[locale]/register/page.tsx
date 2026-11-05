import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";
import { Link } from "@/i18n/navigation";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main className="grid min-h-screen bg-[#080807] text-white lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden overflow-hidden border-r border-white/8 bg-[#0f0e0b] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-44 -top-44 size-[34rem] rounded-full bg-[#1677ff]/20 blur-3xl" />
        <Link className="relative flex items-center gap-2 text-sm text-white/70 hover:text-white" href="/">
          <ArrowLeft className="h-4 w-4" />
          VideoAgent
        </Link>
        <div className="relative">
          <p className="max-w-md text-4xl font-medium leading-tight tracking-[-0.04em]">
            {t("registerSubtitle")}
          </p>
          <div className="mt-10 flex gap-2">
            {["Brief", "Storyboard", "Review", "Export"].map((item, index) => (
              <div
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50"
                key={item}
              >
                {String(index + 1).padStart(2, "0")} {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/35">VideoAgent · Agentic video studio</p>
      </aside>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_24%,rgba(22,119,255,0.13),transparent_32%)]" />
        <div className="relative w-full max-w-md rounded-[30px] border border-white/10 bg-[#11100d]/90 p-7 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-9">
          <div className="mb-12 flex items-center justify-between">
            <Link className="font-semibold text-white lg:hidden" href="/">
              VideoAgent
            </Link>
          </div>
          <AuthForm mode="register" />
        </div>
      </section>
    </main>
  );
}

