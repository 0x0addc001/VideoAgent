import { LandingPage, type LandingLocale } from "@videoagent/landing";
import "@videoagent/landing/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const locale: LandingLocale = "en";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LandingPage
      docsBase="./docs/"
      locale={locale}
      mode="project"
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
  </StrictMode>,
);
