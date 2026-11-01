"use client";

import { Github, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { landingContent, type LandingLocale } from "./content";

export type { LandingLocale } from "./content";

export type LandingMode = "app" | "project";

export type LandingHeroVideo = {
  src: string;
  poster: string;
};

export type LandingPageProps = {
  locale: LandingLocale;
  mode: LandingMode;
  videos: readonly LandingHeroVideo[];
  appHref: string;
  githubHref: string;
  localeLinks: Record<LandingLocale, string>;
  docsBase: string;
};

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <rect x="2.75" y="6.75" width="13" height="10.5" rx="2.2" />
        <path d="m15.75 10 5.5-2.25v8.5L15.75 14" />
        <circle cx="9.25" cy="12" r="3" />
      </svg>
    </span>
  );
}
export function LandingPage({
  locale,
  mode,
  videos,
  appHref,
  githubHref,
  localeLinks,
  docsBase,
}: LandingPageProps) {
  const content = landingContent[locale];
  const [languageOpen, setLanguageOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState(0);
  const languageRef = useRef<HTMLDivElement>(null);
  const docsRef = useRef<HTMLDetailsElement>(null);
  const primaryLabel = mode === "app" ? content.hero.create : content.hero.github;
  const primaryHref = mode === "app" ? appHref : githubHref;
  const PrimaryIcon = mode === "app" ? Sparkles : Github;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = content.documentTitle;

    function closeMenus(event: PointerEvent) {
      if (!languageRef.current?.contains(event.target as Node)) {
        setLanguageOpen(false);
      }
      if (!docsRef.current?.contains(event.target as Node)) {
        docsRef.current?.removeAttribute("open");
      }
    }

    document.addEventListener("pointerdown", closeMenus);
    return () => document.removeEventListener("pointerdown", closeMenus);
  }, [content.documentTitle, locale]);

  useEffect(() => {
    if (
      videos.length < 2 ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveVideo((current) => (current + 1) % videos.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [videos.length]);

  return (
    <main className="va-landing">
      <div className="page-grain" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href={mode === "app" ? `/${locale}` : "./"} aria-label="VideoAgent home">
          <BrandMark />
          <span>VideoAgent</span>
        </a>

        <nav aria-label="Main navigation">
          <a href="#product">{content.nav.product}</a>
          <a href="#workflow">{content.nav.workflow}</a>
          <details className="nav-dropdown" ref={docsRef}>
            <summary>{content.nav.docs}</summary>
            <div className="nav-dropdown-menu">
              {content.documents.map((document) => (
                <a href={`${docsBase}${document.path}`} key={document.path}>
                  {document.label}
                </a>
              ))}
            </div>
          </details>
        </nav>

        <div className="header-actions">
          <div className="language-switcher" ref={languageRef}>
            <button
              aria-expanded={languageOpen}
              aria-haspopup="menu"
              aria-label={content.nav.language}
              className="language-button"
              onClick={() => setLanguageOpen((current) => !current)}
              type="button"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21M12 3c-2.5 2.5-3.8 5.5-3.8 9S9.5 18.5 12 21" />
              </svg>
            </button>
            <div className="language-options" hidden={!languageOpen} role="menu">
              <a
                aria-current={locale === "en" ? "true" : undefined}
                href={localeLinks.en}
                onClick={() => setLanguageOpen(false)}
                role="menuitem"
              >
                English
              </a>
              <a
                aria-current={locale === "zh-CN" ? "true" : undefined}
                href={localeLinks["zh-CN"]}
                onClick={() => setLanguageOpen(false)}
                role="menuitem"
              >
                简体中文
              </a>
            </div>
          </div>
          {mode === "project" ? (
            <a className="header-action" href={primaryHref}>
              <PrimaryIcon aria-hidden="true" className="cta-icon" strokeWidth={1.9} />
              <span>{primaryLabel}</span>
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{content.hero.eyebrow}</p>
          <h1>{content.hero.title}</h1>
          <p className="hero-description">{content.hero.description}</p>
          <div className="hero-actions">
            <a className="primary-action" href={primaryHref}>
              <PrimaryIcon aria-hidden="true" className="cta-icon" strokeWidth={1.9} />
              <span>{primaryLabel}</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <div className="hero-art">
          {videos.map((video, index) => {
            const slot = (index - activeVideo + videos.length) % videos.length;
            const position = slot === 0 ? "front" : slot === 1 ? "left" : "right";
            return (
              <figure
                className={`hero-video-frame hero-video-${position}`}
                data-active={index === activeVideo}
                data-video-index={index}
                key={video.src}
              >
                <video
                  aria-label={content.hero.videoLabel}
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster={video.poster}
                  preload="metadata"
                >
                  <source src={video.src} type="video/mp4" />
                </video>
              </figure>
            );
          })}
        </div>
      </section>

      <section className="section product" id="product">
        <div className="section-heading">
          <p className="eyebrow">{content.product.label}</p>
          <h2>{content.product.title}</h2>
          <p>{content.product.description}</p>
        </div>
        <div className="capabilities">
          {content.product.features.map((feature) => (
            <article key={feature.number}>
              <span>{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section workflow" id="workflow">
        <div className="section-heading experience-heading">
          <p className="eyebrow">{content.workflow.label}</p>
          <h2>{content.workflow.title}</h2>
        </div>
        <div className="workflow-grid">
          {content.workflow.steps.map((step, index) => (
            <div key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <a className="brand" href={mode === "app" ? `/${locale}` : "./"} aria-label="VideoAgent home">
          <BrandMark />
          <span>VideoAgent</span>
        </a>
        <a className="footer-github" href={githubHref}>
          <Github aria-hidden="true" className="cta-icon" strokeWidth={1.9} />
          <span>GitHub</span>
          <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </main>
  );
}
