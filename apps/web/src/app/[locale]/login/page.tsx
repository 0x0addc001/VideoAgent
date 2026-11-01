import { ArrowLeft } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="grid min-h-screen place-items-center bg-[#eee6da] px-5 py-12 text-[#16130f]">
      <section className="w-full max-w-md">
        <div className="mb-12 flex items-center justify-between">
          <Link className="flex items-center gap-2 text-sm text-[#756d61]" href="/">
            <ArrowLeft className="h-4 w-4" />
            VideoAgent
          </Link>
          <div className="[&_select]:border-[#16130f]/10 [&_select]:bg-white [&_select]:text-[#16130f]">
            <LocaleSwitcher />
          </div>
        </div>
        <AuthForm mode="login" />
      </section>
    </main>
  );
}

