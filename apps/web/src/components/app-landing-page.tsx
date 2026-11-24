"use client";

import "@/demo/mock-api";
import { useEffect } from "react";

import {
  LandingPage,
  landingContent,
  type LandingLocale,
  type LandingProjectDraft,
} from "@videoagent/landing";
import "@videoagent/landing/styles.css";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ProjectWorkspace } from "@/components/project-workspace";

type Project = {
  id: string;
};

const base = process.env.NEXT_PUBLIC_DEMO_STATIC === "1" ? "/VideoAgent" : "";
const videos = [
  {
    src: `${base}/media/vlog-hero.mp4`,
    poster: `${base}/media/vlog-hero-poster.jpg`,
  },
  {
    src: `${base}/media/vlog-hero-european.mp4`,
    poster: `${base}/media/vlog-hero-european-poster.jpg`,
  },
  {
    src: `${base}/media/vlog-hero-black.mp4`,
    poster: `${base}/media/vlog-hero-black-poster.jpg`,
  },
] as const;

export function AppLandingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as LandingLocale;
  const content = landingContent[locale];

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_STATIC !== "1") return;
    if (!window.location.hash) {
      window.location.hash = "conversation/demo-project";
    }
  }, []);

  async function createProject(draft: LandingProjectDraft) {
    const title =
      draft.prompt.split(/\r?\n/, 1)[0]?.trim().slice(0, 72) ||
      (locale === "zh-CN" ? "未命名视频项目" : "Untitled video project");
    const style =
      content.composer.styles.find((option) => option.id === draft.style)?.label ??
      draft.style;
    const model = content.composer.models.find(
      (option) => option.id === draft.model,
    );
    const modelLabel = model
      ? model.label
      : draft.model;
    const settings =
      `Production settings: ${draft.skill} · Hook ${draft.hook} · ${style} · ` +
      `${draft.aspectRatio} · ` +
      `${draft.durationSeconds}s · ${modelLabel} · ${draft.resolution} · ` +
      `Audio ${draft.audio} · Review ${draft.reviewMode}`;
    const response = await fetch("/api/account/projects", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        brief: `${draft.prompt}\n\n${settings}`,
      }),
    });

    if (response.status === 401) {
      router.push("/login");
      return;
    }
    if (!response.ok) {
      throw new Error("project-create-failed");
    }
    const project = (await response.json()) as Project;
    window.location.hash = `conversation/${project.id}?start=1`;
  }

  return (
    <>
      <LandingPage
      accountApiBase={process.env.NEXT_PUBLIC_DEMO_STATIC === "1" ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/account") : "/api/account"}
      docsBase={process.env.NEXT_PUBLIC_DEMO_STATIC === "1" ? "/VideoAgent/docs/" : "/docs/"}
      locale={locale}
      mode="app"
      onCreateProject={createProject}
      onLocaleChange={(nextLocale) =>
        router.replace(`${pathname}${window.location.hash}`, {
          locale: nextLocale,
        })
      }
      renderConversation={(projectId) => (
        <ProjectWorkspace
          embedded
          key={projectId}
          projectId={projectId}
        />
      )}
        videos={videos}
      />
      <a
        className="fixed bottom-5 right-5 z-50 rounded-full border border-emerald-400/30 bg-[#0d1a12]/90 px-4 py-2 text-[12px] font-medium text-emerald-200 shadow-lg backdrop-blur hover:border-emerald-300/60"
        href={`/${locale}/demo`}
      >
        {locale.startsWith("zh") ? "只读示例" : "Read-only demo"}
      </a>
    </>
  );
}
