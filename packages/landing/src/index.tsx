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
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Search,
  Sparkles,
  Upload,
  UserRound,
  Video,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  landingContent,
  type LandingHook,
  type LandingLocale,
  type LandingPlaybook,
} from "./content";

export type { LandingHook, LandingLocale, LandingPlaybook } from "./content";
export { landingContent } from "./content";

export type LandingMode = "app" | "project";
export type LandingView = "agents" | "skills" | "assets" | "hots" | "docs";

export type LandingHeroVideo = {
  src: string;
  poster: string;
};

export type LandingProjectDraft = {
  prompt: string;
  skill: string;
  hook: LandingHook;
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
  assetId?: string;
  createdAt?: string;
  id?: string;
  isMine?: boolean;
  likes: number;
  prompt: string;
  skill: string;
  title: string;
  videoUrl?: string;
};

type UserVideoAsset = {
  id: string;
  assetId: string;
  contentUrl: string;
  createdAt: string;
  permission: "private" | "public";
  title: string;
};

type AssetDetail = {
  author?: string;
  body?: string;
  editedAt: string;
  instructions?: string;
  likes?: number;
  permission: "private" | "public";
  prompt?: string;
  title: string;
  type: "video" | "skill";
  videoUrl?: string;
};

type AssetView = AssetDetail & {
  id?: string;
  imageIndex?: number;
};

type RecentConversation = {
  folderId: string | null;
  id: string;
  preview: string | null;
  stage: string;
  title: string;
  updatedAt: string;
};

type PublishedSkill = {
  id?: string;
  body: string;
  description?: string;
  instructions?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  prompt: string;
  promptTemplate?: string;
  skillId: string;
  title: string;
  updatedAt?: string;
  userId: string;
  visibility?: "private" | "public";
};

type OptimizedSkill = {
  skill_id: string;
  title: string;
  description: string;
  instructions: string;
  prompt_template: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
};

type DocsSearchEntry = {
  document: string;
  documentId: string;
  lang: LandingLocale;
  text: string;
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

const DOCS_ASSET_VERSION = "29";

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
  menuWidth?: number;
  onChange: (value: string) => void;
  options: readonly ComposerSelectOption[];
  value: string;
};

type ComposerMenuLayout = {
  left: number;
  maxHeight: number;
  placement: "bottom" | "top";
  top: number;
  width: number;
};

type ComposerPlaybookSnapshot = {
  aspectRatio: LandingProjectDraft["aspectRatio"];
  durationSeconds: LandingProjectDraft["durationSeconds"];
  hook: LandingHook;
  prompt: string;
  reviewMode: LandingProjectDraft["reviewMode"];
  skill: string;
  style: string;
};

const COMPOSER_MENU_GAP = 8;
const COMPOSER_MENU_SAFE_INSET = 12;
const COMPOSER_MENU_MAX_HEIGHT = 320;

function getComposerMenuLayout(
  trigger: HTMLButtonElement,
  optionCount: number,
  menuWidth: number,
): ComposerMenuLayout {
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const estimatedMenuHeight = Math.min(
    optionCount * 38 + 14,
    COMPOSER_MENU_MAX_HEIGHT,
  );
  const spaceBelow =
    viewportHeight -
    rect.bottom -
    COMPOSER_MENU_GAP -
    COMPOSER_MENU_SAFE_INSET;
  const spaceAbove =
    rect.top - COMPOSER_MENU_GAP - COMPOSER_MENU_SAFE_INSET;
  const placement =
    estimatedMenuHeight > spaceBelow && spaceAbove > spaceBelow
      ? "top"
      : "bottom";
  const availableHeight = placement === "top" ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(
    0,
    Math.min(estimatedMenuHeight, availableHeight),
  );
  const width = Math.min(menuWidth, viewportWidth - COMPOSER_MENU_SAFE_INSET * 2);
  const desiredLeft = rect.left + rect.width / 2 - width / 2;
  const left = Math.max(
    COMPOSER_MENU_SAFE_INSET,
    Math.min(desiredLeft, viewportWidth - width - COMPOSER_MENU_SAFE_INSET),
  );
  const top =
    placement === "bottom"
      ? rect.bottom + COMPOSER_MENU_GAP
      : Math.max(
          COMPOSER_MENU_SAFE_INSET,
          rect.top - COMPOSER_MENU_GAP - maxHeight,
        );

  return {
    left,
    maxHeight,
    placement,
    top,
    width,
  };
}

function ComposerSelect({
  className = "",
  label,
  menuWidth = 200,
  onChange,
  options,
  value,
}: ComposerSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState<ComposerMenuLayout>({
    left: COMPOSER_MENU_SAFE_INSET,
    maxHeight: COMPOSER_MENU_MAX_HEIGHT,
    placement: "bottom",
    top: COMPOSER_MENU_SAFE_INSET,
    width: menuWidth,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const visibleLabel = value === "auto" ? label : (selectedOption?.label ?? value);

  useEffect(() => {
    if (!open) return;

    const keepMenuInViewport = () => {
      if (!triggerRef.current) return;
      setMenuLayout(
        getComposerMenuLayout(triggerRef.current, options.length, menuWidth),
      );
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        !rootRef.current?.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    keepMenuInViewport();
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("resize", keepMenuInViewport);
    window.addEventListener("scroll", keepMenuInViewport, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("resize", keepMenuInViewport);
      window.removeEventListener("scroll", keepMenuInViewport, true);
    };
  }, [menuWidth, open, options.length]);

  return (
    <div className={`composer-select ${className}`.trim()} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        className="composer-select-trigger"
        onClick={(event) => {
          if (open) {
            setOpen(false);
            return;
          }
          setMenuLayout(
            getComposerMenuLayout(event.currentTarget, options.length, menuWidth),
          );
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        ref={triggerRef}
        type="button"
      >
        <span>{visibleLabel}</span>
        <ChevronDown aria-hidden="true" className="composer-select-arrow" />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
        <div
          className="composer-select-menu"
          data-placement={menuLayout.placement}
          ref={menuRef}
          role="listbox"
          style={{
            bottom: "auto",
            left: `${menuLayout.left}px`,
            maxHeight: `${menuLayout.maxHeight}px`,
            maxWidth: `${menuLayout.width}px`,
            minWidth: 0,
            position: "fixed",
            top: `${menuLayout.top}px`,
            transform: "none",
            width: `${menuLayout.width}px`,
            zIndex: 1000,
          }}
        >
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
        </div>,
        document.body,
      )
        : null}
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

function searchExcerpt(text: string, query: string): string {
  const index = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (index < 0) return text.slice(0, 120);
  const start = Math.max(0, index - 44);
  return text.slice(start, Math.min(text.length, index + 100)).trim();
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
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [activeDocument, setActiveDocument] = useState<string>(
    content.documents[0]?.path ?? "",
  );
  const [docsLocale, setDocsLocale] = useState<LandingLocale>(locale);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [previewNoticeOpen, setPreviewNoticeOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTitleDraft, setPublishTitleDraft] = useState("");
  const [publishDraft, setPublishDraft] = useState("");
  const [publishVideoFile, setPublishVideoFile] = useState<File | null>(null);
  const [publishHotError, setPublishHotError] = useState<string | null>(null);
  const [isPublishingHot, setIsPublishingHot] = useState(false);
  const [publishedHots, setPublishedHots] = useState<PublishedHot[]>([]);
  const [userVideoAssets, setUserVideoAssets] = useState<UserVideoAsset[]>([]);
  const [skillsQuery, setSkillsQuery] = useState("");
  const [publishSkillOpen, setPublishSkillOpen] = useState(false);
  const [skillIdeaDraft, setSkillIdeaDraft] = useState("");
  const [skillIdDraft, setSkillIdDraft] = useState("");
  const [skillTitleDraft, setSkillTitleDraft] = useState("");
  const [skillDescriptionDraft, setSkillDescriptionDraft] = useState("");
  const [skillInstructionsDraft, setSkillInstructionsDraft] = useState("");
  const [skillPromptDraft, setSkillPromptDraft] = useState("");
  const [skillInputSchema, setSkillInputSchema] = useState<Record<string, unknown>>({});
  const [skillOutputSchema, setSkillOutputSchema] = useState<Record<string, unknown>>({});
  const [skillPublishError, setSkillPublishError] = useState<string | null>(null);
  const [isOptimizingSkill, setIsOptimizingSkill] = useState(false);
  const [isSavingSkill, setIsSavingSkill] = useState(false);
  const [publishedSkills, setPublishedSkills] = useState<PublishedSkill[]>([]);
  const [recentConversations, setRecentConversations] = useState<
    RecentConversation[]
  >([]);
  const [workspaceFolders, setWorkspaceFolders] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [draggingConversationId, setDraggingConversationId] = useState<
    string | null
  >(null);
  const [hotsQuery, setHotsQuery] = useState("");
  const [assetQuery, setAssetQuery] = useState("");
  const [assetType, setAssetType] = useState<"video" | "skill">("video");
  const [assetDetail, setAssetDetail] = useState<AssetDetail | null>(null);
  const [docsQuery, setDocsQuery] = useState("");
  const [docsSearchIndex, setDocsSearchIndex] = useState<DocsSearchEntry[]>([]);
  const [displayCredits, setDisplayCredits] = useState(
    accountCredits === null ? "—" : String(accountCredits),
  );
  const [displayAvatar, setDisplayAvatar] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [skill, setSkill] = useState("auto");
  const [hook, setHook] = useState<LandingHook>("auto");
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | null>(null);
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
  const accountRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const playbookSnapshotRef = useRef<ComposerPlaybookSnapshot | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = content.documentTitle;
    setDocsLocale(locale);
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
    function closeMenus(event: PointerEvent) {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (!languageRef.current?.contains(event.target as Node)) {
        setLanguageOpen(false);
      }
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeMenus);
    return () => document.removeEventListener("pointerdown", closeMenus);
  }, [content.documentTitle, locale]);

  useEffect(() => {
    setNavCollapsed(
      window.localStorage.getItem("videoagent.nav-collapsed") === "1",
    );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "videoagent.nav-collapsed",
      navCollapsed ? "1" : "0",
    );
  }, [navCollapsed]);

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
            setAccountEmail(account.email);
            setDisplayAvatar(initialsFromEmail(account.email) || null);
          }
        }
      } catch {
        // Public and preview pages use the generic account icon.
      }
    }

    async function loadCredits() {
      try {
        const creditResponse = await fetch(`${accountApiBase}/credits`, {
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

    async function loadSkills() {
      try {
        const response = await fetch(`${accountApiBase}/skills`, {
          credentials: "include",
        });
        if (!active || !response.ok) return;
        const payload = (await response.json()) as {
          items?: Array<
            OptimizedSkill & {
              id: string;
              user_id: string;
              visibility: "private" | "public";
              updated_at: string;
            }
          >;
        };
        setPublishedSkills(
          (payload.items ?? []).map((item) => ({
            id: item.id,
            body: item.description,
            description: item.description,
            instructions: item.instructions,
            inputSchema: item.input_schema,
            outputSchema: item.output_schema,
            prompt: item.prompt_template,
            promptTemplate: item.prompt_template,
            skillId: item.skill_id,
            title: item.title,
            updatedAt: item.updated_at,
            userId: item.user_id,
            visibility: item.visibility,
          })),
        );
      } catch {
        // Signed-out users still see the bundled Skill catalogue.
      }
    }

    async function loadHots() {
      try {
        const response = await fetch(`${accountApiBase}/hots`, {
          credentials: "include",
        });
        if (!active || !response.ok) return;
        const payload = (await response.json()) as {
          items?: Array<{
            id: string;
            asset_id: string;
            title: string;
            prompt: string;
            skill: string;
            author: string;
            likes: number;
            is_mine: boolean;
            created_at: string;
          }>;
        };
        setPublishedHots(
          (payload.items ?? []).map((item) => ({
            id: item.id,
            assetId: item.asset_id,
            author: item.author,
            createdAt: item.created_at,
            isMine: item.is_mine,
            likes: item.likes,
            prompt: item.prompt,
            skill: item.skill,
            title: item.title,
            videoUrl: `${accountApiBase}/hots/${item.id}/video`,
          })),
        );
      } catch {
        // The bundled feed remains available while community data is offline.
      }
    }

    async function loadAssets() {
      try {
        const response = await fetch(`${accountApiBase}/assets`, {
          credentials: "include",
        });
        if (!active || !response.ok) return;
        const payload = (await response.json()) as {
          items?: Array<{
            id: string;
            filename: string;
            content_type: string;
            permission: "private" | "public";
            content_url: string;
            created_at: string;
          }>;
        };
        setUserVideoAssets(
          (payload.items ?? [])
            .filter((asset) => asset.content_type.startsWith("video/"))
            .map((asset) => ({
              id: asset.id,
              assetId: asset.id,
              contentUrl: `${accountApiBase}/assets/${asset.id}/content`,
              createdAt: asset.created_at,
              permission: asset.permission,
              title: asset.filename,
            })),
        );
      } catch {
        // Asset browsing falls back to the bundled examples.
      }
    }

    async function loadWorkspace() {
      try {
        const response = await fetch(`${accountApiBase}/workspace`, {
          credentials: "include",
        });
        if (!active || !response.ok) return;
        const payload = (await response.json()) as {
          folders?: Array<{ id: string; name: string }>;
          recents?: Array<{
            id: string;
            title: string;
            preview: string | null;
            stage: string;
            updated_at: string;
            folder_id: string | null;
          }>;
        };
        setWorkspaceFolders(payload.folders ?? []);
        setRecentConversations(
          (payload.recents ?? []).map((item) => ({
            id: item.id,
            title: item.title,
            preview: item.preview,
            stage: item.stage,
            updatedAt: item.updated_at,
            folderId: item.folder_id,
          })),
        );
      } catch {
        // Signed-out users see the empty conversation state.
      }
    }

    void loadAccount();
    void loadCredits();
    void loadSkills();
    void loadHots();
    void loadAssets();
    void loadWorkspace();
    return () => {
      active = false;
    };
  }, [accountApiBase, mode]);

  useEffect(() => {
    if (activeView !== "docs" || docsSearchIndex.length > 0) {
      return;
    }

    let active = true;
    fetch(`${docsBase}docs-search.json`)
      .then((response) => {
        if (!response.ok) throw new Error("docs-search-unavailable");
        return response.json() as Promise<DocsSearchEntry[]>;
      })
      .then((entries) => {
        if (active) setDocsSearchIndex(entries);
      })
      .catch(() => {
        // Search remains unavailable while the docs index cannot be loaded.
      });

    return () => {
      active = false;
    };
  }, [activeView, docsBase, docsSearchIndex.length]);

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
    const textarea = promptRef.current;
    if (!textarea) return;

    const resizePrompt = () => {
      const minimumHeight = 64;
      const maximumHeight = 280;
      textarea.style.height = "auto";
      const nextHeight = Math.min(
        Math.max(textarea.scrollHeight, minimumHeight),
        maximumHeight,
      );
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY =
        textarea.scrollHeight > maximumHeight ? "auto" : "hidden";
    };

    resizePrompt();
    window.addEventListener("resize", resizePrompt);
    return () => window.removeEventListener("resize", resizePrompt);
  }, [prompt]);

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

  useEffect(() => {
    if (!publishSkillOpen) return;

    function closeSkillPublisher(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPublishSkillOpen(false);
      }
    }

    document.addEventListener("keydown", closeSkillPublisher);
    return () => document.removeEventListener("keydown", closeSkillPublisher);
  }, [publishSkillOpen]);

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
        skill,
        hook,
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
    setSelectedPlaybook(null);
    playbookSnapshotRef.current = null;
    setActiveView("agents");
    window.history.replaceState(null, "", "#agents");
    window.setTimeout(() => promptRef.current?.focus(), 250);
  }

  function useSkill(skillId: string, value: string) {
    setSkill(skillId);
    usePrompt(value);
  }

  function clearPlaybookSelection() {
    setSelectedPlaybook(null);
    playbookSnapshotRef.current = null;
  }

  function applyPlaybook(playbook: LandingPlaybook) {
    if (selectedPlaybook === playbook.id) {
      const snapshot = playbookSnapshotRef.current;
      if (snapshot) {
        setPrompt(snapshot.prompt);
        setSkill(snapshot.skill);
        setHook(snapshot.hook);
        setStyle(snapshot.style);
        setAspectRatio(snapshot.aspectRatio);
        setDurationSeconds(snapshot.durationSeconds);
        setReviewMode(snapshot.reviewMode);
      }
      setSelectedPlaybook(null);
      playbookSnapshotRef.current = null;
      promptRef.current?.focus();
      return;
    }

    playbookSnapshotRef.current = {
      aspectRatio,
      durationSeconds,
      hook,
      prompt,
      reviewMode,
      skill,
      style,
    };
    setPrompt(playbook.prompt);
    setSkill(playbook.skill);
    setStyle(playbook.style);
    setAspectRatio(playbook.aspectRatio);
    setDurationSeconds(
      playbook.durationSeconds === "auto"
        ? "auto"
        : (Number(playbook.durationSeconds) as LandingProjectDraft["durationSeconds"]),
    );
    setHook(playbook.hook);
    setReviewMode(playbook.reviewMode);
    setSelectedPlaybook(playbook.id);
    promptRef.current?.focus();
  }

  function openPublisher() {
    if (mode === "project") {
      setPreviewNoticeOpen(true);
      return;
    }
    setPublishTitleDraft("");
    setPublishDraft("");
    setPublishVideoFile(null);
    setPublishHotError(null);
    setPublishOpen(true);
  }

  async function publishHot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "project" || !accountApiBase) {
      setPreviewNoticeOpen(true);
      return;
    }
    const value = publishDraft.trim();
    const title =
      publishTitleDraft.trim() ||
      (value.length > 42 ? `${value.slice(0, 42)}…` : value);
    if (!title || !value || !publishVideoFile) {
      setPublishHotError(content.hots.publishError);
      return;
    }
    setPublishHotError(null);
    setIsPublishingHot(true);
    const body = new FormData();
    body.append("file", publishVideoFile);
    body.append("title", title);
    body.append("prompt", value);
    body.append("skill", skill);
    try {
      const response = await fetch(`${accountApiBase}/hots`, {
        method: "POST",
        credentials: "include",
        body,
      });
      if (!response.ok) {
        setPublishHotError(content.hots.publishError);
        return;
      }
      const saved = (await response.json()) as {
        id: string;
        asset_id: string;
        title: string;
        prompt: string;
        skill: string;
        author: string;
        likes: number;
        is_mine: boolean;
        created_at: string;
      };
      setPublishedHots((current) => [
        {
          id: saved.id,
          assetId: saved.asset_id,
          author: saved.author,
          createdAt: saved.created_at,
          isMine: saved.is_mine,
          likes: saved.likes,
          prompt: saved.prompt,
          skill: saved.skill,
          title: saved.title,
          videoUrl: `${accountApiBase}/hots/${saved.id}/video`,
        },
        ...current,
      ]);
      setUserVideoAssets((current) => [
        {
          id: saved.asset_id,
          assetId: saved.asset_id,
          contentUrl: `${accountApiBase}/hots/${saved.id}/video`,
          createdAt: saved.created_at,
          permission: "public",
          title: saved.title,
        },
        ...current,
      ]);
      setPublishOpen(false);
    } catch {
      setPublishHotError(content.hots.publishError);
    } finally {
      setIsPublishingHot(false);
    }
  }

  function resetSkillStudio(idea = "") {
    setSkillPublishError(null);
    setSkillIdeaDraft(idea);
    setSkillIdDraft("");
    setSkillTitleDraft("");
    setSkillDescriptionDraft("");
    setSkillInstructionsDraft("");
    setSkillPromptDraft("");
    setSkillInputSchema({});
    setSkillOutputSchema({});
  }

  function openSkillPublisher() {
    if (mode === "project") {
      setPreviewNoticeOpen(true);
      return;
    }
    resetSkillStudio();
    setPublishSkillOpen(true);
  }

  function openSkillSynthesis() {
    if (mode === "project") {
      setPreviewNoticeOpen(true);
      return;
    }
    resetSkillStudio("A reusable video skill that ");
    setPublishSkillOpen(true);
  }

  async function optimizeSkillDraft() {
    if (mode === "project" || !accountApiBase) {
      setPreviewNoticeOpen(true);
      return;
    }
    const idea = (skillIdeaDraft || skillDescriptionDraft || skillInstructionsDraft).trim();
    if (!idea) {
      setSkillPublishError(content.skills.skillPublishError);
      return;
    }
    setSkillPublishError(null);
    setIsOptimizingSkill(true);
    try {
      const response = await fetch(`${accountApiBase}/skills/optimize`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          title: skillTitleDraft || undefined,
          description: skillDescriptionDraft || undefined,
          instructions: skillInstructionsDraft || undefined,
          locale: docsLocale,
        }),
      });
      if (!response.ok) {
        setSkillPublishError(content.skills.skillPublishError);
        return;
      }
      const draft = (await response.json()) as OptimizedSkill;
      setSkillIdDraft(draft.skill_id);
      setSkillTitleDraft(draft.title);
      setSkillDescriptionDraft(draft.description);
      setSkillInstructionsDraft(draft.instructions);
      setSkillPromptDraft(draft.prompt_template);
      setSkillInputSchema(draft.input_schema);
      setSkillOutputSchema(draft.output_schema);
    } catch {
      setSkillPublishError(content.skills.skillPublishError);
    } finally {
      setIsOptimizingSkill(false);
    }
  }

  async function publishSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "project" || !accountApiBase) {
      setPreviewNoticeOpen(true);
      return;
    }
    const description = skillDescriptionDraft.trim();
    const normalizedSkillId = skillIdDraft
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const title = skillTitleDraft.trim();
    const instructions = skillInstructionsDraft.trim();
    const promptTemplate = skillPromptDraft.trim();
    if (!normalizedSkillId || !title || !description || !instructions || !promptTemplate) {
      setSkillPublishError(content.skills.skillPublishError);
      return;
    }
    setSkillPublishError(null);
    setIsSavingSkill(true);
    try {
      const response = await fetch(`${accountApiBase}/skills`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill_id: normalizedSkillId,
          title,
          description,
          instructions,
          prompt_template: promptTemplate,
          input_schema: skillInputSchema,
          output_schema: skillOutputSchema,
          visibility: "public",
        }),
      });
      if (!response.ok) {
        setSkillPublishError(content.skills.skillPublishError);
        return;
      }
      const saved = (await response.json()) as OptimizedSkill & {
        id: string;
        user_id: string;
        visibility: "private" | "public";
        updated_at: string;
      };
      setPublishedSkills((current) => [
        {
          id: saved.id,
          body: saved.description,
          description: saved.description,
          instructions: saved.instructions,
          inputSchema: saved.input_schema,
          outputSchema: saved.output_schema,
          prompt: saved.prompt_template,
          promptTemplate: saved.prompt_template,
          skillId: saved.skill_id,
          title: saved.title,
          updatedAt: saved.updated_at,
          userId: saved.user_id,
          visibility: saved.visibility,
        },
        ...current,
      ]);
      setPublishSkillOpen(false);
    } catch {
      setSkillPublishError(content.skills.skillPublishError);
    } finally {
      setIsSavingSkill(false);
    }
  }

  function openView(view: LandingView) {
    setActiveView(view);
    window.history.replaceState(null, "", `#${view}`);
  }

  async function moveConversation(projectId: string, folderId: string | null) {
    if (!accountApiBase) return;
    const response = await fetch(
      `${accountApiBase}/workspace/threads/${projectId}/folder`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId }),
      },
    ).catch(() => null);
    if (!response?.ok) return;
    setRecentConversations((current) =>
      current.map((conversation) =>
        conversation.id === projectId
          ? { ...conversation, folderId }
          : conversation,
      ),
    );
    setDraggingConversationId(null);
  }

  function selectDocsLocale(nextLocale: LandingLocale) {
    setDocsLocale(nextLocale);
    setDocsQuery("");
    setLanguageOpen(false);
  }

  async function signOut() {
    setAccountMenuOpen(false);
    if (mode === "project" || !accountApiBase) {
      setPreviewNoticeOpen(true);
      return;
    }

    try {
      const response = await fetch(`${accountApiBase}/auth/logout`, {
        credentials: "include",
        method: "POST",
      });
      if (!response.ok) return;
      setAccountEmail(null);
      setDisplayAvatar(null);
    } catch {
      // Keep the current session when logout cannot be confirmed.
    }
  }

  function openDocsResult(entry: DocsSearchEntry) {
    setActiveDocument(entry.document);
    setDocsLocale(entry.lang);
    setDocsQuery("");
  }

  const activeDocumentSource =
    docsLocale === "zh-CN"
      ? activeDocument.replace(/\.html$/, ".zh.html")
      : activeDocument;
  const normalizedSkillsQuery = skillsQuery.trim().toLowerCase();
  const visibleSkills = [...publishedSkills, ...content.skills.items].filter(
    (item) =>
      !normalizedSkillsQuery ||
      `${item.userId}/${item.skillId} ${item.title} ${item.body}`
        .toLowerCase()
        .includes(normalizedSkillsQuery),
  );
  const normalizedHotsQuery = hotsQuery.trim().toLowerCase();
  const visibleHots: PublishedHot[] = [
    ...publishedHots,
    ...content.hots.items.map((item) => ({ ...item })),
  ].filter(
    (item) =>
      !normalizedHotsQuery ||
      `${item.title} ${item.author} ${item.prompt}`
        .toLowerCase()
        .includes(normalizedHotsQuery),
  );
  const normalizedAssetQuery = assetQuery.trim().toLowerCase();
  const hotAssetIds = new Set(
    publishedHots
      .filter((item) => item.isMine && item.assetId)
      .map((item) => item.assetId),
  );
  const ownedAssets: AssetView[] = accountEmail
    ? [
        ...publishedHots
          .filter((item) => item.isMine)
          .map((item) => ({
            id: item.id,
            title: item.title,
            type: "video" as const,
            permission: "public" as const,
            editedAt: (item.createdAt ?? new Date().toISOString()).slice(0, 10),
            videoUrl: item.videoUrl,
            prompt: item.prompt,
            author: item.author,
            likes: item.likes,
          })),
        ...userVideoAssets
          .filter((asset) => !hotAssetIds.has(asset.assetId))
          .map((asset) => ({
            id: asset.id,
            title: asset.title,
            type: "video" as const,
            permission: asset.permission,
            editedAt: asset.createdAt.slice(0, 10),
            videoUrl: asset.contentUrl,
            prompt: "",
            author: content.hots.you,
            likes: 0,
          })),
        ...publishedSkills.map((item) => ({
          id: item.id,
          title: item.title,
          type: "skill" as const,
          permission: item.visibility ?? "private",
          editedAt: item.updatedAt?.slice(0, 10) ?? "—",
          videoUrl: undefined,
          prompt: item.prompt,
          author: item.userId,
          likes: 0,
          body: item.body,
          instructions: item.instructions,
        })),
      ]
    : content.assets.items.map((item) => ({
        ...item,
        videoUrl: undefined,
        prompt: "",
        author: content.hots.you,
        likes: 0,
        body: "",
        instructions: undefined,
      }));
  const visibleAssets = ownedAssets.filter(
    (asset) =>
      asset.type === assetType &&
      (!normalizedAssetQuery ||
        `${asset.title} ${asset.permission} ${asset.prompt ?? ""}`
          .toLowerCase()
          .includes(normalizedAssetQuery)),
  );
  const normalizedDocsQuery = docsQuery.trim().toLowerCase();
  const docsSearchResults = normalizedDocsQuery
    ? docsSearchIndex
        .filter((entry) =>
          `${entry.title} ${entry.text}`.toLowerCase().includes(normalizedDocsQuery),
        )
        .slice(0, 8)
    : [];

  return (
    <main
      className={`va-landing${mode === "app" ? " app-mode" : ""}${
        navCollapsed ? " nav-collapsed" : ""
      }`}
    >
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
            aria-current={activeView === "hots" ? "page" : undefined}
            onClick={() => openView("hots")}
            type="button"
          >
            <Flame aria-hidden="true" className="nav-icon" />
            <span>{content.nav.hots}</span>
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
            aria-current={activeView === "docs" ? "page" : undefined}
            onClick={() => openView("docs")}
            type="button"
          >
            <FileText aria-hidden="true" className="nav-icon" />
            <span>{content.nav.docs}</span>
          </button>
        </nav>
        {mode === "app" && accountEmail ? (
          <div className="sidebar-history">
            <details className="sidebar-history-section" open>
              <summary className="sidebar-history-heading">
                <span>{content.nav.projects}</span>
              </summary>
              <div className="sidebar-project-list">
                {workspaceFolders.map((folder) => {
                  const threads = recentConversations.filter(
                    (item) => item.folderId === folder.id,
                  );
                  return (
                    <details
                      key={folder.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const projectId =
                          event.dataTransfer.getData("text/plain") ||
                          draggingConversationId;
                        if (projectId) {
                          void moveConversation(projectId, folder.id);
                        }
                      }}
                      open
                    >
                      <summary>
                        <span>{folder.name}</span>
                      </summary>
                      {threads.map((thread) => (
                        <a
                          className="sidebar-thread"
                          draggable
                          href={`/${locale}/projects/${thread.id}`}
                          key={thread.id}
                          onDragStart={(event) => {
                            setDraggingConversationId(thread.id);
                            event.dataTransfer.setData("text/plain", thread.id);
                          }}
                        >
                          {thread.title}
                        </a>
                      ))}
                    </details>
                  );
                })}
              </div>
            </details>
            <details
              className="sidebar-history-section"
              open
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const projectId =
                  event.dataTransfer.getData("text/plain") ||
                  draggingConversationId;
                if (projectId) void moveConversation(projectId, null);
              }}
            >
              <summary className="sidebar-history-heading">
                <span>{content.nav.recents}</span>
              </summary>
              <div className="sidebar-recent-list">
                {recentConversations.map((thread) => (
                  <a
                    className="sidebar-thread"
                    draggable
                    href={`/${locale}/projects/${thread.id}`}
                    key={thread.id}
                    onDragStart={(event) => {
                      setDraggingConversationId(thread.id);
                      event.dataTransfer.setData("text/plain", thread.id);
                    }}
                  >
                    {thread.title}
                  </a>
                ))}
              </div>
            </details>
          </div>
        ) : null}
        {mode === "app" ? (
          <button
            aria-label={
              navCollapsed ? content.nav.expandNav : content.nav.collapseNav
            }
            className="nav-collapse-toggle"
            onClick={() => setNavCollapsed((current) => !current)}
            type="button"
          >
            {navCollapsed ? (
              <PanelLeftOpen aria-hidden="true" />
            ) : (
              <PanelLeftClose aria-hidden="true" />
            )}
          </button>
        ) : null}
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
          <div className="account-switcher" ref={accountRef}>
            <button
              aria-expanded={accountMenuOpen}
              aria-label={content.nav.account}
              className={`account-avatar${displayAvatar ? "" : " account-avatar-default"}`}
              onClick={() => setAccountMenuOpen((current) => !current)}
              title={content.nav.account}
              type="button"
            >
              {displayAvatar ?? <UserRound className="avatar-placeholder" />}
            </button>
            <div className="account-menu" hidden={!accountMenuOpen}>
              {accountEmail ? (
                <>
                  <span className="account-email">{accountEmail}</span>
                  <button onClick={() => void signOut()} type="button">
                    {content.nav.signOut}
                  </button>
                </>
              ) : mode === "app" ? (
                <>
                  <a href={`/${locale}/login`} onClick={() => setAccountMenuOpen(false)}>
                    {content.nav.logIn}
                  </a>
                  <a href={`/${locale}/register`} onClick={() => setAccountMenuOpen(false)}>
                    {content.nav.register}
                  </a>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setPreviewNoticeOpen(true);
                    }}
                    type="button"
                  >
                    {content.nav.logIn}
                  </button>
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setPreviewNoticeOpen(true);
                    }}
                    type="button"
                  >
                    {content.nav.register}
                  </button>
                </>
              )}
            </div>
          </div>
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
              onChange={(event) => {
                setPrompt(event.target.value);
                setSelectedPlaybook(null);
                playbookSnapshotRef.current = null;
              }}
              placeholder={content.composer.placeholder}
              ref={promptRef}
              rows={1}
              value={prompt}
            />
            {!prompt.trim() ? (
              <div className="idea-row">
                <div>
                  {content.composer.examples.map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setPrompt(example);
                        setSelectedPlaybook(null);
                        playbookSnapshotRef.current = null;
                        promptRef.current?.focus();
                      }}
                      type="button"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div
              aria-label={content.composer.playbooksLabel}
              className="playbook-row"
            >
              {content.composer.playbooks.map((playbook) => (
                <button
                  aria-pressed={selectedPlaybook === playbook.id}
                  key={playbook.id}
                  onClick={() => applyPlaybook(playbook)}
                  type="button"
                >
                  {playbook.label}
                </button>
              ))}
            </div>
            <div className="composer-controls" aria-label={content.composer.settingsLabel}>
              <ComposerSelect
                className="composer-select-skill"
                label={content.composer.skillLabel}
                menuWidth={300}
                onChange={(value) => {
                  setSkill(value);
                  clearPlaybookSelection();
                }}
                options={[
                  { label: "Auto", value: "auto" },
                  ...[...publishedSkills, ...content.skills.items].map((item) => ({
                    label: `${item.userId}/${item.skillId}`,
                    value: item.skillId,
                  })),
                ]}
                value={skill}
              />
              <ComposerSelect
                label={content.composer.hookLabel}
                menuWidth={220}
                onChange={(value) => {
                  setHook(value as LandingHook);
                  clearPlaybookSelection();
                }}
                options={content.composer.hookOptions.map((option) => ({
                  label: option.label,
                  value: option.id,
                }))}
                value={hook}
              />
              <ComposerSelect
                label={content.composer.styleLabel}
                menuWidth={190}
                onChange={(value) => {
                  setStyle(value);
                  clearPlaybookSelection();
                }}
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
                menuWidth={170}
                onChange={(value) => {
                  setAspectRatio(value as LandingProjectDraft["aspectRatio"]);
                  clearPlaybookSelection();
                }}
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
                menuWidth={170}
                onChange={(value) => {
                  setDurationSeconds(
                    value === "auto"
                      ? "auto"
                      : (Number(value) as LandingProjectDraft["durationSeconds"]),
                  );
                  clearPlaybookSelection();
                }}
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
                menuWidth={340}
                onChange={setModel}
                options={[
                  { label: "Auto", value: "auto" },
                  ...content.composer.models
                    .filter((option) => option.id !== "auto")
                    .map((option) => ({
                      label: option.label,
                      value: option.id,
                    })),
                ]}
                value={model}
              />
              <ComposerSelect
                label={content.composer.resolutionLabel}
                menuWidth={180}
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
                menuWidth={180}
                onChange={(value) => setAudio(value as LandingProjectDraft["audio"])}
                options={content.composer.audioOptions.map((option) => ({
                  label: option.label,
                  value: option.id,
                }))}
                value={audio}
              />
              <ComposerSelect
                label={content.composer.reviewLabel}
                menuWidth={210}
                onChange={(value) => {
                  setReviewMode(value as LandingProjectDraft["reviewMode"])
                  clearPlaybookSelection();
                }}
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
        <div className="view-toolbar">
          <label className="view-search">
            <Search aria-hidden="true" />
            <input
              aria-label={content.skills.searchPlaceholder}
              onChange={(event) => setSkillsQuery(event.target.value)}
              placeholder={content.skills.searchPlaceholder}
              type="search"
              value={skillsQuery}
            />
          </label>
        </div>
        <div className="feature-grid skill-grid">
          <button
            className="feature-card skill-card skill-publish-card"
            onClick={openSkillPublisher}
            type="button"
          >
            <Play aria-hidden="true" className="skill-publish-icon" />
            <span>{content.skills.publish}</span>
          </button>
          {visibleSkills.map((item) => (
            <button
              className="feature-card skill-card"
              key={`${item.userId}/${item.skillId}`}
              onClick={() =>
                item.userId === "video_agent" && item.skillId === "skill_synthesis"
                  ? openSkillSynthesis()
                  : useSkill(item.skillId, item.prompt)
              }
              type="button"
            >
              <span className="skill-code">
                {item.userId}/{item.skillId}
              </span>
              <span className="skill-card-copy">
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </span>
              <i aria-hidden="true">↗</i>
            </button>
          ))}
        </div>
        {visibleSkills.length === 0 ? (
          <p className="view-empty">{content.skills.noResults}</p>
        ) : null}
      </section>
      ) : null}

      {activeView === "assets" ? (
      <section className="section feature-section" id="assets">
        <div className="view-toolbar asset-toolbar">
          <label className="view-search">
            <Search aria-hidden="true" />
            <input
              aria-label={content.assets.searchPlaceholder}
              onChange={(event) => setAssetQuery(event.target.value)}
              placeholder={content.assets.searchPlaceholder}
              type="search"
              value={assetQuery}
            />
          </label>
          <div className="docs-tabs asset-tabs" role="tablist">
            <button
              aria-selected={assetType === "video"}
              onClick={() => setAssetType("video")}
              role="tab"
              type="button"
            >
              <Video aria-hidden="true" className="docs-tab-icon" />
              {content.assets.tabs.video}
            </button>
            <button
              aria-selected={assetType === "skill"}
              onClick={() => setAssetType("skill")}
              role="tab"
              type="button"
            >
              <Clapperboard aria-hidden="true" className="docs-tab-icon" />
              {content.assets.tabs.skill}
            </button>
          </div>
        </div>
        <div className="asset-stream">
          {visibleAssets.map((asset, index) => (
            <button
              aria-label={`View ${asset.title}`}
              className={`asset-card asset-card-${asset.type}`}
              key={asset.id ?? asset.title}
              onClick={() =>
                setAssetDetail({
                  title: asset.title,
                  type: asset.type,
                  permission: asset.permission,
                  editedAt: asset.editedAt,
                  videoUrl: asset.videoUrl,
                  prompt: asset.prompt,
                  author: asset.author,
                  likes: asset.likes,
                  body: asset.body,
                  instructions: asset.instructions,
                })
              }
              type="button"
            >
              {asset.type === "video" ? (
                <div className="asset-media">
                  <video
                    aria-label={`${asset.title} preview`}
                    loop
                    muted
                    onMouseEnter={(event) => {
                      void event.currentTarget.play().catch(() => {
                        // Preview playback can be blocked by browser policy.
                      });
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.pause();
                      event.currentTarget.currentTime = 0;
                    }}
                    playsInline
                    poster={
                      videos[
                        asset.imageIndex ?? index % videos.length
                      ].poster
                    }
                    preload="metadata"
                  >
                    <source
                      src={
                        asset.videoUrl ??
                        videos[asset.imageIndex ?? index % videos.length].src
                      }
                      type="video/mp4"
                    />
                  </video>
                </div>
              ) : null}
              <div className="asset-info">
                <div className="asset-title-row">
                  <h2>{asset.title}</h2>
                </div>
                <div className="asset-meta">
                  <span className="asset-permission">{asset.permission}</span>
                  <time dateTime={asset.editedAt}>{asset.editedAt}</time>
                </div>
              </div>
            </button>
          ))}
        </div>
        {visibleAssets.length === 0 ? (
          <p className="view-empty">{content.assets.noResults}</p>
        ) : null}
      </section>
      ) : null}

      {activeView === "hots" ? (
      <section className="section hots-section" id="hots">
        <div className="view-toolbar">
          <label className="view-search">
            <Search aria-hidden="true" />
            <input
              aria-label={content.hots.searchPlaceholder}
              onChange={(event) => setHotsQuery(event.target.value)}
              placeholder={content.hots.searchPlaceholder}
              type="search"
              value={hotsQuery}
            />
          </label>
        </div>
        <div className="community-stream">
          <button
            className="community-card community-publish-card"
            onClick={openPublisher}
            type="button"
          >
            <Play aria-hidden="true" className="community-publish-icon" />
            <span>{content.hots.publish}</span>
          </button>
          {visibleHots.map((item, index) => (
            <button
              className={`community-card community-card-${(index % 5) + 1}`}
              key={`${item.author}-${item.title}-${index}`}
              onClick={() =>
                item.id
                  ? setAssetDetail({
                      author: item.author,
                      editedAt: (item.createdAt ?? new Date().toISOString()).slice(0, 10),
                      likes: item.likes,
                      permission: "public",
                      prompt: item.prompt,
                      title: item.title,
                      type: "video",
                      videoUrl:
                        item.videoUrl ?? videos[index % videos.length].src,
                    })
                  : useSkill(item.skill, item.prompt)
              }
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
                <source
                  src={item.videoUrl ?? videos[index % videos.length].src}
                  type="video/mp4"
                />
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
        {visibleHots.length === 0 ? (
          <p className="view-empty">{content.hots.noResults}</p>
        ) : null}
      </section>
      ) : null}

      {activeView === "docs" ? (
        <section className="docs-view" id="docs">
          <div className="docs-search-wrap">
            <label className="view-search docs-search">
              <Search aria-hidden="true" />
              <input
                aria-label="Search docs"
                onChange={(event) => setDocsQuery(event.target.value)}
                placeholder="Search docs"
                type="search"
                value={docsQuery}
              />
            </label>
            {docsQuery.trim() ? (
              <div className="docs-search-results" role="list">
                {docsSearchResults.length > 0 ? (
                  docsSearchResults.map((entry) => (
                    <button
                      key={`${entry.document}-${entry.lang}`}
                      onClick={() => openDocsResult(entry)}
                      type="button"
                    >
                      <span>{entry.title}</span>
                      <small>
                        {entry.lang === "zh-CN" ? "中文" : "English"} ·{" "}
                        {searchExcerpt(entry.text, docsQuery)}
                      </small>
                    </button>
                  ))
                ) : (
                  <p>No matching documents</p>
                )}
              </div>
            ) : null}
          </div>
          <div aria-label={content.nav.docs} className="docs-tabs" role="tablist">
            {content.documents.map((document) => (
              <button
                aria-selected={activeDocument === document.path}
                key={document.path}
                onClick={() => {
                  setActiveDocument(document.path);
                  setDocsQuery("");
                }}
                role="tab"
                type="button"
              >
                <FileText aria-hidden="true" className="docs-tab-icon" />
                {docsLocale === "zh-CN" ? document.labelZh : document.label}
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

      {assetDetail ? (
        <div
          className="preview-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setAssetDetail(null);
          }}
        >
          <article
            aria-labelledby="asset-detail-title"
            aria-modal="true"
            className="preview-dialog asset-detail-dialog"
            role="dialog"
          >
            <button
              aria-label={content.assets.closeDetails}
              className="preview-close"
              onClick={() => setAssetDetail(null)}
              type="button"
            >
              ×
            </button>
            <p className="preview-eyebrow">
              {content.assets.details} · {assetDetail.permission}
            </p>
            <h2 id="asset-detail-title">{assetDetail.title}</h2>
            {assetDetail.videoUrl ? (
              <video
                autoPlay
                className="asset-detail-video"
                controls
                loop
                muted
                playsInline
                src={assetDetail.videoUrl}
              />
            ) : null}
            <div className="asset-detail-meta">
              {assetDetail.author ? (
                <span>
                  {content.assets.authorLabel}: {assetDetail.author}
                </span>
              ) : null}
              {assetDetail.likes != null ? (
                <span>
                  {content.assets.likesLabel}: {assetDetail.likes}
                </span>
              ) : null}
              <time dateTime={assetDetail.editedAt}>{assetDetail.editedAt}</time>
            </div>
            {assetDetail.prompt ? (
              <section>
                <h3>{content.assets.promptLabel}</h3>
                <p>{assetDetail.prompt}</p>
              </section>
            ) : null}
            {assetDetail.body ? (
              <section>
                <h3>{content.assets.details}</h3>
                <p>{assetDetail.body}</p>
              </section>
            ) : null}
            {assetDetail.instructions ? (
              <section>
                <h3>{content.assets.instructionsLabel}</h3>
                <pre>{assetDetail.instructions}</pre>
              </section>
            ) : null}
          </article>
        </div>
      ) : null}

      {publishSkillOpen ? (
        <div
          className="preview-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setPublishSkillOpen(false);
            }
          }}
        >
          <form
            aria-labelledby="publish-skill-title"
            aria-modal="true"
            className="preview-dialog publish-dialog skill-publish-dialog"
            onSubmit={publishSkill}
            role="dialog"
          >
            <button
              aria-label={content.skills.close}
              className="preview-close"
              onClick={() => setPublishSkillOpen(false)}
              type="button"
            >
              ×
            </button>
            <p className="preview-eyebrow">Skills</p>
            <h2 id="publish-skill-title">{content.skills.publishTitle}</h2>
            <label>
              <span>{content.skills.skillIdeaLabel}</span>
              <textarea
                onChange={(event) => setSkillIdeaDraft(event.target.value)}
                placeholder={content.skills.skillDescriptionLabel}
                value={skillIdeaDraft}
              />
            </label>
            <div className="skill-optimize-row">
              <span>
                {content.skills.useSkillSynthesis}: video_agent/skill_synthesis
              </span>
              <button
                className="skill-optimize-action"
                disabled={!skillIdeaDraft.trim() || isOptimizingSkill}
                onClick={() => void optimizeSkillDraft()}
                type="button"
              >
                <Sparkles aria-hidden="true" />
                {isOptimizingSkill
                  ? content.skills.optimizing
                  : content.skills.optimizeWithAi}
              </button>
            </div>
            <label>
              <span>{content.skills.skillIdLabel}</span>
              <input
                onChange={(event) => setSkillIdDraft(event.target.value)}
                placeholder="my_skill"
                value={skillIdDraft}
              />
            </label>
            <label>
              <span>{content.skills.skillTitleLabel}</span>
              <input
                onChange={(event) => setSkillTitleDraft(event.target.value)}
                placeholder="Editorial product film"
                value={skillTitleDraft}
              />
            </label>
            <label>
              <span>{content.skills.skillDescriptionLabel}</span>
              <textarea
                onChange={(event) => setSkillDescriptionDraft(event.target.value)}
                value={skillDescriptionDraft}
              />
            </label>
            <label>
              <span>{content.skills.skillInstructionsLabel}</span>
              <textarea
                className="skill-instructions-input"
                onChange={(event) => setSkillInstructionsDraft(event.target.value)}
                value={skillInstructionsDraft}
              />
            </label>
            <label>
              <span>{content.skills.skillPromptLabel}</span>
              <textarea
                onChange={(event) => setSkillPromptDraft(event.target.value)}
                value={skillPromptDraft}
              />
            </label>
            {skillPublishError ? (
              <p aria-live="polite" className="skill-publish-error">
                {skillPublishError}
              </p>
            ) : null}
            <div className="publish-actions">
              <button
                className="publish-cancel"
                onClick={() => setPublishSkillOpen(false)}
                type="button"
              >
                {content.skills.cancel}
              </button>
              <button
                className="primary-action"
                disabled={
                  isSavingSkill ||
                  !skillIdDraft.trim() ||
                  !skillTitleDraft.trim() ||
                  !skillDescriptionDraft.trim() ||
                  !skillInstructionsDraft.trim() ||
                  !skillPromptDraft.trim()
                }
                type="submit"
              >
                {isSavingSkill ? content.skills.savingSkill : content.skills.publish}
              </button>
            </div>
          </form>
        </div>
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
            <label className="hots-publish-field">
              <span>{content.hots.titleLabel}</span>
              <input
                maxLength={200}
                onChange={(event) => setPublishTitleDraft(event.target.value)}
                value={publishTitleDraft}
              />
            </label>
            <textarea
              aria-label={content.hots.publishPlaceholder}
              onChange={(event) => setPublishDraft(event.target.value)}
              placeholder={content.hots.publishPlaceholder}
              value={publishDraft}
            />
            <label className="hots-video-picker">
              <Upload aria-hidden="true" />
              <span>{content.hots.videoLabel}</span>
              <strong>{publishVideoFile?.name ?? "MP4"}</strong>
              <input
                accept="video/mp4"
                onChange={(event) => {
                  setPublishVideoFile(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
                type="file"
              />
            </label>
            {publishHotError ? (
              <p aria-live="polite" className="skill-publish-error">
                {publishHotError}
              </p>
            ) : null}
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
                disabled={
                  isPublishingHot ||
                  !publishVideoFile ||
                  !publishDraft.trim() ||
                  (!publishTitleDraft.trim() && !publishDraft.trim())
                }
                type="submit"
              >
                {isPublishingHot ? content.hots.publishing : content.hots.publishAction}
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
