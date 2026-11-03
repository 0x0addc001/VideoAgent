import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { AppLandingPage } from "@/components/app-landing-page";
import { routing } from "@/i18n/routing";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return <AppLandingPage />;
}
