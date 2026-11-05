"use client";

import {
  LandingPage,
  landingContent,
  type LandingProjectDraft,
} from "@videoagent/landing";
import "@videoagent/landing/styles.css";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ProjectWorkspace } from "@/components/project-workspace";

type Project = {
  id: string;
};

const videos = [
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
] as const;

export function AppLandingPage() {
  const router = useRouter();
  const content = landingContent.en;
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    const syncConversation = () => {
      const match = window.location.hash.match(/^#conversation\/([^?]+)/);
      setConversationId(match?.[1] ?? null);
    };
    syncConversation();
    window.addEventListener("hashchange", syncConversation);
    window.addEventListener("popstate", syncConversation);
    return () => {
      window.removeEventListener("hashchange", syncConversation);
      window.removeEventListener("popstate", syncConversation);
    };
  }, []);

  async function createProject(draft: LandingProjectDraft) {
    const title =
      draft.prompt.split(/\r?\n/, 1)[0]?.trim().slice(0, 72) ||
      "Untitled video project";
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
    setConversationId(project.id);
    router.push(`/?start=1#conversation/${project.id}`);
  }

  return (
    <LandingPage
      accountApiBase="/api/account"
      activeConversationId={conversationId}
      conversationContent={
        conversationId ? (
          <ProjectWorkspace
            embedded
            key={conversationId}
            projectId={conversationId}
          />
        ) : undefined
      }
      docsBase="/docs/"
      locale="en"
      mode="app"
      onCreateProject={createProject}
      onViewChange={(view) => {
        if (view !== "conversation") setConversationId(null);
      }}
      videos={videos}
    />
  );
}
