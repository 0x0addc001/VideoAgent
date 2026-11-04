"use client";

import {
  LandingPage,
  landingContent,
  type LandingProjectDraft,
} from "@videoagent/landing";
import "@videoagent/landing/styles.css";
import { useRouter } from "@/i18n/navigation";

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
    router.push(`/projects/${project.id}?start=1`);
  }

  return (
    <LandingPage
      accountApiBase="/api/account"
      docsBase="/docs/"
      locale="en"
      mode="app"
      onCreateProject={createProject}
      videos={videos}
    />
  );
}
