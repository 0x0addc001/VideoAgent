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
  it(
    "starts the first agent turn from a newly created project brief",
    async () => {
    window.history.replaceState({}, "", "/en#conversation/project-1?start=1");
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/projects/project-1/asset-selections")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      if (url.includes("/agent-activity/")) {
        return Promise.resolve(
          Response.json({
            items: [
              {
                id: "activity-1",
                run_id: "run-1",
                sequence: 1,
                kind: "context",
                label: "Assembled working context",
                detail: "locale=en · workflow=ready/approved",
                status: "completed",
                created_at: "2026-11-03T00:00:00Z",
              },
              {
                id: "activity-2",
                run_id: "run-1",
                sequence: 2,
                kind: "planning",
                label: "Storyboard plan ready",
                detail: "Selected 1 Characters and 2 Shots.",
                status: "completed",
                created_at: "2026-11-03T00:00:01Z",
              },
            ],
          }),
        );
      }
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
        return Promise.resolve(
          Response.json({
            items: [
              {
                id: "final-cut-1",
                project_id: "project-1",
                shot_id: null,
                kind: "export",
                filename: "final-cut.mp4",
                content_type: "video/mp4",
                byte_size: 1024,
                checksum: "checksum",
                permission: "private",
                content_url: "/api/v1/assets/final-cut-1/content",
                created_at: "2026-11-03T00:00:02Z",
                updated_at: "2026-11-03T00:00:02Z",
              },
            ],
          }),
        );
      }
      if (url.endsWith("/projects/project-1/visual-review/models")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      if (url.endsWith("/workspace") && !init?.method) {
        return Promise.resolve(
          Response.json({
            folders: [],
            recents: [
              {
                id: "project-1",
                title: "Copenhagen morning",
                brief: "A quiet Copenhagen morning told in one shot",
                folder_id: null,
                message_count: 2,
                preview: "I shaped this into a first treatment.",
                stage: "ready",
                status: "approved",
                created_at: "2026-11-03T00:00:00Z",
                updated_at: "2026-11-03T00:00:00Z",
              },
            ],
          }),
        );
      }
      if (url.endsWith("/projects/project-1/workflow") && !init?.method) {
        return Promise.resolve(
          Response.json({
            project_id: "project-1",
            stage: "ready",
            status: "approved",
            updated_at: "2026-11-03T00:00:00Z",
          }),
        );
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
              characters: [
                {
                  id: "character-1",
                  index: 0,
                  name: "Maya",
                  description: "A quiet observer moving through the city at dawn.",
                  prompt_en: "Editorial portrait of Maya in Copenhagen morning light",
                  prompt_zh: null,
                },
              ],
              scenes: [
                {
                  id: "scene-1",
                  index: 0,
                  name: "Copenhagen canal",
                  description: "A quiet canal-side location at sunrise.",
                  location: "Nyhavn",
                  prompt_en: "Cinematic Copenhagen canal at sunrise",
                  prompt_zh: null,
                },
              ],
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
            workflow: {
              project_id: "project-1",
              stage: "ready",
              status: "approved",
              updated_at: "2026-11-03T00:00:01Z",
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
            characters: [],
            scenes: [],
          }),
        );
      }
      if (url.endsWith("/shots/shot-1/estimate") && init?.method === "POST") {
        return Promise.resolve(
          Response.json({
            provider: "mock",
            credits: 5,
            duration_seconds: 5,
          }),
        );
      }
      if (url.endsWith("/shots/shot-1/generate") && init?.method === "POST") {
        return Promise.resolve(
          Response.json({
            id: "job-1",
            project_id: "project-1",
            shot_id: "shot-1",
            provider: "mock",
            provider_task_id: "mock-task-1",
            status: "succeeded",
            result_url: null,
            error_code: null,
            created_at: "2026-11-03T00:00:02Z",
          }),
        );
      }
      if (
        url.endsWith("/projects/project-1/collaborations") &&
        init?.method === "POST"
      ) {
        return Promise.resolve(
          Response.json({
            id: "collaboration-1",
            project_id: "project-1",
            permission: "view",
            collaborator_email: "editor@example.com",
            share_url: "http://localhost:3000/en/collaboration/token-1",
            expires_at: "2026-11-10T00:00:00Z",
            created_at: "2026-11-03T00:00:00Z",
          }),
        );
      }
      if (
        url.endsWith("/hots/from-asset/final-cut-1") &&
        init?.method === "POST"
      ) {
        return Promise.resolve(
          Response.json(
            {
              id: "post-1",
              asset_id: "final-cut-1",
              title: "Copenhagen morning",
              prompt: "A quiet Copenhagen morning told in one shot",
              skill: "auto",
              author: "creator",
              likes: 0,
              is_mine: true,
              is_liked: false,
              created_at: "2026-11-03T00:00:00Z",
            },
            { status: 201 },
          ),
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

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).endsWith("/projects/project-1/messages") &&
          init?.method === "POST",
      );
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
        content: "A quiet Copenhagen morning told in one shot",
        run_id: expect.any(String),
      });
    });
    expect(
      await screen.findByLabelText("I shaped this into a first treatment."),
    ).toBeVisible();
    expect(await screen.findByTestId("agent-activity")).toHaveTextContent(
      "Load project context",
    );
    expect(screen.getByTestId("agent-activity")).toHaveTextContent(
      "Plan the storyboard",
    );
    expect(screen.getAllByText("A quiet Copenhagen morning")).not.toHaveLength(0);
    expect(
      screen.getAllByRole("heading", { name: "Copenhagen morning" }),
    ).not.toHaveLength(0);
    expect(screen.getAllByText("Recents").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Directions" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Settings" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Visions" })).toBeVisible();
    expect(screen.getByTestId("workspace-header-canvas")).toHaveTextContent(
      "Storyboard",
    );
    expect(screen.getByRole("button", { name: "Characters" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Scenes" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Copenhagen canal" })).toBeVisible();
    expect(screen.getByText("Maya")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Description" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generation" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Shots" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Shot 1" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Versions" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Final Cut" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Upload asset")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Storyboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Media" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exports" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Collapse assets" }));
    expect(screen.getByRole("button", { name: "Expand assets" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Expand assets" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse agents" }));
    expect(screen.getByRole("button", { name: "Expand agents" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Expand agents" }));
    await waitFor(() =>
      expect(
        screen.getByLabelText("I shaped this into a first treatment."),
      ).toHaveAttribute("data-animate", "false"),
    );
    expect(screen.queryByText("2 shots")).not.toBeInTheDocument();
    expect(document.querySelector(".max-h-64")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByTestId("workspace-header-canvas")).toHaveTextContent(
      "Storyboard",
    );
    expect(screen.getByText("Attributes")).toBeVisible();
    expect(screen.getByText("Format")).toBeVisible();
    expect(screen.getByDisplayValue("One-shot film")).toBeVisible();
    expect(screen.queryByText("Creative brief")).not.toBeInTheDocument();
    expect(screen.queryByText("Director direction")).not.toBeInTheDocument();
    expect(screen.queryByText("Agent prompt")).not.toBeInTheDocument();
    expect(screen.queryByText("Director answer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Outlines" }));
    expect(
      document.querySelector('[data-document-mode="outline"]'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Scripts" }));
    expect(
      document.querySelector('[data-document-mode="script"]'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copenhagen canal" }));
    expect(await screen.findByLabelText("Scene location")).toHaveValue("Nyhavn");
    fireEvent.click(screen.getByRole("button", { name: "Shot 1" }));
    expect(screen.getByTestId("workspace-header-canvas")).toHaveTextContent(
      "Storyboard",
    );
    expect(screen.getByText("Upload")).toBeVisible();
    expect(screen.getByText("Prompt")).toBeVisible();
      fireEvent.change(screen.getByLabelText("Video model"), {
        target: { value: "Seedance_2.5" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Estimate credits" }),
      );
      await waitFor(() => {
        const estimateCall = fetchMock.mock.calls.find(
          ([input, init]) =>
            String(input).endsWith("/shots/shot-1/estimate") &&
            init?.method === "POST",
        );
        const body = estimateCall?.[1]?.body;
        if (!estimateCall || !body) return false;
        expect(JSON.parse(String(body))).toMatchObject({
          provider: "pippit",
          model: "Seedance_2.5",
        });
        return true;
      });
    expect(
      screen.queryByRole("button", { name: "Review" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Render final cut" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("progressbar", { name: "Progress" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /^final-cut\.mp4/ }),
    );
    expect(await screen.findByText("Final Cut review")).toBeVisible();
    expect(screen.getByText("No visual evaluator is configured.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /^Share$/ }));
    expect(screen.getByRole("dialog", { name: "Share and collaborate" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Invitee email (optional)"), {
      target: { value: "editor@example.com" },
    });
    expect(
      screen.getByRole("button", { name: "Collaboration access" }),
    ).toHaveTextContent("Can view");
    fireEvent.click(
      screen.getByRole("button", { name: "Collaboration access" }),
    );
    expect(screen.getByRole("listbox")).toBeVisible();
    fireEvent.click(screen.getByRole("option", { name: "Can view" }));
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    expect(
      await screen.findByDisplayValue(
        "http://localhost:3000/en/collaboration/token-1",
      ),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(
      screen.getByRole("button", { name: "Publish final-cut.mp4" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Publish final cut" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /^Publish$/ }));
    expect(await screen.findByText("Published to Videos")).toBeVisible();
    },
    30_000,
  );

  it(
    "shows approval options and advances only after the user approves",
    async () => {
    window.history.replaceState({}, "", "/en/projects/project-approval");
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/projects/project-approval/asset-selections")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      if (url.endsWith("/projects/project-approval/progress")) {
        return Promise.resolve(
          Response.json({
            percent: 30,
            workflow_stage: "concept",
            workflow_status: "awaiting_approval",
            total_shots: 0,
            completed_shots: 0,
            updated_at: "2026-11-03T00:00:00Z",
          }),
        );
      }
      if (url.includes("/agent-activity/")) {
        return Promise.resolve(
          Response.json({
            items: [
              {
                id: "approval-activity-1",
                run_id: "approval-run",
                sequence: 1,
                kind: "context",
                label: "Assembled workflow context",
                detail: "stage=concept/awaiting_approval",
                status: "completed",
                created_at: "2026-11-03T00:00:00Z",
              },
              {
                id: "approval-activity-2",
                run_id: "approval-run",
                sequence: 2,
                kind: "state",
                label: "Workflow state updated",
                detail: "stage=outline · status=awaiting_approval",
                status: "completed",
                created_at: "2026-11-03T00:00:01Z",
              },
            ],
          }),
        );
      }
      if (url.endsWith("/projects/project-approval") && !init?.method) {
        return Promise.resolve(
          Response.json({
            id: "project-approval",
            title: "Layered story",
            brief: "A short branded drama",
            state: "draft",
            created_at: "2026-11-03T00:00:00Z",
            updated_at: "2026-11-03T00:00:00Z",
          }),
        );
      }
      if (url.endsWith("/projects/project-approval/storyboard")) {
        return Promise.resolve(
          Response.json({
            id: "storyboard-approval",
            project_id: "project-approval",
            version: 1,
            shots: [],
          }),
        );
      }
      if (url.endsWith("/projects/project-approval/messages")) {
        return Promise.resolve(
          Response.json({
            items: [
              {
                id: "assistant-approval",
                role: "assistant",
                content: "Review the overall creative direction.",
                created_at: "2026-11-03T00:00:01Z",
              },
            ],
          }),
        );
      }
      if (url.endsWith("/projects/project-approval/assets")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      if (url.endsWith("/workspace")) {
        return Promise.resolve(Response.json({ folders: [], recents: [] }));
      }
      if (url.endsWith("/projects/project-approval/workflow") && !init?.method) {
        return Promise.resolve(
          Response.json({
            project_id: "project-approval",
            stage: "concept",
            status: "awaiting_approval",
            updated_at: "2026-11-03T00:00:00Z",
          }),
        );
      }
      if (url.endsWith("/workflow/decision") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toMatchObject({
          choice: "approve",
          run_id: expect.any(String),
        });
        return Promise.resolve(
          Response.json({
            user_message: {
              id: "approved-message",
              role: "user",
              content: "Approve concept",
              created_at: "2026-11-03T00:00:02Z",
            },
            assistant_message: {
              id: "outline-message",
              role: "assistant",
              content: "The outline is ready for review.",
              created_at: "2026-11-03T00:00:03Z",
            },
            storyboard: {
              id: "storyboard-approval",
              project_id: "project-approval",
              version: 2,
              shots: [],
            },
            workflow: {
              project_id: "project-approval",
              stage: "outline",
              status: "awaiting_approval",
              updated_at: "2026-11-03T00:00:03Z",
            },
          }),
        );
      }
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ProjectWorkspace projectId="project-approval" />
      </NextIntlClientProvider>,
    );

    expect(
      await screen.findByRole("button", { name: "Continue with this direction" }),
    ).toBeVisible();
    expect(
      screen.getByLabelText("Review the overall creative direction."),
    ).toHaveAttribute("data-animate", "false");
    expect(
      container.querySelector('.streaming-text[data-animate="true"]'),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with this direction" }),
    );

    expect(
      await screen.findByRole("button", { name: "Add another story beat" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Custom instruction" }),
    ).toBeVisible();
    },
    10_000,
  );
});
