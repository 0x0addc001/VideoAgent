"use client";

import { Check, LoaderCircle, LogIn, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveApiBaseUrl } from "@/lib/api";

const API_BASE_URL = resolveApiBaseUrl();

type JoinState =
  | { status: "loading" }
  | { status: "joined"; projectId: string; permission: "edit" | "view" }
  | { status: "login" }
  | { status: "error"; message: string };

export function CollaborationJoin({
  locale,
  token,
}: {
  locale: string;
  token: string;
}) {
  const [state, setState] = useState<JoinState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/collaborations/${encodeURIComponent(token)}/accept`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (response.status === 401) {
          if (active) setState({ status: "login" });
          return;
        }
        const payload = (await response.json().catch(() => null)) as
          | {
              project_id?: string;
              permission?: "edit" | "view";
              error?: { message?: string };
            }
          | null;
        if (!response.ok || !payload?.project_id || !payload.permission) {
          throw new Error(payload?.error?.message || "Invitation unavailable.");
        }
        if (!active) return;
        setState({
          status: "joined",
          projectId: payload.project_id,
          permission: payload.permission,
        });
        window.setTimeout(() => {
          window.location.href = `/${locale}/#conversation/${payload.project_id}`;
        }, 700);
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: "error",
            message:
              error instanceof Error ? error.message : "Invitation unavailable.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [locale, token]);

  const next = encodeURIComponent(
    `/${locale}/collaboration/${encodeURIComponent(token)}`,
  );

  return (
    <section className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#11100d]/95 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#1677ff]/15 text-[#7bc6ff]">
        {state.status === "loading" ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : state.status === "joined" ? (
          <Check className="h-5 w-5" />
        ) : state.status === "login" ? (
          <LogIn className="h-5 w-5" />
        ) : (
          <TriangleAlert className="h-5 w-5" />
        )}
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-white">
        {state.status === "joined"
          ? "Joining project"
          : state.status === "login"
            ? "Sign in to collaborate"
            : state.status === "error"
              ? "Unable to join"
              : "Checking invitation"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-white/45">
        {state.status === "joined"
          ? `Opening the storyboard with ${state.permission} access.`
          : state.status === "login"
            ? "Use the account that received this invitation."
            : state.status === "error"
              ? state.message
              : "Verifying the collaboration link and its permissions."}
      </p>
      {state.status === "login" ? (
        <a
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#1677ff] px-4 py-3 text-sm font-semibold text-white"
          href={`/${locale}/login?next=${next}`}
        >
          Sign in
        </a>
      ) : null}
      {state.status === "joined" ? (
        <a
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#1677ff] px-4 py-3 text-sm font-semibold text-white"
          href={`/${locale}/#conversation/${state.projectId}`}
        >
          Open storyboard
        </a>
      ) : null}
    </section>
  );
}
