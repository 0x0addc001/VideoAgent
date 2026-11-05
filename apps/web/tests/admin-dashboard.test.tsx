import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "@/components/admin-dashboard";

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
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminDashboard", () => {
  it("renders operations data and can pause generation", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/admin/me")) {
        return Promise.resolve(Response.json({ email: "admin@example.com" }));
      }
      if (url.endsWith("/admin/overview")) {
        return Promise.resolve(
          Response.json({
            users: 12,
            active_users: 11,
            disabled_users: 1,
            projects: 8,
            generation_jobs: 5,
            running_jobs: 1,
            failed_jobs: 1,
            assets: 24,
            generation_enabled: true,
            registration_mode: "invite",
            provider: "pippit",
            celery_enabled: false,
          }),
        );
      }
      if (url.includes("/admin/users")) {
        return Promise.resolve(Response.json({ items: [], total: 0 }));
      }
      if (url.endsWith("/admin/jobs")) {
        return Promise.resolve(Response.json({ items: [], total: 0 }));
      }
      if (url.endsWith("/admin/invites")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      if (url.endsWith("/admin/audit")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      if (url.endsWith("/admin/provider")) {
        return Promise.resolve(
          Response.json({
            provider: "pippit",
            pippit: { provider: "pippit", connected: true, credits: 42 },
            kling: {
              provider: "kling",
              connected: true,
              credits: 200,
              userId: "5867025089",
            },
          }),
        );
      }
      if (url.endsWith("/admin/settings") && init?.method === "PATCH") {
        return Promise.resolve(
          Response.json({
            generation_enabled: false,
            registration_mode: "invite",
          }),
        );
      }
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminDashboard />);

    expect(
      await screen.findByRole("heading", { name: "VideoAgent Administration" }),
    ).toBeVisible();
    expect(screen.getByText("12")).toBeVisible();
    expect(screen.getByText("admin@example.com")).toBeVisible();
    expect(screen.getByText("Kling China")).toBeVisible();
    expect(screen.getByText("ID 5867025089")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Platform settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause generation" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/account/admin/settings",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ generation_enabled: false }),
        }),
      ),
    );
  }, 10_000);
});
