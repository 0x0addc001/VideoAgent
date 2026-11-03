"use client";

import { ArrowRight, LogOut, Pencil, Plus, Trash2, Video, X } from "lucide-react";
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export function ProjectsDashboard() {
  const t = useTranslations("projects");
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [userResponse, projectsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/auth/me`, { credentials: "include" }),
          fetch(`${API_BASE_URL}/projects`, { credentials: "include" }),
        ]);
        if (userResponse.status === 401) {
          router.push("/login");
          return;
        }
        if (!userResponse.ok || !projectsResponse.ok) {
          throw new Error("request-failed");
        }
        const [nextUser, nextProjects] = await Promise.all([
          userResponse.json() as Promise<User>,
          projectsResponse.json() as Promise<{ items: Project[] }>,
        ]);
        if (active) {
          setUser(nextUser);
          setProjects(nextProjects.items);
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

  async function deleteProject(projectId: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    setError(null);
    setDeletingId(projectId);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("delete-failed");
      setProjects((current) => current.filter((project) => project.id !== projectId));
    } catch {
      setError(t("deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  function openRename(project: Project) {
    setError(null);
    setRenamingProject(project);
    setRenameValue(project.title);
  }

  async function renameProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = renameValue.trim();
    if (!renamingProject || !title) return;
    setError(null);
    setIsRenaming(true);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${renamingProject.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error("rename-failed");
      const project = (await response.json()) as Project;
      setProjects((current) =>
        current.map((item) => (item.id === project.id ? project : item)),
      );
      setRenamingProject(null);
    } catch {
      setError(t("renameError"));
    } finally {
      setIsRenaming(false);
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_76%_-12%,rgba(22,119,255,0.14),transparent_31%),#0b0a08] px-5 py-7 text-[#f7f0e6] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link className="flex items-center gap-3 font-semibold" href="/">
            <span className="grid size-9 place-items-center rounded-xl border border-white/20 text-white">
              <Video className="h-4 w-4" />
            </span>
            VideoAgent
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-white/45 sm:block">{user?.email}</span>
            <button
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm transition hover:bg-white/10"
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
              <h1 className="text-5xl font-semibold tracking-[-0.05em]">
                VideoAgent Studio
              </h1>
            </div>
            <button
              className="flex items-center justify-center gap-2 rounded-full bg-[#1677ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#00b8ff]"
              onClick={() => setShowCreate((current) => !current)}
              type="button"
            >
              {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {t("newProject")}
            </button>
          </div>

          {showCreate ? (
            <form
              className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-sm md:grid-cols-[0.6fr_1fr_auto] md:items-end"
              onSubmit={createProject}
            >
              <label className="space-y-2 text-sm font-medium">
                <span>{t("projectTitle")}</span>
                <input
                className="block w-full rounded-xl border border-white/10 bg-[#15120e] px-4 py-3 text-white outline-none focus:border-[#1677ff]"
                  name="title"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>{t("brief")}</span>
                <input
                className="block w-full rounded-xl border border-white/10 bg-[#15120e] px-4 py-3 text-white outline-none focus:border-[#1677ff]"
                  name="brief"
                />
              </label>
              <button
                className="rounded-xl bg-[#1677ff] px-5 py-3 font-semibold text-white disabled:opacity-50"
                disabled={isCreating}
                type="submit"
              >
                {isCreating ? "..." : t("create")}
              </button>
            </form>
          ) : null}

          {error ? (
            <p aria-live="polite" className="mt-6 rounded-xl bg-red-400/10 p-4 text-red-200">
              {error}
            </p>
          ) : null}

          <div className="mt-10">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div className="h-56 animate-pulse rounded-3xl bg-white/[0.06]" key={item} />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="grid min-h-80 place-items-center rounded-[2rem] border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
                <div className="max-w-md">
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/20 text-white/70">
                    <Video className="h-6 w-6" />
                  </span>
                  <p className="mt-5 leading-7 text-white/45">{t("empty")}</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project, index) => (
                  <article
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#15120e] transition hover:-translate-y-1 hover:border-white/20 hover:shadow-xl hover:shadow-black/30"
                    key={project.id}
                  >
                    <Link className="block" href={`/projects/${project.id}`}>
                      <div
                        className="relative h-36 overflow-hidden"
                        style={{
                          background: [
                            "radial-gradient(circle at 70% 20%, #fca876, transparent 35%), linear-gradient(140deg,#4c281d,#101814)",
                            "radial-gradient(circle at 20% 70%, #7ba490, transparent 38%), linear-gradient(140deg,#1a2722,#4b2e20)",
                            "radial-gradient(circle at 75% 65%, #e49a68, transparent 30%), linear-gradient(140deg,#29201b,#845b42)",
                          ][index % 3],
                        }}
                      />
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-lg font-semibold">{project.title}</h2>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/45">
                              {project.brief || t("empty")}
                            </p>
                          </div>
                          <ArrowRight className="mt-1 h-4 w-4 text-white/45 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                        </div>
                      </div>
                    </Link>
                    <div className="absolute right-4 top-4 flex gap-2">
                      <button
                        aria-label={`${t("renameProject")}: ${project.title}`}
                        className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/35 text-white/65 backdrop-blur transition hover:border-white/30 hover:bg-white/15 hover:text-white"
                        onClick={() => openRename(project)}
                        type="button"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`${t("deleteProject")}: ${project.title}`}
                        className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/35 text-white/65 backdrop-blur transition hover:border-red-300/40 hover:bg-red-500/20 hover:text-red-200 disabled:opacity-40"
                        disabled={deletingId === project.id}
                        onClick={() => void deleteProject(project.id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      {renamingProject ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setRenamingProject(null);
          }}
        >
          <form
            aria-label={t("renameProject")}
            className="w-full max-w-md rounded-3xl border border-white/12 bg-[#15120e] p-6 shadow-2xl shadow-black/50"
            onSubmit={renameProject}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-semibold">{t("renameTitle")}</h2>
              <button
                aria-label={t("cancel")}
                className="grid size-9 place-items-center rounded-full bg-white/5 text-white/55 hover:text-white"
                onClick={() => setRenamingProject(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              autoFocus
              className="mt-6 w-full rounded-xl border border-white/10 bg-[#0b0a08] px-4 py-3 text-white outline-none focus:border-[#1677ff]"
              maxLength={200}
              onChange={(event) => setRenameValue(event.target.value)}
              required
              value={renameValue}
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-white/65 hover:text-white"
                onClick={() => setRenamingProject(null)}
                type="button"
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-full bg-[#1677ff] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                disabled={isRenaming || !renameValue.trim()}
                type="submit"
              >
                {isRenaming ? t("renaming") : t("renameSave")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}

