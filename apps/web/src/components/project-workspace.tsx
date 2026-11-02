"use client";

import {
  ArrowLeft,
  ArrowUp,
  Check,
  Film,
  MessageCircleMore,
  PanelRight,
  Plus,
  Sparkles,
  Video,
  WandSparkles,
} from "lucide-react";
import { StreamingText } from "@videoagent/landing";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  title: string;
  brief: string;
  state: string;
  created_at: string;
  updated_at: string;
};

type Shot = {
  id: string;
  index: number;
  description: string;
  prompt_en: string;
  prompt_zh: string | null;
  duration_seconds: number;
  aspect_ratio: "16:9" | "9:16" | "1:1";
  generation_mode: "text_to_video" | "image_to_video";
  status: string;
};

type Storyboard = {
  id: string;
  project_id: string;
  version: number;
  shots: Shot[];
};

type CostEstimate = {
  provider: string;
  credits: number;
  duration_seconds: number;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
};

type AgentTurn = {
  user_message: Message;
  assistant_message: Message;
  storyboard: Storyboard;
};

type GenerationJob = {
  id: string;
  shot_id: string;
  status:
    | "pending"
    | "submission_uncertain"
    | "submitted"
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "cancelled";
  result_url: string | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const t = useTranslations("workspace");
  const locale = useLocale();
  const [project, setProject] = useState<Project | null>(null);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"agent" | "canvas" | "inspector">("canvas");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [projectResponse, storyboardResponse, messagesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/projects/${projectId}`, { credentials: "include" }),
          fetch(`${API_BASE_URL}/projects/${projectId}/storyboard`, {
            credentials: "include",
          }),
          fetch(`${API_BASE_URL}/projects/${projectId}/messages`, {
            credentials: "include",
          }),
        ]);
        if (!active) return;
        if (projectResponse.status === 404) {
          setStatus("missing");
          return;
        }
        if (!projectResponse.ok) {
          throw new Error("load-failed");
        }
        setProject((await projectResponse.json()) as Project);
        if (storyboardResponse.ok) {
          const nextStoryboard = (await storyboardResponse.json()) as Storyboard;
          setStoryboard(nextStoryboard);
          setSelectedShotId(nextStoryboard.shots[0]?.id ?? null);
        }
        if (messagesResponse.ok) {
          const nextMessages = (await messagesResponse.json()) as { items: Message[] };
          setMessages(nextMessages.items);
        }
        setStatus("ready");
      } catch {
        if (active) setStatus("missing");
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!activeJob) return;
    let active = true;
    const timer = window.setInterval(async () => {
      const response = await fetch(`${API_BASE_URL}/jobs/${activeJob.id}`, {
        credentials: "include",
      }).catch(() => null);
      if (!active || !response?.ok) return;
      const job = (await response.json()) as GenerationJob;
      if (job.status === "succeeded") {
        setStoryboard((current) =>
          current
            ? {
                ...current,
                shots: current.shots.map((shot) =>
                  shot.id === job.shot_id ? { ...shot, status: "completed" } : shot,
                ),
              }
            : current,
        );
        setActiveJob(null);
      } else if (["failed", "cancelled"].includes(job.status)) {
        setActionError(t("generationError"));
        setActiveJob(null);
      } else {
        setActiveJob(job);
      }
    }, 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeJob, t]);

  const selectedShot = useMemo(
    () => storyboard?.shots.find((shot) => shot.id === selectedShotId) ?? null,
    [selectedShotId, storyboard],
  );

  async function createStarterStoryboard() {
    if (!project) return;
    setIsWorking(true);
    setActionError(null);
    const description = project.brief || project.title;

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}/storyboard`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shots: [
            {
              description,
              prompt_en: description,
              prompt_zh: locale.startsWith("zh") ? description : null,
              duration_seconds: 5,
              aspect_ratio: "16:9",
              generation_mode: "text_to_video",
            },
          ],
        }),
      });
      if (!response.ok) throw new Error("create-storyboard-failed");
      const nextStoryboard = (await response.json()) as Storyboard;
      setStoryboard(nextStoryboard);
      setSelectedShotId(nextStoryboard.shots[0]?.id ?? null);
      setMobilePanel("inspector");
    } catch {
      setActionError(t("planFirst"));
    } finally {
      setIsWorking(false);
    }
  }

  async function sendMessage() {
    const content = messageDraft.trim();
    if (!project || !content || isWorking) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("agent-message-failed");
      const turn = (await response.json()) as AgentTurn;
      setMessages((current) => [...current, turn.user_message, turn.assistant_message]);
      setStoryboard(turn.storyboard);
      setSelectedShotId(turn.storyboard.shots[0]?.id ?? null);
      setEstimate(null);
      setMessageDraft("");
      setMobilePanel("inspector");
    } catch {
      setActionError(t("agentIntro"));
    } finally {
      setIsWorking(false);
    }
  }

  async function estimateShot() {
    if (!selectedShot) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/shots/${selectedShot.id}/estimate`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("estimate-failed");
      setEstimate((await response.json()) as CostEstimate);
    } catch {
      setActionError(t("noShot"));
    } finally {
      setIsWorking(false);
    }
  }

  async function generateShot() {
    if (!selectedShot) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/shots/${selectedShot.id}/generate`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ approved: true }),
      });
      if (!response.ok) throw new Error("generation-failed");
      const job = (await response.json()) as GenerationJob;
      setStoryboard((current) =>
        current
          ? {
              ...current,
              shots: current.shots.map((shot) =>
                shot.id === selectedShot.id
                  ? {
                      ...shot,
                      status: job.status === "succeeded" ? "completed" : "generating",
                    }
                  : shot,
              ),
            }
          : current,
      );
      if (job.status !== "succeeded") {
        setActiveJob(job);
      }
    } catch {
      setActionError(t("generationError"));
    } finally {
      setIsWorking(false);
    }
  }

  if (status === "loading") {
    return <div className="min-h-screen animate-pulse bg-[#11100d]" />;
  }

  if (!project) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#11100d] text-white">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{t("notFound")}</h1>
          <Link className="mt-5 inline-flex items-center gap-2 text-[#ff9369]" href="/projects">
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen min-h-[680px] flex-col overflow-hidden bg-[#11100d] text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/8 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label={t("back")}
            className="grid size-9 place-items-center rounded-xl border border-white/10 text-white/55 transition hover:text-white"
            href="/projects"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="hidden size-8 place-items-center rounded-xl bg-[#ff7542] text-[#16130f] sm:grid">
            <Video className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{project.title}</h1>
            <p className="truncate text-[11px] text-white/35">{project.brief || t("planFirst")}</p>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_1fr_320px]">
        <aside
          className={cn(
            "min-h-0 flex-col border-r border-white/8 bg-[#14120e] lg:flex",
            mobilePanel === "agent" ? "flex" : "hidden",
          )}
        >
          <div className="flex h-14 items-center border-b border-white/8 px-5 text-sm font-medium">
            <Sparkles className="mr-2 h-4 w-4 text-[#ff8758]" />
            {t("agent")}
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-sm leading-6 text-white/50">
                <StreamingText text={t("agentIntro")} />
              </div>
            ) : (
              messages.map((message) => (
                <div
                  className={cn(
                    "rounded-2xl p-4 text-sm leading-6",
                    message.role === "user"
                      ? "ml-8 bg-[#ff7542]/10 text-white/75"
                      : "mr-4 border border-white/8 bg-white/[0.025] text-white/50",
                  )}
                  key={message.id}
                >
                  {message.role === "user" ? (
                    message.content
                  ) : (
                    <StreamingText text={message.content} />
                  )}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-white/8 p-4">
            <label className="block rounded-2xl border border-white/10 bg-white/[0.035] p-3 focus-within:border-[#ff7542]/40">
              <span className="sr-only">{t("agent")}</span>
              <textarea
                className="min-h-16 w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/28"
                onChange={(event) => setMessageDraft(event.target.value)}
                placeholder={t("agentPlaceholder")}
                value={messageDraft}
              />
              <span className="flex justify-end">
                <button
                  aria-label={t("send")}
                  className="grid size-8 place-items-center rounded-xl bg-[#ff7542] text-[#16130f] disabled:opacity-40"
                  disabled={!messageDraft.trim() || isWorking}
                  onClick={() => void sendMessage()}
                  type="button"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </span>
            </label>
          </div>
        </aside>

        <section
          className={cn(
            "min-h-0 flex-col bg-[#0d0c0a] lg:flex",
            mobilePanel === "canvas" ? "flex" : "hidden",
          )}
        >
          <div className="flex h-14 items-center border-b border-white/8 px-5">
            <span className="text-sm font-medium">{t("canvas")}</span>
          </div>
          <div className="flex-1 overflow-auto p-5 sm:p-8">
            {storyboard ? (
              <div className="mx-auto grid max-w-5xl gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {storyboard.shots.map((shot) => (
                    <button
                      className={cn(
                        "relative aspect-video overflow-hidden rounded-2xl border text-left transition",
                        selectedShotId === shot.id
                          ? "border-[#ff7542]/70 ring-1 ring-[#ff7542]/30"
                          : "border-white/8 hover:border-white/20",
                        "bg-[radial-gradient(circle_at_70%_20%,rgba(255,117,66,0.26),transparent_30%),linear-gradient(140deg,#352219,#0d1712)]",
                      )}
                      key={shot.id}
                      onClick={() => {
                        setSelectedShotId(shot.id);
                        setEstimate(null);
                        setMobilePanel("inspector");
                      }}
                      type="button"
                    >
                      <span className="absolute left-4 top-4 rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] backdrop-blur">
                        {String(shot.index + 1).padStart(2, "0")}
                      </span>
                      {shot.status === "completed" ? (
                        <span className="absolute right-4 top-4 grid size-7 place-items-center rounded-full bg-emerald-400 text-[#122016]">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : null}
                      <span className="absolute inset-x-4 bottom-4">
                        <span className="line-clamp-2 text-sm leading-5 text-white/80">
                          {shot.description}
                        </span>
                        <span className="mt-2 block text-[10px] uppercase tracking-[0.15em] text-white/35">
                          {shot.duration_seconds}s · {shot.aspect_ratio}
                        </span>
                      </span>
                    </button>
                  ))}
                  <button
                    aria-label={t("addStoryboard")}
                    className="grid aspect-video place-items-center rounded-2xl border border-dashed border-white/12 text-white/30 transition hover:border-[#ff7542]/40 hover:text-[#ff9369]"
                    onClick={() => setMobilePanel("agent")}
                    type="button"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid min-h-full place-items-center">
                <div className="relative grid aspect-video w-full max-w-3xl place-items-center overflow-hidden rounded-3xl border border-white/8 bg-[radial-gradient(circle_at_50%_20%,rgba(255,117,66,0.12),transparent_35%),linear-gradient(145deg,#181510,#0d1411)] p-8">
                  <div className="max-w-md text-center">
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/5">
                      <Film className="h-6 w-6 text-white/30" />
                    </span>
                    <h2 className="mt-5 text-xl font-medium">{t("starterTitle")}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/40">{t("starterBody")}</p>
                    <button
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ff7542] px-5 py-3 text-sm font-semibold text-[#16130f] disabled:opacity-50"
                      disabled={isWorking}
                      onClick={() => void createStarterStoryboard()}
                      type="button"
                    >
                      <WandSparkles className="h-4 w-4" />
                      {t("createStarter")}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {actionError ? (
              <p aria-live="polite" className="mx-auto mt-4 max-w-5xl text-sm text-red-300">
                {actionError}
              </p>
            ) : null}
          </div>
        </section>

        <aside
          className={cn(
            "min-h-0 flex-col border-l border-white/8 bg-[#14120e] lg:flex",
            mobilePanel === "inspector" ? "flex" : "hidden",
          )}
        >
          <div className="flex h-14 items-center border-b border-white/8 px-5 text-sm font-medium">
            <PanelRight className="mr-2 h-4 w-4 text-white/45" />
            {t("shotInspector")}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {selectedShot ? (
              <div className="space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-white/30">
                    Prompt
                  </p>
                  <p className="mt-3 rounded-xl border border-white/8 bg-white/[0.025] p-3 text-sm leading-6 text-white/55">
                    {locale.startsWith("zh") && selectedShot.prompt_zh
                      ? selectedShot.prompt_zh
                      : selectedShot.prompt_en}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-white/30">
                    {t("aspectRatio")}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {["16:9", "9:16", "1:1"].map((ratio) => (
                      <span
                        className={cn(
                          "rounded-xl border px-2 py-3 text-center text-xs",
                          selectedShot.aspect_ratio === ratio
                            ? "border-[#ff7542]/50 bg-[#ff7542]/10 text-[#ff9b77]"
                            : "border-white/8 text-white/30",
                        )}
                        key={ratio}
                      >
                        {ratio}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-white/30">
                    {t("duration")}
                  </p>
                  <div className="mt-3 rounded-xl border border-white/8 px-3 py-3 text-sm text-white/55">
                    {selectedShot.duration_seconds}s
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/8 pt-5">
                  {estimate ? (
                    <p className="rounded-xl bg-[#ff7542]/8 px-3 py-2 text-sm text-[#ffb398]">
                      {t("estimatedCredits")}: {estimate.credits}
                    </p>
                  ) : null}
                  <button
                    className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:border-white/20 hover:text-white disabled:opacity-40"
                    disabled={isWorking}
                    onClick={() => void estimateShot()}
                    type="button"
                  >
                    {t("estimate")}
                  </button>
                  <button
                    className="w-full rounded-xl bg-[#ff7542] px-4 py-3 text-sm font-semibold text-[#16130f] disabled:opacity-40"
                    disabled={isWorking || !estimate || selectedShot.status === "completed"}
                    onClick={() => void generateShot()}
                    type="button"
                  >
                    {isWorking
                      ? t("generating")
                      : selectedShot.status === "completed"
                        ? t("completed")
                        : t("generate")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-white/30">{t("noShot")}</p>
            )}
          </div>
        </aside>
      </div>

      <nav className="grid grid-cols-3 border-t border-white/8 bg-[#14120e] lg:hidden">
        {[
          { id: "agent" as const, label: t("agent"), icon: MessageCircleMore },
          { id: "canvas" as const, label: t("canvas"), icon: Film },
          { id: "inspector" as const, label: t("inspector"), icon: PanelRight },
        ].map(({ id, label, icon: Icon }) => (
          <button
            className={cn(
              "flex flex-col items-center gap-1 py-3 text-[11px]",
              mobilePanel === id ? "text-[#ff8d62]" : "text-white/35",
            )}
            key={id}
            onClick={() => setMobilePanel(id)}
            type="button"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
    </main>
  );
}
