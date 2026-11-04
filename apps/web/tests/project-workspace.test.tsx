import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../messages/en.json";
import { ProjectWorkspace } from "@/components/project-workspace";

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
  window.history.replaceState({}, "", "/");
});

describe("ProjectWorkspace", () => {
  it("starts the first agent turn from a newly created project brief", async () => {
    window.history.replaceState({}, "", "/en/projects/project-1?start=1");
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/projects/project-1") && !init?.method) {
        return Promise.resolve(
          Response.json({
            id: "project-1",
            title: "Copenhagen morning",
            brief: "A quiet Copenhagen morning told in one shot",
            state: "draft",
            created_at: "2026-11-03T00:00:00Z",
            updated_at: "2026-11-03T00:00:00Z",
          }),
        );
      }
      if (url.endsWith("/projects/project-1/storyboard")) {
        return Promise.resolve(new Response(null, { status: 404 }));
      }
      if (url.endsWith("/projects/project-1/messages") && !init?.method) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      if (url.endsWith("/projects/project-1/assets") && !init?.method) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      if (url.endsWith("/projects/project-1/messages") && init?.method === "POST") {
        return Promise.resolve(
          Response.json({
            user_message: {
              id: "message-1",
              role: "user",
              content: "A quiet Copenhagen morning told in one shot",
              created_at: "2026-11-03T00:00:00Z",
            },
            assistant_message: {
              id: "message-2",
              role: "assistant",
              content: "I shaped this into a first treatment.",
              created_at: "2026-11-03T00:00:01Z",
            },
            storyboard: {
              id: "storyboard-1",
              project_id: "project-1",
              version: 1,
              shots: [
                {
                  id: "shot-1",
                  index: 0,
                  description: "A quiet Copenhagen morning",
                  prompt_en: "A quiet Copenhagen morning",
                  prompt_zh: null,
                  duration_seconds: 5,
                  aspect_ratio: "16:9",
                  generation_mode: "text_to_video",
                  status: "draft",
                },
                {
                  id: "shot-2",
                  index: 1,
                  description: "Light moves across the canal",
                  prompt_en: "Light moves across the canal",
                  prompt_zh: null,
                  duration_seconds: 5,
                  aspect_ratio: "16:9",
                  generation_mode: "text_to_video",
                  status: "draft",
                },
              ],
            },
          }),
        );
      }
      if (
        url.endsWith("/projects/project-1/storyboard/order") &&
        init?.method === "PATCH"
      ) {
        return Promise.resolve(
          Response.json({
            id: "storyboard-1",
            project_id: "project-1",
            version: 2,
            shots: [
              {
                id: "shot-2",
                index: 0,
                description: "Light moves across the canal",
                prompt_en: "Light moves across the canal",
                prompt_zh: null,
                duration_seconds: 5,
                aspect_ratio: "16:9",
                generation_mode: "text_to_video",
                status: "draft",
              },
              {
                id: "shot-1",
                index: 1,
                description: "A quiet Copenhagen morning",
                prompt_en: "A quiet Copenhagen morning",
                prompt_zh: null,
                duration_seconds: 5,
                aspect_ratio: "16:9",
                generation_mode: "text_to_video",
                status: "draft",
              },
            ],
          }),
        );
      }
      if (url.endsWith("/projects/project-1/evaluate") && init?.method === "POST") {
        return Promise.resolve(
          Response.json({
            overall_score: 88,
            metrics: [
              { key: "consistency", score: 92 },
              { key: "coverage", score: 100 },
              { key: "clarity", score: 84 },
              { key: "pacing", score: 80 },
            ],
            suggestions: [{ code: "IMPROVE_PROMPTS", severity: "medium" }],
          }),
        );
      }
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ProjectWorkspace projectId="project-1" />
      </NextIntlClientProvider>,
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/projects/project-1/messages",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            content: "A quiet Copenhagen morning told in one shot",
          }),
        }),
      ),
    );
    expect(
      await screen.findByLabelText("I shaped this into a first treatment."),
    ).toBeVisible();
    expect(screen.getAllByText("A quiet Copenhagen morning")).not.toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Move shot later" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/projects/project-1/storyboard/order",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ shot_ids: ["shot-2", "shot-1"] }),
        }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    expect(await screen.findByRole("heading", { name: "Project review" })).toBeVisible();
    expect(screen.getByText("88")).toBeVisible();
    expect(screen.getByText("Consistency")).toBeVisible();
    expect(
      screen.getByText("Add subject, environment, and action details to prompts."),
    ).toBeVisible();
  });
});
