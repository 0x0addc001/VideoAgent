import { LandingPage, type LandingLocale } from "@videoagent/landing";
import "@videoagent/landing/styles.css";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

function initialLocale(): LandingLocale {
  const requested = new URLSearchParams(window.location.search).get("lang");
  return requested === "zh-CN" ? "zh-CN" : "en";
}

function ProjectLandingPage() {
  const [locale, setLocale] = useState<LandingLocale>(initialLocale);

  function changeLocale(nextLocale: LandingLocale) {
    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    const url = new URL(window.location.href);
    if (nextLocale === "zh-CN") url.searchParams.set("lang", "zh-CN");
    else url.searchParams.delete("lang");
    window.history.replaceState(null, "", url);
  }

  return (
    <LandingPage
      docsBase="./docs/"
      locale={locale}
      mode="project"
      onLocaleChange={changeLocale}
      videos={[
        {
          src: "./assets/vlog-hero.mp4",
          poster: "./assets/vlog-hero-poster.jpg",
        },
        {
          src: "./assets/vlog-hero-european.mp4",
          poster: "./assets/vlog-hero-european-poster.jpg",
        },
        {
          src: "./assets/vlog-hero-black.mp4",
          poster: "./assets/vlog-hero-black-poster.jpg",
        },
      ]}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProjectLandingPage />
  </StrictMode>,
);
