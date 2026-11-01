"use client";

import { ArrowRight, Clapperboard, LogOut, PlugZap, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";

type User = {
  id: string;
  email: string;
  locale: "en" | "zh-CN";
  created_at: string;
};

type Project = {
  id: string;
  title: string;
  brief: string;
  state: string;
  created_at: string;
  updated_at: string;
};

type KlingConnection = {
  provider: "kling";
  connected: boolean;
  expires_at: string | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export function ProjectsDashboard() {
  const t = useTranslations("projects");
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [kling, setKling] = useState<KlingConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [userResponse, projectsResponse, klingResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/auth/me`, { credentials: "include" }),
          fetch(`${API_BASE_URL}/projects`, { credentials: "include" }),
          fetch(`${API_BASE_URL}/providers/kling`, { credentials: "include" }),
        ]);
        if (userResponse.status === 401) {
          router.push("/login");
          return;
        }
        if (!userResponse.ok || !projectsResponse.ok) {
          throw new Error("request-failed");
        }
        const [nextUser, nextProjects, nextKling] = await Promise.all([
          userResponse.json() as Promise<User>,
          projectsResponse.json() as Promise<{ items: Project[] }>,
          klingResponse.ok
            ? (klingResponse.json() as Promise<KlingConnection>)
            : Promise.resolve(null),
        ]);
        if (active) {
          setUser(nextUser);
          setProjects(nextProjects.items);
          setKling(nextKling);
        }
      } catch {
        if (active) {
          setError(t("loadError"));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [router, t]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          brief: form.get("brief"),
        }),
      });
      if (!response.ok) {
        throw new Error("create-failed");
      }
      const project = (await response.json()) as Project;
      setProjects((current) => [project, ...current]);
      setShowCreate(false);
      router.push(`/projects/${project.id}`);
    } catch {
      setError(t("loadError"));
    } finally {
      setIsCreating(false);
    }
  }

  async function logout() {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  async function toggleKlingConnection() {
    setError(null);
    if (kling?.connected) {
      const response = await fetch(`${API_BASE_URL}/providers/kling`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => null);
      if (response?.ok) {
        setKling((current) => (current ? { ...current, connected: false } : current));
      }
      return;
    }

    const response = await fetch(`${API_BASE_URL}/providers/kling/connect`, {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    if (!response?.ok) {
      setError(t("loadError"));
      return;
    }
    const body = (await response.json()) as { authorization_url: string };
    window.location.assign(body.authorization_url);
  }

  return (
    <main className="min-h-screen bg-[#eee6da] px-5 py-7 text-[#16130f] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between border-b border-[#16130f]/10 pb-6">
          <Link className="flex items-center gap-3 font-semibold" href="/">
            <span className="grid size-9 place-items-center rounded-xl bg-[#16130f] text-white">
              <Clapperboard className="h-4 w-4" />
            </span>
            VideoAgent
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-[#756d61] sm:block">{user?.email}</span>
            <button
              className="flex items-center gap-2 rounded-full border border-[#16130f]/10 bg-white/50 px-4 py-2 text-sm transition hover:bg-white"
              onClick={() => void toggleKlingConnection()}
              type="button"
            >
              <PlugZap className="h-4 w-4" />
              {kling?.connected ? t("klingConnected") : t("connectKling")}
            </button>
            <button
              className="flex items-center gap-2 rounded-full border border-[#16130f]/10 px-4 py-2 text-sm transition hover:bg-white"
              onClick={() => void logout()}
              type="button"
            >
              <LogOut className="h-4 w-4" />
              {t("logout")}
            </button>
          </div>
        </header>

        <section className="py-12">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b94621]">
                VideoAgent Studio
              </p>
              <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">{t("title")}</h1>
              <p className="mt-4 max-w-2xl leading-7 text-[#756d61]">{t("subtitle")}</p>
            </div>
            <button
              className="flex items-center justify-center gap-2 rounded-full bg-[#16130f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#332b23]"
              onClick={() => setShowCreate((current) => !current)}
              type="button"
            >
              {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {t("newProject")}
            </button>
          </div>

          {showCreate ? (
            <form
              className="mt-8 grid gap-4 rounded-3xl border border-[#16130f]/10 bg-white/65 p-5 shadow-sm md:grid-cols-[0.6fr_1fr_auto] md:items-end"
              onSubmit={createProject}
            >
              <label className="space-y-2 text-sm font-medium">
                <span>{t("projectTitle")}</span>
                <input
                  className="block w-full rounded-xl border border-[#16130f]/10 bg-white px-4 py-3 outline-none focus:border-[#b94621]"
                  name="title"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>{t("brief")}</span>
                <input
                  className="block w-full rounded-xl border border-[#16130f]/10 bg-white px-4 py-3 outline-none focus:border-[#b94621]"
                  name="brief"
                />
              </label>
              <button
                className="rounded-xl bg-[#b94621] px-5 py-3 font-semibold text-white disabled:opacity-50"
                disabled={isCreating}
                type="submit"
              >
                {isCreating ? "..." : t("create")}
              </button>
            </form>
          ) : null}

          {error ? (
            <p aria-live="polite" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-10">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div className="h-56 animate-pulse rounded-3xl bg-[#e3dacb]" key={item} />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="grid min-h-80 place-items-center rounded-[2rem] border border-dashed border-[#16130f]/15 bg-white/35 p-8 text-center">
                <div className="max-w-md">
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#16130f] text-white">
                    <Clapperboard className="h-6 w-6" />
                  </span>
                  <p className="mt-5 leading-7 text-[#756d61]">{t("empty")}</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project, index) => (
                  <Link
                    className="group overflow-hidden rounded-3xl border border-[#16130f]/10 bg-[#f8f2e9] transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#6f4c2f]/10"
                    href={`/projects/${project.id}`}
                    key={project.id}
                  >
                    <div
                      className="relative h-36 overflow-hidden"
                      style={{
                        background: [
                          "radial-gradient(circle at 70% 20%, #fca876, transparent 35%), linear-gradient(140deg,#4c281d,#101814)",
                          "radial-gradient(circle at 20% 70%, #7ba490, transparent 38%), linear-gradient(140deg,#1a2722,#4b2e20)",
                          "radial-gradient(circle at 75% 65%, #e49a68, transparent 30%), linear-gradient(140deg,#29201b,#845b42)",
                        ][index % 3],
                      }}
                    >
                      <span className="absolute left-4 top-4 rounded-full bg-black/25 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
                        {t("draft")}
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold">{project.title}</h2>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#756d61]">
                            {project.brief || t("empty")}
                          </p>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

