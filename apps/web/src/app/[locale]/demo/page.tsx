import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { DemoShowcase } from "@/components/demo-showcase";
import { routing } from "@/i18n/routing";

export default async function DemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  return <DemoShowcase locale={locale} />;
}
