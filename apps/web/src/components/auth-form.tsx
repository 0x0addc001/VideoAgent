"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { resolveApiBaseUrl } from "@/lib/api";

type AuthMode = "register" | "login";

type AuthFormProps = {
  mode: AuthMode;
};

const API_BASE_URL = resolveApiBaseUrl();

export function AuthForm({ mode }: AuthFormProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<
    "open" | "invite" | "closed"
  >("open");

  useEffect(() => {
    if (mode !== "register") return;
    let active = true;
    fetch(`${API_BASE_URL}/auth/registration-policy`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { mode?: "open" | "invite" | "closed" } | null) => {
        if (active && payload?.mode) setRegistrationMode(payload.mode);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/${mode}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          ...(mode === "register"
            ? {
                locale,
                invite_code: formData.get("inviteCode") || undefined,
              }
            : {}),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { code?: string } }
          | null;
        setError(body?.error?.code ?? t("genericError"));
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      if (next?.startsWith("/") && !next.startsWith("//")) {
        window.location.href = next;
      } else {
        router.push("/#assets");
      }
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-[-0.04em]">
        {isRegister ? t("registerTitle") : t("loginTitle")}
      </h1>
      <p className="mb-8 mt-3 leading-7 text-[#756d61]">
        {isRegister ? t("registerSubtitle") : t("loginSubtitle")}
      </p>
      <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#2b261f]" htmlFor="email">
          {t("email")}
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-2xl border border-[#d9d2c5] bg-white px-4 py-3 text-[#16130f] outline-none transition placeholder:text-[#9c9487] focus:border-[#1677ff] focus:ring-4 focus:ring-[#1677ff]/10"
          id="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#2b261f]" htmlFor="password">
          {t("password")}
        </label>
        <input
          autoComplete={isRegister ? "new-password" : "current-password"}
          className="w-full rounded-2xl border border-[#d9d2c5] bg-white px-4 py-3 text-[#16130f] outline-none transition placeholder:text-[#9c9487] focus:border-[#1677ff] focus:ring-4 focus:ring-[#1677ff]/10"
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>

      {isRegister && registrationMode === "invite" ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#2b261f]" htmlFor="inviteCode">
            Invite code
          </label>
          <input
            autoComplete="off"
            className="w-full rounded-2xl border border-[#d9d2c5] bg-white px-4 py-3 text-[#16130f] outline-none transition placeholder:text-[#9c9487] focus:border-[#1677ff] focus:ring-4 focus:ring-[#1677ff]/10"
            id="inviteCode"
            name="inviteCode"
            required
          />
        </div>
      ) : null}

      {error ? (
        <p aria-live="polite" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16130f] px-5 py-3.5 font-semibold text-white transition hover:bg-[#332b23] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting || (isRegister && registrationMode === "closed")}
        type="submit"
      >
        {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? t("loading") : isRegister ? t("createAccount") : t("signIn")}
        {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
      </button>

      {isRegister && registrationMode === "closed" ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Registration is currently closed.
        </p>
      ) : null}

      <p className="text-center text-sm text-[#756d61]">
        {isRegister ? t("switchToLogin") : t("switchToRegister")}{" "}
        <Link
          className="font-semibold text-[#3d64d9] hover:underline"
          href={isRegister ? "/login" : "/register"}
        >
          {isRegister ? t("signIn") : t("createAccount")}
        </Link>
      </p>
      </form>
    </div>
  );
}

