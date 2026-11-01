import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import zhCN from "../messages/zh-CN.json";
import { AuthForm } from "@/components/auth-form";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("AuthForm", () => {
  it("renders Chinese labels and the sign-up mode", () => {
    render(
      <NextIntlClientProvider locale="zh-CN" messages={zhCN}>
        <AuthForm mode="register" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "创建你的创作空间" })).toBeVisible();
    expect(screen.getByLabelText("邮箱")).toBeVisible();
    expect(screen.getByLabelText("密码")).toBeVisible();
    expect(screen.getByRole("button", { name: "创建账户" })).toBeVisible();
  });
});

