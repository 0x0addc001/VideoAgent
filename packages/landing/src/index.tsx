"use client";

import {
  Bell,
  ChevronDown,
  Clapperboard,
  FileText,
  Film,
  Flame,
  Gem,
  Globe,
  Heart,
  Play,
  UserRound,
  Video,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { landingContent, type LandingLocale } from "./content";

export type { LandingLocale } from "./content";
export { landingContent } from "./content";

export type LandingMode = "app" | "project";
export type LandingView = "agents" | "skills" | "assets" | "hots" | "docs";

export type LandingHeroVideo = {
  src: string;
  poster: string;
};

export type LandingProjectDraft = {
  prompt: string;
  style: string;
  aspectRatio: "auto" | "16:9" | "9:16" | "1:1";
  durationSeconds: "auto" | 5 | 10;
  model: string;
  resolution: "auto" | "720p" | "1080p";
  audio: "auto" | "on" | "off";
  reviewMode: "auto" | "ask";
};

type PublishedHot = {
  author: string;
  likes: number;
  prompt: string;
  title: string;
};

export type LandingPageProps = {
  locale: LandingLocale;
  mode: LandingMode;
  videos: readonly LandingHeroVideo[];
  docsBase: string;
  accountApiBase?: string;
  accountCredits?: number | null;
  onCreateProject?: (draft: LandingProjectDraft) => Promise<void>;
};

function BrandMark() {
  return (
    <span className="brand-mark" data-tone="monochrome" aria-hidden="true">
      <Play className="brand-play" />
    </span>
  );
}

type HeroPart = {
  text: string;
  accent?: boolean;
};

const HERO_LINE_ONE: HeroPart[] = [
  { text: "Video" },
  { text: "Agent", accent: true },
];
const HERO_LINE_TWO: HeroPart[] = [
  { text: "You Are the " },
  { text: "Director", accent: true },
];

const DOCS_ASSET_VERSION = "14";

function heroPartsLength(parts: readonly HeroPart[]) {
  return parts.reduce((total, part) => total + Array.from(part.text).length, 0);
}

function renderHeroParts(parts: readonly HeroPart[], visible: number) {
  let remaining = visible;
  return parts.map((part, index) => {
    const characters = Array.from(part.text);
    const count = Math.max(0, Math.min(characters.length, remaining));
    remaining -= characters.length;
    return (
      <span className={part.accent ? "hero-accent" : undefined} key={`${part.text}-${index}`}>
        {characters.slice(0, count).join("")}
      </span>
    );
  });
}

function StreamingHeroTitle() {
  const lineOneLength = heroPartsLength(HERO_LINE_ONE);
  const lineTwoLength = heroPartsLength(HERO_LINE_TWO);
  const totalLength = lineOneLength + lineTwoLength;
  const [visibleCharacters, setVisibleCharacters] = useState<number | null>(null);

  useEffect(() => {
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setVisibleCharacters(totalLength);
      return;
    }

    let cancelled = false;
    let typed = 0;
    let timer: number | undefined;

    const clearTimer = () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };

    const typeNext = () => {
      if (cancelled) return;
      typed += 1;
      setVisibleCharacters(typed);
      if (typed < totalLength) {
        timer = window.setTimeout(typeNext, typed === lineOneLength ? 380 : 42);
        return;
      }
      timer = window.setTimeout(() => {
        if (cancelled) return;
        typed = 0;
        setVisibleCharacters(0);
        timer = window.setTimeout(typeNext, 700);
      }, 3200);
    };

    setVisibleCharacters(0);
    timer = window.setTimeout(typeNext, 350);
    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [lineOneLength, totalLength]);

  const visible = visibleCharacters ?? totalLength;
  const visibleLineOne = Math.min(visible, lineOneLength);
  const visibleLineTwo = Math.max(0, visible - lineOneLength);

  return (
    <h1 aria-label="VideoAgent You Are the Director" data-hero-stream="loop">
      <span aria-hidden="true" className="hero-line hero-line-brand">
        <Play
          className={`hero-title-icon${visibleLineOne > 0 ? " is-visible" : ""}`}
        />
        <span className="hero-line-text">
          <span className="hero-line-ghost">{renderHeroParts(HERO_LINE_ONE, lineOneLength)}</span>
          <span className="hero-line-live">
            {renderHeroParts(HERO_LINE_ONE, visibleLineOne)}
          </span>
        </span>
      </span>
      <span aria-hidden="true" className="hero-line">
        <span className="hero-line-ghost">{renderHeroParts(HERO_LINE_TWO, lineTwoLength)}</span>
        <span className="hero-line-live">{renderHeroParts(HERO_LINE_TWO, visibleLineTwo)}</span>
      </span>
    </h1>
  );
}

type ComposerSelectOption = {
  label: string;
  value: string;
};

type ComposerSelectProps = {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly ComposerSelectOption[];
  value: string;
};

function ComposerSelect({
  className = "",
  label,
  onChange,
  options,
  value,
}: ComposerSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const visibleLabel = value === "auto" ? label : (selectedOption?.label ?? value);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  return (
    <div className={`composer-select ${className}`.trim()} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        className="composer-select-trigger"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        type="button"
      >
        <span>{visibleLabel}</span>
        <ChevronDown aria-hidden="true" className="composer-select-arrow" />
      </button>
      {open ? (
        <div className="composer-select-menu" role="listbox">
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className="composer-select-option"
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function StreamingText({
  text,
  className = "",
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const [visibleText, setVisibleText] = useState(text);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = textRef.current;
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!element || reduceMotion || typeof window.IntersectionObserver !== "function") {
      setVisibleText(text);
      return;
    }

    let started = false;
    let cancelled = false;
    let timer: number | undefined;
    setVisibleText("");

    const characters = Array.from(text);
    const baseDelay = Math.max(8, Math.min(24, 2300 / Math.max(text.length, 1)));

    function typeNext(index: number) {
      if (cancelled) return;
      if (index >= characters.length) {
        setVisibleText(text);
        return;
      }

      const character = characters[index];
      setVisibleText(characters.slice(0, index + 1).join(""));
      const punctuationPause = /[，。！？；：,.!?;:]/.test(character) ? 4 : 1;
      timer = window.setTimeout(
        () => typeNext(index + 1),
        baseDelay * punctuationPause,
      );
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (started || !entries.some((entry) => entry.isIntersecting)) return;
        started = true;
        observer.disconnect();
        timer = window.setTimeout(() => typeNext(0), delay);
      },
      { threshold: 0.16, rootMargin: "0px 0px -5% 0px" },
    );
    observer.observe(element);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [delay, text]);

  return (
    <span
      aria-label={text}
      className={`streaming-text ${visibleText === text ? "is-typed" : "is-typing"} ${className}`}
      ref={textRef}
    >
      <span aria-hidden="true" className="streaming-ghost">
        {text}
      </span>
      <span aria-hidden="true" className="streaming-live">
        {visibleText}
      </span>
    </span>
  );
}

function initialsFromEmail(email: string): string {
  const localPart = email.split("@")[0]?.trim() ?? "";
  const parts = localPart.split(/[._-]+/).filter(Boolean);
  const characters =
    parts.length > 1
      ? [Array.from(parts[0])[0], Array.from(parts[1])[0]]
      : Array.from(localPart).slice(0, 2);
  return characters.filter(Boolean).join("").toUpperCase();
}

export function LandingPage({
  locale,
  mode,
  videos,
  docsBase,
  accountApiBase,
  accountCredits = 0,
  onCreateProject,
}: LandingPageProps) {
  const content = landingContent[locale];
  const [activeView, setActiveView] = useState<LandingView>("agents");
  const [activeDocument, setActiveDocument] = useState<string>(
    content.documents[0]?.path ?? "",
  );
  const [docsLocale, setDocsLocale] = useState<LandingLocale>("en");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [previewNoticeOpen, setPreviewNoticeOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishDraft, setPublishDraft] = useState("");
  const [publishedHots, setPublishedHots] = useState<PublishedHot[]>([]);
  const [displayCredits, setDisplayCredits] = useState(
    accountCredits === null ? "—" : String(accountCredits),
  );
  const [displayAvatar, setDisplayAvatar] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string>("auto");
  const [aspectRatio, setAspectRatio] =
    useState<LandingProjectDraft["aspectRatio"]>("auto");
  const [durationSeconds, setDurationSeconds] =
    useState<LandingProjectDraft["durationSeconds"]>("auto");
  const [model, setModel] = useState<string>("auto");
  const [resolution, setResolution] =
    useState<LandingProjectDraft["resolution"]>("auto");
  const [audio, setAudio] = useState<LandingProjectDraft["audio"]>("auto");
  const [reviewMode, setReviewMode] =
    useState<LandingProjectDraft["reviewMode"]>("auto");
  const [isCreating, setIsCreating] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = content.documentTitle;
    const hash = window.location.hash.slice(1);
    if (
      hash === "agents" ||
      hash === "skills" ||
      hash === "assets" ||
      hash === "hots" ||
      hash === "docs"
    ) {
      setActiveView(hash);
    }
    try {
      const savedDocsLocale = window.localStorage.getItem("videoagent-docs-locale");
      if (savedDocsLocale === "en" || savedDocsLocale === "zh-CN") {
        setDocsLocale(savedDocsLocale);
      }
    } catch {
      // Storage may be unavailable.
    }

    function closeMenus(event: PointerEvent) {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (!languageRef.current?.contains(event.target as Node)) {
        setLanguageOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeMenus);
    return () => document.removeEventListener("pointerdown", closeMenus);
  }, [content.documentTitle, locale]);

  useEffect(() => {
    if (!accountApiBase || mode !== "app") return;
    let active = true;

    async function loadAccount() {
      try {
        const accountResponse = await fetch(`${accountApiBase}/auth/me`, {
          credentials: "include",
        });
        if (!active) return;
        if (accountResponse.ok) {
          const account = (await accountResponse.json()) as { email?: string };
          if (account.email) {
            setDisplayAvatar(initialsFromEmail(account.email) || null);
          }
        }
      } catch {
        // Public and preview pages use the generic account icon.
      }
    }

    async function loadCredits() {
      try {
        const creditResponse = await fetch(`${accountApiBase}/providers/pippit/credits`, {
          credentials: "include",
        });
        if (!active) return;
        if (creditResponse.ok) {
          const payload = (await creditResponse.json()) as { credits?: number | null };
          setDisplayCredits(
            typeof payload.credits === "number" ? String(payload.credits) : "—",
          );
        }
      } catch {
        // Public and preview pages keep the available fallback balance.
      }
    }

    void loadAccount();
    void loadCredits();
    return () => {
      active = false;
    };
  }, [accountApiBase, mode]);

  useEffect(() => {
    if (!previewNoticeOpen) return;

    function closePreview(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewNoticeOpen(false);
      }
    }

    document.addEventListener("keydown", closePreview);
    return () => document.removeEventListener("keydown", closePreview);
  }, [previewNoticeOpen]);

  useEffect(() => {
    if (!publishOpen) return;

    function closePublisher(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPublishOpen(false);
      }
    }

    document.addEventListener("keydown", closePublisher);
    return () => document.removeEventListener("keydown", closePublisher);
  }, [publishOpen]);

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      promptRef.current?.focus();
      return;
    }
    if (mode !== "app" || !onCreateProject) {
      setPreviewNoticeOpen(true);
      return;
    }

    setComposerError(null);
    setIsCreating(true);
    try {
      await onCreateProject({
        prompt: normalizedPrompt,
        style,
        aspectRatio,
        durationSeconds,
        model,
        resolution,
        audio,
        reviewMode,
      });
    } catch {
      setComposerError(content.composer.error);
    } finally {
      setIsCreating(false);
    }
  }

  function usePrompt(value: string) {
    setPrompt(value);
    setActiveView("agents");
    window.history.replaceState(null, "", "#agents");
    window.setTimeout(() => promptRef.current?.focus(), 250);
  }

  function openPublisher() {
    if (mode === "project") {
      setPreviewNoticeOpen(true);
      return;
    }
    setPublishOpen(true);
  }

  function publishHot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = publishDraft.trim();
    if (!value) return;
    setPublishedHots((current) => [
      {
        author: content.hots.you,
        likes: 0,
        prompt: value,
        title: value.length > 42 ? `${value.slice(0, 42)}…` : value,
      },
      ...current,
    ]);
    setPublishDraft("");
    setPublishOpen(false);
  }

  function openView(view: LandingView) {
    setActiveView(view);
    window.history.replaceState(null, "", `#${view}`);
  }

  function selectDocsLocale(nextLocale: LandingLocale) {
    setDocsLocale(nextLocale);
    setLanguageOpen(false);
    try {
      window.localStorage.setItem("videoagent-docs-locale", nextLocale);
    } catch {
      // Storage may be unavailable.
    }
  }

  const activeDocumentSource =
    docsLocale === "zh-CN"
      ? activeDocument.replace(/\.html$/, ".zh.html")
      : activeDocument;

  return (
    <main className="va-landing">
      <div className="page-grain" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href={mode === "app" ? `/${locale}` : "./"} aria-label="VideoAgent home">
          <BrandMark />
          <span className="brand-copy">
            <strong>Video</strong>
            <em>Agent</em>
          </span>
        </a>

        <nav aria-label="Main navigation">
          <button
            aria-current={activeView === "agents" ? "page" : undefined}
            onClick={() => openView("agents")}
            type="button"
          >
            <Clapperboard aria-hidden="true" className="nav-icon" />
            <span>{content.nav.agents}</span>
          </button>
          <button
            aria-current={activeView === "skills" ? "page" : undefined}
            onClick={() => openView("skills")}
            type="button"
          >
            <Video aria-hidden="true" className="nav-icon" />
            <span>{content.nav.skills}</span>
          </button>
          <button
            aria-current={activeView === "assets" ? "page" : undefined}
            onClick={() => openView("assets")}
            type="button"
          >
            <Film aria-hidden="true" className="nav-icon" />
            <span>{content.nav.assets}</span>
          </button>
          <button
            aria-current={activeView === "hots" ? "page" : undefined}
            onClick={() => openView("hots")}
            type="button"
          >
            <Flame aria-hidden="true" className="nav-icon" />
            <span>{content.nav.hots}</span>
          </button>
          <button
            aria-current={activeView === "docs" ? "page" : undefined}
            onClick={() => openView("docs")}
            type="button"
          >
            <FileText aria-hidden="true" className="nav-icon" />
            <span>{content.nav.docs}</span>
          </button>
        </nav>
      </header>

      <div className="header-actions">
          <div className="language-switcher" ref={languageRef}>
            <button
              aria-expanded={languageOpen}
              aria-label={content.nav.language}
              className="language-button"
              onClick={() => setLanguageOpen((current) => !current)}
              title={`${content.nav.language}: ${docsLocale === "zh-CN" ? "中文" : "English"}`}
              type="button"
            >
              <Globe aria-hidden="true" />
            </button>
            <div
              aria-label={content.nav.language}
              className="language-options"
              hidden={!languageOpen}
              role="menu"
            >
              <button
                aria-checked={docsLocale === "en"}
                onClick={() => selectDocsLocale("en")}
                role="menuitemradio"
                type="button"
              >
                English
              </button>
              <button
                aria-checked={docsLocale === "zh-CN"}
                onClick={() => selectDocsLocale("zh-CN")}
                role="menuitemradio"
                type="button"
              >
                中文
              </button>
            </div>
          </div>
          <div className="notification-switcher" ref={notificationRef}>
            <button
              aria-expanded={notificationsOpen}
              aria-label={content.nav.notifications}
              className="notification-button"
              onClick={() => setNotificationsOpen((current) => !current)}
              type="button"
            >
              <Bell aria-hidden="true" strokeWidth={1.6} />
            </button>
            <div className="notification-panel" hidden={!notificationsOpen}>
              <p>{content.nav.emptyNotifications}</p>
            </div>
          </div>
          <span className="credit-count" title={`${displayCredits} ${content.nav.credits}`}>
            <Gem aria-hidden="true" className="credit-icon" strokeWidth={1.6} />
            <span>{displayCredits}</span>
          </span>
          <span
            aria-label={content.nav.account}
            className={`account-avatar${displayAvatar ? "" : " account-avatar-default"}`}
            title={content.nav.account}
          >
            {displayAvatar ?? <UserRound className="avatar-placeholder" />}
          </span>
      </div>

      {activeView === "agents" ? (
      <section className="hero" id="agents">
        <div className="hero-media-wall" aria-hidden="true">
          <div className="hero-media-track">
            {[...videos, ...videos].map((video, index) => (
              <figure
                className="hero-video-frame"
                data-video-index={index % videos.length}
                key={`${video.src}-${index}`}
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
            ))}
          </div>
          <div className="hero-media-shade" />
        </div>

        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-title">
              <StreamingHeroTitle />
            </div>
          </div>

          <form className="creation-composer" onSubmit={submitProject}>
            <textarea
              aria-label={content.composer.label}
              maxLength={20_000}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={content.composer.placeholder}
              ref={promptRef}
              rows={3}
              value={prompt}
            />
            <div className="idea-row">
              <div>
                {content.composer.examples.map((example) => (
                  <button
                    key={example}
                    onClick={() => {
                      setPrompt(example);
                      promptRef.current?.focus();
                    }}
                    type="button"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
            <div className="composer-controls" aria-label={content.composer.settingsLabel}>
              <ComposerSelect
                label={content.composer.styleLabel}
                onChange={setStyle}
                options={[
                  { label: "Auto", value: "auto" },
                  ...content.composer.styles.map((option) => ({
                    label: option.label,
                    value: option.id,
                  })),
                ]}
                value={style}
              />
              <ComposerSelect
                label={content.composer.frameLabel}
                onChange={(value) =>
                  setAspectRatio(value as LandingProjectDraft["aspectRatio"])
                }
                options={[
                  { label: "Auto", value: "auto" },
                  ...["16:9", "9:16", "1:1"].map((ratio) => ({
                    label: ratio,
                    value: ratio,
                  })),
                ]}
                value={aspectRatio}
              />
              <ComposerSelect
                label={content.composer.lengthLabel}
                onChange={(value) =>
                  setDurationSeconds(
                    value === "auto"
                      ? "auto"
                      : (Number(value) as LandingProjectDraft["durationSeconds"]),
                  )
                }
                options={[
                  { label: "Auto", value: "auto" },
                  ...[5, 10].map((duration) => ({
                    label: `${duration}${content.composer.seconds}`,
                    value: String(duration),
                  })),
                ]}
                value={String(durationSeconds)}
              />
              <ComposerSelect
                className="composer-select-model"
                label={content.composer.modelLabel}
                onChange={setModel}
                options={[
                  { label: "Auto", value: "auto" },
                  ...content.composer.models
                    .filter((option) => option !== "Auto" && option !== "自动")
                    .map((option) => ({ label: option, value: option })),
                ]}
                value={model}
              />
              <ComposerSelect
                label={content.composer.resolutionLabel}
                onChange={(value) =>
                  setResolution(value as LandingProjectDraft["resolution"])
                }
                options={[
                  { label: "Auto", value: "auto" },
                  ...content.composer.resolutions.map((option) => ({
                    label: option,
                    value: option,
                  })),
                ]}
                value={resolution}
              />
              <ComposerSelect
                label={content.composer.audioLabel}
                onChange={(value) => setAudio(value as LandingProjectDraft["audio"])}
                options={content.composer.audioOptions.map((option) => ({
                  label: option.label,
                  value: option.id,
                }))}
                value={audio}
              />
              <ComposerSelect
                label={content.composer.reviewLabel}
                onChange={(value) =>
                  setReviewMode(value as LandingProjectDraft["reviewMode"])
                }
                options={content.composer.reviewOptions.map((option) => ({
                  label: option.label,
                  value: option.id,
                }))}
                value={reviewMode}
              />
              <button
                aria-label={content.composer.submit}
                className="composer-submit"
                disabled={!prompt.trim() || isCreating}
                type="submit"
              >
                <Play aria-hidden="true" strokeWidth={1.8} />
                <span>{isCreating ? content.composer.creating : content.composer.submit}</span>
              </button>
            </div>
            {composerError ? (
              <p aria-live="polite" className="composer-error">
                {composerError}
              </p>
            ) : null}
          </form>
        </div>
      </section>
      ) : null}

      {activeView === "skills" ? (
      <section className="section feature-section" id="skills">
        <div className="skill-groups">
          {[content.skills.atomic, content.skills.workflows].map((group) => (
            <section className="skill-group" key={group.label}>
              <header className="skill-group-heading">
                <span>{group.label}</span>
                <p>{group.hint}</p>
              </header>
              <div className="feature-grid">
                {group.items.map((skill) => (
                  <button
                    className="feature-card skill-card"
                    key={skill.code}
                    onClick={() => usePrompt(skill.prompt)}
                    type="button"
                  >
                    <span className="skill-code">{skill.code}</span>
                    <span className="skill-card-copy">
                      <strong>{skill.title}</strong>
                      <p>{skill.body}</p>
                      {"flow" in skill ? <small>{skill.flow}</small> : null}
                    </span>
                    <i aria-hidden="true">↗</i>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="review-skill">
          <div>
            <span>{content.skills.review.title}</span>
            <p>{content.skills.review.body}</p>
          </div>
          {mode === "app" ? (
            <a href={`/${locale}/projects`}>{content.skills.review.action} ↗</a>
          ) : (
            <button onClick={() => setPreviewNoticeOpen(true)} type="button">
              {content.skills.review.action} ↗
            </button>
          )}
        </div>
      </section>
      ) : null}

      {activeView === "assets" ? (
      <section className="section feature-section" id="assets">
        <div className="asset-grid">
          {content.assets.items.map((asset) => (
            <article className="asset-card" key={asset.title}>
              <div className="asset-media">
                <video
                  aria-label={`${asset.title} preview`}
                  controls
                  loop
                  muted
                  playsInline
                  poster={videos[asset.videoIndex].poster}
                  preload="metadata"
                >
                  <source src={videos[asset.videoIndex].src} type="video/mp4" />
                </video>
              </div>
              <div className="asset-info">
                <div className="asset-title-row">
                  <h2>{asset.title}</h2>
                  <span>{asset.status}</span>
                </div>
                <p>{asset.summary}</p>
                <div className="asset-meta">
                  <span>{asset.updatedAt}</span>
                  <span>{asset.duration}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      ) : null}

      {activeView === "hots" ? (
      <section className="section hots-section" id="hots">
        <div className="community-stream">
          <button
            className="community-card community-publish-card"
            onClick={openPublisher}
            type="button"
          >
            <Play aria-hidden="true" className="community-publish-icon" />
            <span>{content.hots.publish}</span>
          </button>
          {[...publishedHots, ...content.hots.items].map((item, index) => (
            <button
              className={`community-card community-card-${(index % 5) + 1}`}
              key={`${item.author}-${item.title}-${index}`}
              onClick={() => usePrompt(item.prompt)}
              type="button"
            >
              <video
                aria-hidden="true"
                autoPlay
                loop
                muted
                playsInline
                poster={videos[index % videos.length].poster}
                preload="auto"
              >
                <source src={videos[index % videos.length].src} type="video/mp4" />
              </video>
              <span className="community-card-content">
                <span className="community-card-title">{item.title}</span>
                <span className="community-card-meta">
                  <span className="community-author">
                    <span className="community-author-mark" aria-hidden="true">
                      {Array.from(item.author)[0]}
                    </span>
                    {item.author}
                  </span>
                  <span className="community-likes">
                    <Heart aria-hidden="true" />
                    {item.likes}
                  </span>
                </span>
              </span>
              <span className="community-action">{content.hots.makeThis} ↗</span>
            </button>
          ))}
        </div>
      </section>
      ) : null}

      {activeView === "docs" ? (
        <section className="docs-view" id="docs">
          <div aria-label={content.nav.docs} className="docs-tabs" role="tablist">
            {content.documents.map((document) => (
              <button
                aria-selected={activeDocument === document.path}
                key={document.path}
                onClick={() => setActiveDocument(document.path)}
                role="tab"
                type="button"
              >
                <FileText aria-hidden="true" className="docs-tab-icon" />
                {document.label}
              </button>
            ))}
          </div>
          <div className="docs-frame">
            <iframe
              key={`${activeDocument}-${docsLocale}`}
              src={`${docsBase}${activeDocumentSource}?v=${DOCS_ASSET_VERSION}`}
              title={content.documents.find((document) => document.path === activeDocument)?.label}
            />
          </div>
        </section>
      ) : null}

      {publishOpen ? (
        <div
          className="preview-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setPublishOpen(false);
            }
          }}
        >
          <form
            aria-labelledby="publish-title"
            aria-modal="true"
            className="preview-dialog publish-dialog"
            onSubmit={publishHot}
            role="dialog"
          >
            <button
              aria-label={content.hots.cancel}
              className="preview-close"
              onClick={() => setPublishOpen(false)}
              type="button"
            >
              ×
            </button>
            <p className="preview-eyebrow">{content.nav.hots}</p>
            <h2 id="publish-title">{content.hots.publishTitle}</h2>
            <textarea
              aria-label={content.hots.publishPlaceholder}
              onChange={(event) => setPublishDraft(event.target.value)}
              placeholder={content.hots.publishPlaceholder}
              value={publishDraft}
            />
            <div className="publish-actions">
              <button
                className="publish-cancel"
                onClick={() => setPublishOpen(false)}
                type="button"
              >
                {content.hots.cancel}
              </button>
              <button
                className="primary-action"
                disabled={!publishDraft.trim()}
                type="submit"
              >
                {content.hots.publishAction}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {previewNoticeOpen ? (
        <div
          className="preview-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewNoticeOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="preview-notice-title"
            aria-modal="true"
            className="preview-dialog"
            role="dialog"
          >
            <button
              aria-label={content.preview.close}
              className="preview-close"
              onClick={() => setPreviewNoticeOpen(false)}
              type="button"
            >
              ×
            </button>
            <p className="preview-eyebrow">VideoAgent</p>
            <h2 id="preview-notice-title">{content.preview.title}</h2>
            <p>{content.preview.body}</p>
            <button
              className="primary-action"
              onClick={() => setPreviewNoticeOpen(false)}
              type="button"
            >
              {content.preview.action}
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
