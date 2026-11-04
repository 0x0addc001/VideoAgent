import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../messages/en.json";
import { ProjectsDashboard } from "@/components/projects-dashboard";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProjectsDashboard", () => {
  it("renders the signed-in user's projects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/auth/me")) {
          return Promise.resolve(
            Response.json({
              id: "user-1",
              email: "creator@example.com",
              locale: "en",
              created_at: "2026-11-01T00:00:00Z",
            }),
          );
        }
        if (url.endsWith("/admin/me")) {
          return Promise.resolve(new Response(null, { status: 403 }));
        }
        return Promise.resolve(
          Response.json({
            items: [
              {
                id: "project-1",
                title: "Launch story",
                brief: "Product film",
                state: "draft",
                created_at: "2026-11-01T00:00:00Z",
                updated_at: "2026-11-01T00:00:00Z",
              },
            ],
          }),
        );
      }),
    );

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ProjectsDashboard />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "VideoAgent Studio" })).toBeVisible();
    await waitFor(() => expect(screen.getByText("Launch story")).toBeVisible());
    expect(screen.getByRole("button", { name: "New project" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Delete project: Launch story" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Rename project: Launch story" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /Kling/i })).not.toBeInTheDocument();
  });
});

