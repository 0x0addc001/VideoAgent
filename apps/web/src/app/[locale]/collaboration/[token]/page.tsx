import { setRequestLocale } from "next-intl/server";
import { CollaborationJoin } from "@/components/collaboration-join";

export default async function CollaborationPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[#080807] px-5 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(22,119,255,0.2),transparent_34%),radial-gradient(circle_at_76%_75%,rgba(57,189,255,0.08),transparent_30%)]" />
      <div className="relative">
        <CollaborationJoin locale={locale} token={token} />
      </div>
    </main>
  );
}
