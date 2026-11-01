import { LandingPage } from "@videoagent/landing";
import "@videoagent/landing/styles.css";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

const DOCS_BASE_URL = "https://0x0addc001.github.io/VideoAgent/docs/";
const GITHUB_URL = "https://github.com/0x0addc001/VideoAgent";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <LandingPage
      accountHref={`/${locale}/projects`}
      appHref={`/${locale}/register`}
      docsBase={DOCS_BASE_URL}
      githubHref={GITHUB_URL}
      locale={locale}
      localeLinks={{ en: "/en", "zh-CN": "/zh-CN" }}
      mode="app"
      videos={[
        {
          src: "/media/vlog-hero.mp4",
          poster: "/media/vlog-hero-poster.jpg",
        },
        {
          src: "/media/vlog-hero-european.mp4",
          poster: "/media/vlog-hero-european-poster.jpg",
        },
        {
          src: "/media/vlog-hero-black.mp4",
          poster: "/media/vlog-hero-black-poster.jpg",
        },
      ]}
    />
  );
}
