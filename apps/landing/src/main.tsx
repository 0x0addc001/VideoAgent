import { LandingPage, type LandingLocale } from "@videoagent/landing";
import "@videoagent/landing/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function resolveLocale(): LandingLocale {
  const queryLocale = new URLSearchParams(window.location.search).get("lang");
  if (queryLocale === "zh" || queryLocale === "en") {
    return queryLocale === "zh" ? "zh-CN" : "en";
  }

  try {
    const saved = window.localStorage.getItem("videoagent-language");
    if (saved === "zh-CN" || saved === "en") return saved;
  } catch {
    // Storage may be disabled.
  }

  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

const locale = resolveLocale();

try {
  window.localStorage.setItem("videoagent-language", locale);
} catch {
  // Storage may be disabled.
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LandingPage
      appHref="/"
      docsBase="./docs/"
      githubHref="https://github.com/0x0addc001/VideoAgent"
      locale={locale}
      localeLinks={{ en: "?lang=en", "zh-CN": "?lang=zh" }}
      mode="project"
      videos={[
        {
          src: "./assets/vlog-hero.mp4#t=0.2",
          poster: "./assets/vlog-hero-poster-1.jpg",
        },
        {
          src: "./assets/vlog-hero.mp4#t=2.4",
          poster: "./assets/vlog-hero-poster-2.jpg",
        },
        {
          src: "./assets/vlog-hero.mp4#t=4.7",
          poster: "./assets/vlog-hero-poster-3.jpg",
        },
      ]}
    />
  </StrictMode>,
);
