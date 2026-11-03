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
    <main className="grid min-h-screen bg-[#eee6da] text-[#16130f] lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-[#15120e] p-12 text-white lg:flex lg:flex-col lg:justify-between">
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

      <section className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-12 flex items-center justify-between">
            <Link className="font-semibold lg:hidden" href="/">
              VideoAgent
            </Link>
          </div>
          <AuthForm mode="register" />
        </div>
      </section>
    </main>
  );
}

