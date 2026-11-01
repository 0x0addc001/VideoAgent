"use client";

import {
  ArrowDown,
  BrainCircuit,
  Clapperboard,
  Layers3,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { landingContent, type LandingLocale } from "./content";

export type { LandingLocale } from "./content";

export type LandingMode = "app" | "project";

export type LandingPageProps = {
  locale: LandingLocale;
  mode: LandingMode;
  videoSrc: string;
  posterSrc: string;
  appHref: string;
  githubHref: string;
  localeLinks: Record<LandingLocale, string>;
  docsBase: string;
};

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M4 7h16v13H4zM4 7l3-3h4l3 3m-2 0 3-3h4l-2 3" />
      </svg>
    </span>
  );
}
export function LandingPage({
  locale,
  mode,
  videoSrc,
  posterSrc,
  appHref,
  githubHref,
  localeLinks,
  docsBase,
}: LandingPageProps) {
  const content = landingContent[locale];
  const [languageOpen, setLanguageOpen] = useState(false);
  const languageRef = useRef<HTMLDivElement>(null);
  const docsRef = useRef<HTMLDetailsElement>(null);
  const primaryLabel = mode === "app" ? content.hero.create : content.hero.github;
  const primaryHref = mode === "app" ? appHref : githubHref;
  const featureIcons = [BrainCircuit, Clapperboard, Layers3];

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
          <a className="header-action" href={primaryHref}>
            {primaryLabel} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{content.hero.eyebrow}</p>
          <h1>{content.hero.title}</h1>
          <p className="hero-description">{content.hero.description}</p>
          <div className="hero-actions">
            <a className="primary-action" href={primaryHref}>
              {primaryLabel} <span aria-hidden="true">↗</span>
            </a>
            <a className="secondary-action" href="#workflow">
              {content.hero.workflow} <ArrowDown aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="hero-art">
          <div className="scene-card scene-card-back-one" />
          <div className="scene-card scene-card-back-two" />
          <figure className="hero-video-frame">
            <video
              aria-label="A creator filming a personal vlog"
              autoPlay
              loop
              muted
              playsInline
              poster={posterSrc}
              preload="metadata"
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
          </figure>
        </div>
      </section>

      <section className="section product" id="product">
        <div className="section-heading">
          <p className="eyebrow">{content.product.label}</p>
          <h2>{content.product.title}</h2>
          <p>{content.product.description}</p>
        </div>
        <div className="capabilities">
          {content.product.features.map((feature, index) => {
            const Icon = featureIcons[index];
            return (
              <article key={feature.number}>
                <span>{feature.number}</span>
                <Icon aria-hidden="true" className="feature-icon" />
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section workflow" id="workflow">
        <div className="section-heading compact">
          <p className="eyebrow">{content.workflow.label}</p>
          <h2>{content.workflow.title}</h2>
        </div>
        <div className="workflow-grid">
          {content.workflow.steps.map((step, index) => (
            <div key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <a className="brand" href={mode === "app" ? `/${locale}` : "./"} aria-label="VideoAgent home">
          <BrandMark />
          <span>VideoAgent</span>
        </a>
        <a href={githubHref}>GitHub ↗</a>
      </footer>
    </main>
  );
}
