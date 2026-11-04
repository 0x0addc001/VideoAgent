"use client";

import {
  Activity,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Film,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Section = "overview" | "users" | "jobs" | "invites" | "settings";
type RegistrationMode = "open" | "invite" | "closed";

type Overview = {
  users: number;
  active_users: number;
  disabled_users: number;
  projects: number;
  generation_jobs: number;
  running_jobs: number;
  failed_jobs: number;
  assets: number;
  generation_enabled: boolean;
  registration_mode: RegistrationMode;
  provider: string;
  celery_enabled: boolean;
};

type AdminUser = {
  id: string;
  email: string;
  status: "active" | "disabled";
  locale: string;
  credits: number;
  project_count: number;
  created_at: string;
};

type AdminJob = {
  id: string;
  user_id: string;
  user_email: string;
  project_id: string;
  project_title: string;
  provider: string;
  status: string;
  error_code: string | null;
  result_url: string | null;
  created_at: string;
};

type Invite = {
  id: string;
  code: string | null;
  label: string;
  max_uses: number;
  use_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type AuditEntry = {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  created_at: string;
};

type ProviderStatus = {
  provider: string;
  connected: boolean | null;
  error?: string;
};

const API_BASE = "/api/account";

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: { code?: string } }
      | null;
    throw new Error(body?.error?.code ?? `request-${response.status}`);
  }
  return (await response.json()) as T;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminDashboard() {
  const [section, setSection] = useState<Section>("overview");
  const [adminEmail, setAdminEmail] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [provider, setProvider] = useState<ProviderStatus | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});
  const [inviteLabel, setInviteLabel] = useState("");
  const [inviteUses, setInviteUses] = useState("1");
  const [newInviteCode, setNewInviteCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(query = userQuery) {
    setError(null);
    try {
      const [identity, nextOverview, nextUsers, nextJobs, nextInvites, nextAudit] =
        await Promise.all([
          jsonRequest<{ email: string }>("/admin/me"),
          jsonRequest<Overview>("/admin/overview"),
          jsonRequest<{ items: AdminUser[] }>(
            `/admin/users?query=${encodeURIComponent(query)}`,
          ),
          jsonRequest<{ items: AdminJob[] }>("/admin/jobs"),
          jsonRequest<{ items: Invite[] }>("/admin/invites"),
          jsonRequest<{ items: AuditEntry[] }>("/admin/audit"),
        ]);
      setAdminEmail(identity.email);
      setOverview(nextOverview);
      setUsers(nextUsers.items);
      setJobs(nextJobs.items);
      setInvites(nextInvites.items);
      setAudit(nextAudit.items);
      try {
        setProvider(await jsonRequest<ProviderStatus>("/admin/provider"));
      } catch {
        setProvider({
          provider: nextOverview.provider,
          connected: null,
          error: "Provider status is unavailable.",
        });
      }
      setAccessDenied(false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      if (message.includes("ADMIN_ACCESS_REQUIRED")) {
        setAccessDenied(true);
      } else if (
        message.includes("AUTHENTICATION_REQUIRED") ||
        message.includes("request-401")
      ) {
        window.location.href = "/en/login?next=/en/admin";
      } else {
        setError(message || "Unable to load the administration console.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load("");
  }, []);

  async function updateSettings(payload: {
    generation_enabled?: boolean;
    registration_mode?: RegistrationMode;
  }) {
    setBusyAction("settings");
    try {
      await jsonRequest("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Settings update failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function setUserStatus(user: AdminUser) {
    setBusyAction(`user-${user.id}`);
    try {
      await jsonRequest(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: user.status === "active" ? "disabled" : "active",
        }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "User update failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function adjustCredits(event: FormEvent<HTMLFormElement>, user: AdminUser) {
    event.preventDefault();
    const amount = Number(creditAmounts[user.id] ?? "");
    if (!Number.isInteger(amount) || amount === 0) {
      setError("Enter a non-zero whole number of credits.");
      return;
    }
    setBusyAction(`credits-${user.id}`);
    try {
      await jsonRequest(`/admin/users/${user.id}/credits`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          reason: "Administrator adjustment",
        }),
      });
      setCreditAmounts((current) => ({ ...current, [user.id]: "" }));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Credit adjustment failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function refundJob(job: AdminJob) {
    setBusyAction(`job-${job.id}`);
    try {
      await jsonRequest(`/admin/jobs/${job.id}/refund`, { method: "POST" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Refund failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("invite-create");
    try {
      const invite = await jsonRequest<Invite>("/admin/invites", {
        method: "POST",
        body: JSON.stringify({
          label: inviteLabel,
          max_uses: Number(inviteUses),
          expires_in_hours: 168,
        }),
      });
      setNewInviteCode(invite.code);
      setInviteLabel("");
      setInviteUses("1");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invite creation failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function revokeInvite(invite: Invite) {
    setBusyAction(`invite-${invite.id}`);
    try {
      await jsonRequest(`/admin/invites/${invite.id}`, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invite revocation failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function logout() {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    window.location.href = "/en/login";
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080b11] text-white">
        <RefreshCw className="h-6 w-6 animate-spin text-[#4ba3ff]" />
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080b11] px-6 text-white">
        <section className="max-w-lg text-center">
          <ShieldCheck className="mx-auto h-14 w-14 text-[#4ba3ff]" />
          <h1 className="mt-6 text-4xl font-semibold">Administrator access required</h1>
          <p className="mt-4 text-lg leading-8 text-white/45">
            This account is not listed in VIDEOAGENT_ADMIN_EMAILS.
          </p>
          <Link
            className="mt-7 inline-flex rounded-full border border-white/15 px-5 py-3 text-base"
            href="/"
          >
            Return to VideoAgent
          </Link>
        </section>
      </main>
    );
  }

  const stats = overview
    ? [
        { label: "Users", value: overview.users, detail: `${overview.active_users} active`, icon: Users },
        { label: "Projects", value: overview.projects, detail: `${overview.assets} assets`, icon: Film },
        {
          label: "Generation",
          value: overview.generation_jobs,
          detail: `${overview.running_jobs} running`,
          icon: Activity,
        },
        {
          label: "Failures",
          value: overview.failed_jobs,
          detail: "failed or uncertain",
          icon: XCircle,
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-[#080b11] text-white">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-white/8 bg-[#0c1018] px-5 pb-5 lg:border-b-0 lg:border-r">
          <div className="flex h-16 items-center border-b border-white/8">
          <Link className="flex items-center gap-3 text-xl font-semibold leading-none" href="/">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#1677ff]/45 bg-[#1677ff]/15 text-[#7dc4ff]">
              <Video className="h-5 w-5" />
            </span>
            <span>
              VideoAgent <span className="text-[#7dc4ff]">Operations</span>
            </span>
          </Link>
          </div>
          <nav className="mt-5 grid gap-1">
            {[
              ["overview", "Overview", LayoutDashboard],
              ["users", "Users & credits", Users],
              ["jobs", "Generation jobs", Activity],
              ["invites", "Invite codes", KeyRound],
              ["settings", "Platform settings", Power],
            ].map(([id, label, Icon]) => (
              <button
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-lg transition",
                  section === id
                    ? "bg-[#1677ff]/12 text-[#92d3ff]"
                    : "text-white/45 hover:bg-white/5 hover:text-white",
                )}
                key={id as string}
                onClick={() => setSection(id as Section)}
                type="button"
              >
                <Icon className="h-5 w-5" />
                {label as string}
              </button>
            ))}
          </nav>
          <div className="mt-10 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-base text-white/35">Signed in as</p>
            <p className="mt-2 truncate text-base text-white/75">{adminEmail}</p>
            <button
              className="mt-4 flex items-center gap-2 text-base text-white/45 hover:text-white"
              onClick={() => void logout()}
              type="button"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="flex min-h-16 items-center justify-between border-b border-white/8 px-5 sm:px-8">
            <h1 className="text-2xl font-medium">VideoAgent Administration</h1>
            <button
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-base text-white/60 hover:text-white"
              onClick={() => void load()}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </header>

          <div className="p-5 sm:p-8">
            {error ? (
              <p className="mb-5 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-base text-red-200">
                {error}
              </p>
            ) : null}

            {section === "overview" ? (
              <div className="space-y-7">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map(({ label, value, detail, icon: Icon }) => (
                    <article
                      className="rounded-2xl border border-white/8 bg-[#0d121b] p-5"
                      key={label}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-lg text-white/45">{label}</p>
                        <Icon className="h-4 w-4 text-[#4ba3ff]" />
                      </div>
                      <p className="mt-5 text-4xl font-semibold tracking-[-0.04em]">{value}</p>
                      <p className="mt-2 text-base text-white/35">{detail}</p>
                    </article>
                  ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <section className="rounded-2xl border border-white/8 bg-[#0d121b] p-5">
                    <h2 className="text-xl font-medium">Runtime</h2>
                    <dl className="mt-5 grid gap-4 text-base">
                      <div className="flex justify-between gap-4">
                        <dt className="text-white/38">Provider</dt>
                        <dd>{provider?.provider ?? overview?.provider ?? "unknown"}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-white/38">Provider connection</dt>
                        <dd>
                          {provider?.connected === true
                            ? "Connected"
                            : provider?.connected === false
                              ? "Disconnected"
                              : "Not exposed"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-white/38">Celery worker</dt>
                        <dd>{overview?.celery_enabled ? "Enabled" : "Disabled"}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-white/38">Generation</dt>
                        <dd>{overview?.generation_enabled ? "Enabled" : "Paused"}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-white/38">Registration</dt>
                        <dd className="capitalize">{overview?.registration_mode}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="rounded-2xl border border-white/8 bg-[#0d121b] p-5">
                    <h2 className="text-xl font-medium">Recent administration activity</h2>
                    <div className="mt-4 divide-y divide-white/6">
                      {audit.slice(0, 7).map((entry) => (
                        <div className="flex items-center justify-between gap-4 py-3" key={entry.id}>
                          <div>
                            <p className="text-base text-white/75">{entry.action}</p>
                            <p className="mt-1 text-base text-white/35">
                              {entry.target_type} · {entry.target_id.slice(0, 8)}
                            </p>
                          </div>
                          <span className="text-base text-white/35">{formatDate(entry.created_at)}</span>
                        </div>
                      ))}
                      {audit.length === 0 ? (
                        <p className="py-6 text-base text-white/35">No administration actions yet.</p>
                      ) : null}
                    </div>
                  </section>
                </div>
              </div>
            ) : null}

            {section === "users" ? (
              <section>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="text-4xl font-semibold tracking-[-0.04em]">Users & credits</h2>
                  </div>
                  <form
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void load(userQuery);
                    }}
                  >
                    <Search className="h-4 w-4 text-white/30" />
                    <input
                      aria-label="Search users"
                      className="w-60 bg-transparent text-base outline-none placeholder:text-white/30"
                      onChange={(event) => setUserQuery(event.target.value)}
                      placeholder="Search by email"
                      value={userQuery}
                    />
                  </form>
                </div>
                <div className="mt-7 overflow-x-auto rounded-2xl border border-white/8">
                  <table className="w-full min-w-[920px] text-left text-base">
                    <thead className="bg-white/[0.035] text-base uppercase tracking-[0.1em] text-white/35">
                      <tr>
                        <th className="px-5 py-4">User</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Credits</th>
                        <th className="px-5 py-4">Projects</th>
                        <th className="px-5 py-4">Adjustment</th>
                        <th className="px-5 py-4">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/6">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-5 py-4">{user.email}</td>
                          <td className="px-5 py-4">
                            <button
                              className={cn(
                                "rounded-full px-3 py-1.5 text-base capitalize",
                                user.status === "active"
                                  ? "bg-emerald-400/10 text-emerald-300"
                                  : "bg-red-400/10 text-red-300",
                              )}
                              disabled={busyAction === `user-${user.id}`}
                              onClick={() => void setUserStatus(user)}
                              type="button"
                            >
                              {user.status}
                            </button>
                          </td>
                          <td className="px-5 py-4">{user.credits}</td>
                          <td className="px-5 py-4">{user.project_count}</td>
                          <td className="px-5 py-4">
                            <form
                              className="flex items-center gap-2"
                              onSubmit={(event) => void adjustCredits(event, user)}
                            >
                              <input
                                aria-label={`Credit adjustment for ${user.email}`}
                                className="w-28 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-base outline-none focus:border-[#1677ff]"
                                onChange={(event) =>
                                  setCreditAmounts((current) => ({
                                    ...current,
                                    [user.id]: event.target.value,
                                  }))
                                }
                                placeholder="+/-"
                                value={creditAmounts[user.id] ?? ""}
                              />
                              <button
                                className="rounded-lg bg-[#1677ff] px-3 py-2 text-base font-semibold disabled:opacity-40"
                                disabled={busyAction === `credits-${user.id}`}
                                type="submit"
                              >
                                Apply
                              </button>
                            </form>
                          </td>
                          <td className="px-5 py-4 text-white/35">{formatDate(user.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {section === "jobs" ? (
              <section>
                <h2 className="text-4xl font-semibold tracking-[-0.04em]">Generation jobs</h2>
                <div className="mt-7 overflow-x-auto rounded-2xl border border-white/8">
                  <table className="w-full min-w-[900px] text-left text-base">
                    <thead className="bg-white/[0.035] text-base uppercase tracking-[0.1em] text-white/35">
                      <tr>
                        <th className="px-5 py-4">Project</th>
                        <th className="px-5 py-4">User</th>
                        <th className="px-5 py-4">Provider</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Created</th>
                        <th className="px-5 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/6">
                      {jobs.map((job) => (
                        <tr key={job.id}>
                          <td className="px-5 py-4">{job.project_title}</td>
                          <td className="px-5 py-4 text-white/45">{job.user_email}</td>
                          <td className="px-5 py-4">{job.provider}</td>
                          <td className="px-5 py-4">
                            <span className="rounded-full bg-white/5 px-3 py-1.5 text-base">
                              {job.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-white/35">{formatDate(job.created_at)}</td>
                          <td className="px-5 py-4">
                            {["failed", "cancelled", "submission_uncertain"].includes(job.status) ? (
                              <button
                                className="rounded-lg border border-[#1677ff]/35 px-3 py-2 text-base text-[#8ed2ff] disabled:opacity-40"
                                disabled={busyAction === `job-${job.id}`}
                                onClick={() => void refundJob(job)}
                                type="button"
                              >
                                Refund hold
                              </button>
                            ) : (
                              <span className="text-white/20">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {section === "invites" ? (
              <section>
                <h2 className="text-4xl font-semibold tracking-[-0.04em]">Invite codes</h2>
                <form
                  className="mt-7 grid gap-3 rounded-2xl border border-white/8 bg-[#0d121b] p-5 md:grid-cols-[1fr_140px_auto]"
                  onSubmit={createInvite}
                >
                  <label className="text-base">
                    <span className="text-white/45">Label</span>
                    <input
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#1677ff]"
                      onChange={(event) => setInviteLabel(event.target.value)}
                      placeholder="Design partner"
                      value={inviteLabel}
                    />
                  </label>
                  <label className="text-base">
                    <span className="text-white/45">Max uses</span>
                    <input
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#1677ff]"
                      min={1}
                      onChange={(event) => setInviteUses(event.target.value)}
                      type="number"
                      value={inviteUses}
                    />
                  </label>
                  <button
                    className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#1677ff] px-5 py-3 text-base font-semibold disabled:opacity-40"
                    disabled={busyAction === "invite-create"}
                    type="submit"
                  >
                    <Plus className="h-4 w-4" />
                    Create
                  </button>
                </form>
                {newInviteCode ? (
                  <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                    <p className="text-base uppercase tracking-[0.12em] text-emerald-300">
                      New code · shown once
                    </p>
                    <code className="mt-2 block break-all text-base text-white">{newInviteCode}</code>
                  </div>
                ) : null}
                <div className="mt-6 grid gap-3">
                  {invites.map((invite) => (
                    <article
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-white/8 bg-[#0d121b] p-4 sm:flex-row sm:items-center"
                      key={invite.id}
                    >
                      <div>
                        <p className="text-lg font-medium">{invite.label || "Untitled invite"}</p>
                        <p className="mt-1 text-base text-white/35">
                          {invite.use_count}/{invite.max_uses} used · expires{" "}
                          {invite.expires_at ? formatDate(invite.expires_at) : "never"}
                        </p>
                      </div>
                      <button
                        className="flex items-center gap-2 self-start rounded-lg border border-red-400/20 px-3 py-2 text-base text-red-300 disabled:opacity-30 sm:self-auto"
                        disabled={Boolean(invite.revoked_at) || busyAction === `invite-${invite.id}`}
                        onClick={() => void revokeInvite(invite)}
                        type="button"
                      >
                        {invite.revoked_at ? <Ban className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                        {invite.revoked_at ? "Revoked" : "Revoke"}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {section === "settings" ? (
              <section>
                <h2 className="text-4xl font-semibold tracking-[-0.04em]">Platform settings</h2>
                <div className="mt-7 grid gap-4 lg:grid-cols-2">
                  <article className="rounded-2xl border border-white/8 bg-[#0d121b] p-5">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <h3 className="text-lg font-medium">Video generation</h3>
                        <p className="mt-2 text-base leading-7 text-white/40">
                          Immediately pause all estimates and billable Provider submissions.
                        </p>
                      </div>
                      {overview?.generation_enabled ? (
                        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-300" />
                      ) : (
                        <XCircle className="h-6 w-6 shrink-0 text-red-300" />
                      )}
                    </div>
                    <button
                      className={cn(
                        "mt-6 rounded-xl px-4 py-3 text-base font-semibold disabled:opacity-40",
                        overview?.generation_enabled
                          ? "border border-red-400/25 text-red-300"
                          : "bg-[#1677ff] text-white",
                      )}
                      disabled={busyAction === "settings"}
                      onClick={() =>
                        void updateSettings({
                          generation_enabled: !overview?.generation_enabled,
                        })
                      }
                      type="button"
                    >
                      {overview?.generation_enabled ? "Pause generation" : "Enable generation"}
                    </button>
                  </article>

                  <article className="rounded-2xl border border-white/8 bg-[#0d121b] p-5">
                    <h3 className="text-lg font-medium">Registration</h3>
                    <p className="mt-2 text-base leading-7 text-white/40">
                      Open registration, require an invite, or close account creation.
                    </p>
                    <div className="mt-6 grid grid-cols-3 gap-2">
                      {(["open", "invite", "closed"] as const).map((mode) => (
                        <button
                          className={cn(
                            "rounded-xl border px-3 py-2.5 text-base capitalize",
                            overview?.registration_mode === mode
                              ? "border-[#1677ff]/50 bg-[#1677ff]/12 text-[#8ed2ff]"
                              : "border-white/8 text-white/35",
                          )}
                          disabled={busyAction === "settings"}
                          key={mode}
                          onClick={() => void updateSettings({ registration_mode: mode })}
                          type="button"
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-2xl border border-white/8 bg-[#0d121b] p-5 lg:col-span-2">
                    <div className="flex items-center gap-3">
                      <CircleDollarSign className="h-5 w-5 text-[#4ba3ff]" />
                      <h3 className="text-lg font-medium">Cost protection</h3>
                    </div>
                    <p className="mt-3 max-w-3xl text-base leading-8 text-white/40">
                      Provider accounts are shared at the infrastructure layer. Keep new-user credits at
                      zero, grant credits manually, and pause generation before any Provider incident.
                    </p>
                  </article>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
