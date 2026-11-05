import { ArrowLeft } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";
import { Link } from "@/i18n/navigation";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#080807] px-5 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(22,119,255,0.2),transparent_28%),radial-gradient(circle_at_78%_76%,rgba(107,74,41,0.2),transparent_34%)]" />
      <section className="relative w-full max-w-md rounded-[30px] border border-white/10 bg-[#11100d]/90 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9">
        <Link
          className="mb-10 inline-flex items-center gap-2 text-sm text-white/48 transition hover:text-white"
          href="/"
        >
          <ArrowLeft className="h-4 w-4" />
          VideoAgent
        </Link>
        <AuthForm mode="login" />
      </section>
    </main>
  );
}

