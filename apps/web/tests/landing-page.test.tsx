import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "@videoagent/landing";

const props = {
  locale: "en" as const,
  mode: "project" as const,
  videos: [
    { src: "/media/vlog-hero.mp4", poster: "/media/vlog-hero-poster.jpg" },
    {
      src: "/media/vlog-hero-european.mp4",
      poster: "/media/vlog-hero-european-poster.jpg",
    },
    {
      src: "/media/vlog-hero-black.mp4",
      poster: "/media/vlog-hero-black-poster.jpg",
    },
  ],
  docsBase: "/docs/",
};

afterEach(() => {
  window.history.replaceState({}, "", "/");
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LandingPage", () => {
  it("keeps left-side navigation, a VA brand, and creation composer", () => {
    const { container } = render(<LandingPage {...props} />);
    const nav = container.querySelector(".site-header > nav");
    const composer = container.querySelector(".creation-composer");

    expect(container.querySelector(".site-header > nav")).toHaveTextContent(
      "Agents",
    );
    expect(nav?.textContent).toContain("Skills");
    expect(nav?.textContent).toContain("Assets");
    expect(nav?.textContent).toContain("Hots");
    expect(nav?.textContent).toContain("Docs");
    expect(
      [...(nav?.querySelectorAll("button") ?? [])].map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(["Agents", "Skills", "Hots", "Assets", "Docs"]);
    expect(nav?.querySelectorAll(".nav-icon")).toHaveLength(5);
    expect(container.querySelector(".language-button")).toBeInTheDocument();
    expect(container.querySelector(".notification-button svg")).toBeInTheDocument();
    expect(container.querySelector(".brand-mark .brand-play")).toBeInTheDocument();
    expect(composer).toBeInTheDocument();
    expect(composer?.querySelectorAll(".composer-select")).toHaveLength(9);
    expect(composer?.querySelector(".composer-select-skill")).toBeInTheDocument();
    expect(
      [...(composer?.querySelectorAll(".composer-select-trigger") ?? [])].map(
        (trigger) => trigger.textContent,
      ),
    ).toEqual([
      "Skill",
      "Hook",
      "Style",
      "Frame",
      "Length",
      "Model",
      "Quality",
      "Audio",
      "Review",
    ]);
    expect(composer?.querySelectorAll("select")).toHaveLength(0);
    expect(container.querySelector(".credit-count")).toHaveTextContent("0");
    expect(container.querySelector(".account-avatar svg")).toBeInTheDocument();
    expect(container.querySelector("a.account-summary")).not.toBeInTheDocument();
    const actionItems = [...container.querySelectorAll(".header-actions > *")];
    expect(actionItems.map((item) => item.className)).toEqual([
      "language-switcher",
      "notification-switcher",
      "credit-count",
      "account-switcher",
    ]);
    expect(container.querySelector(".account-menu")).not.toBeVisible();
    fireEvent.click(container.querySelector(".account-avatar")!);
    expect(container.querySelector(".account-menu")).toBeVisible();
    expect(container.querySelector(".account-menu")).toHaveTextContent("Log in");
    expect(container.querySelector(".account-menu")).toHaveTextContent("Register");
    expect(container.querySelector("footer")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".hero-video-frame")).toHaveLength(6);
    const videoSources = [...container.querySelectorAll(".hero-video-frame source")].map(
      (source) => source.getAttribute("src"),
    );
    expect(new Set(videoSources).size).toBe(3);
    expect(container.querySelector(".hero-copy h1")).toHaveTextContent("VideoAgent");
    expect(container.querySelector(".hero-copy h1")).toHaveTextContent(
      "You Are the Director",
    );
    expect(container.querySelector(".hero-copy h1")).toHaveAttribute(
      "data-hero-stream",
      "loop",
    );
    expect(container.querySelector(".hero-line-brand .hero-title-icon")).toBeInTheDocument();
    expect(container.querySelectorAll(".hero-line-ghost")).toHaveLength(2);
    expect(container.querySelector("#skills")).not.toBeInTheDocument();
    expect(container.querySelector("#assets")).not.toBeInTheDocument();
    expect(container.querySelector("#hots")).not.toBeInTheDocument();
    expect(container.querySelector(".hero-description")).not.toBeInTheDocument();
    expect(container.querySelector(".composer-github")).not.toBeInTheDocument();
    expect(composer?.querySelector(".idea-row")).toBeInTheDocument();
  });

  it("switches between isolated navigation views", () => {
    const { container } = render(<LandingPage {...props} />);

    fireEvent.click(container.querySelector('button[aria-current="page"]')!);
    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Skills",
      )!,
    );
    expect(container.querySelector("#skills .skill-code")).toHaveTextContent(
      "video_agent/search_all_resources",
    );
    expect(container.querySelectorAll("#skills .skill-group")).toHaveLength(0);
    expect(
      container.querySelectorAll("#skills .skill-card:not(.skill-publish-card)"),
    ).toHaveLength(23);
    expect(container.querySelector("#skills")).toHaveTextContent("Search all resources");
    expect(container.querySelector("#skills")).toHaveTextContent(
      "kling/text_to_video",
    );
    expect(container.querySelector("#skills")).toHaveTextContent("Style transfer");
    expect(container.querySelector("#skills")).toHaveTextContent("Product film");
    expect(container.querySelector("#skills")).toHaveTextContent("Short drama");
    expect(container.querySelector("#skills")).toHaveTextContent("Skill synthesis");
    expect(container.querySelector("#skills")).toHaveTextContent("Storyboard review");
    expect(container.querySelector("#skills .skill-card-copy small")).not.toBeInTheDocument();
    expect(container.querySelector("#skills .view-search input")).toBeInTheDocument();
    expect(container.querySelector(".skill-publish-card")).toBeInTheDocument();
    expect(container.querySelector("#agents")).not.toBeInTheDocument();

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Assets",
      )!,
    );
    expect(container.querySelector("#assets .asset-card")).toHaveTextContent(
      "Quiet Copenhagen",
    );
    expect(container.querySelector("#assets .asset-card")).toHaveTextContent(
      "2026-11-03",
    );
    expect(container.querySelector("#assets .asset-card")).toHaveTextContent("public");
    const assetVideo = container.querySelector("#assets .asset-card video");
    expect(assetVideo).toBeInTheDocument();
    expect(assetVideo).not.toHaveAttribute("autoplay");
    expect(container.querySelector("#assets .asset-card img")).not.toBeInTheDocument();
    expect(container.querySelector("#assets .view-search input")).toBeInTheDocument();
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    fireEvent.mouseEnter(assetVideo!);
    fireEvent.mouseLeave(assetVideo!);
    expect(play).toHaveBeenCalled();
    expect(pause).toHaveBeenCalled();
    fireEvent.click(
      [...container.querySelectorAll("#assets .asset-tabs button")].find(
        (button) => button.textContent?.trim() === "Skill",
      )!,
    );
    expect(container.querySelectorAll("#assets .asset-card")).toHaveLength(2);
    expect(container.querySelector("#assets img")).not.toBeInTheDocument();
    expect(container.querySelector("#assets video")).not.toBeInTheDocument();
    expect(container.querySelector("#assets")).not.toHaveTextContent(
      "Quiet Copenhagen",
    );
    expect(container.querySelector("#skills")).not.toBeInTheDocument();

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Hots",
      )!,
    );
    expect(
      container.querySelector("#hots .community-card:not(.community-publish-card)"),
    ).toHaveTextContent("Editorial vlog");
    expect(
      container.querySelector(
        "#hots .community-card:not(.community-publish-card) .community-card-content",
      )?.firstElementChild,
    ).toHaveClass("community-card-title");
    expect(container.querySelector(".community-author")).toHaveTextContent("Maya Chen");
    expect(container.querySelector(".community-likes")).toHaveTextContent("128");
    expect(container.querySelectorAll("#hots .community-card video")).toHaveLength(10);
    expect(container.querySelector("#hots video")).toHaveAttribute("autoplay");
    expect(
      container.querySelector(".community-publish-card .community-publish-icon"),
    ).toBeInTheDocument();
    expect(container.querySelector(".community-publish-card")).toHaveTextContent(
      "Publish video",
    );
    expect(container.querySelector("#hots .community-action")).toHaveTextContent(
      "Make this",
    );

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Docs",
      )!,
    );
    expect(container.querySelector("#docs iframe")).toHaveAttribute(
      "src",
      "/docs/product-requirements.html?v=31",
    );
    expect(container.querySelectorAll(".docs-tab-icon")).toHaveLength(9);
    expect(
      [...container.querySelectorAll(".docs-tabs button")].map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual([
      "PRD",
      "Playbook",
      "Arch",
      "API",
      "Dev",
      "Test",
      "Ops",
      "FAQ",
      "TODO",
    ]);
    fireEvent.click(
      [...container.querySelectorAll(".docs-tabs button")].find(
        (button) => button.textContent?.trim() === "FAQ",
      )!,
    );
    expect(container.querySelector("#docs iframe")).toHaveAttribute(
      "src",
      "/docs/faq.html?v=31",
    );

    fireEvent.click(container.querySelector(".language-button")!);
    fireEvent.click(
      [...container.querySelectorAll(".language-options button")].find(
        (button) => button.textContent === "中文",
      )!,
    );
    expect(container.querySelector("#docs iframe")).toHaveAttribute(
      "src",
      "/docs/faq.zh.html?v=31",
    );
    expect(
      [...container.querySelectorAll(".docs-tabs button")].map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(["产品", "玩法", "架构", "接口", "开发", "测试", "运营", "客服", "待办"]);
    expect(container.querySelector(".site-header > nav")).toHaveTextContent(
      "Agents",
    );
  });

  it("grows the prompt with its content and hides suggestions while typing", () => {
    const { container } = render(<LandingPage {...props} />);
    const textarea = container.querySelector(
      ".creation-composer textarea",
    ) as HTMLTextAreaElement;
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      get: () => 188,
    });

    fireEvent.change(textarea, {
      target: { value: "First line\nSecond line\nThird line" },
    });

    expect(textarea.style.height).toBe("188px");
    expect(container.querySelector(".idea-row")).not.toBeInTheDocument();
    expect(container.querySelector(".playbook-row")).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "" } });

    expect(container.querySelector(".idea-row")).toBeInTheDocument();
    expect(container.querySelector(".playbook-row")).toBeInTheDocument();
  });

  it("uses a custom transparent settings menu", () => {
    const { container } = render(<LandingPage {...props} />);
    const styleTrigger = container.querySelector(
      '.composer-select-trigger[aria-label="Style"]',
    );

    fireEvent.click(styleTrigger!);
    expect(document.querySelector(".composer-select-menu")).toBeInTheDocument();
    fireEvent.click(
      [...document.querySelectorAll(".composer-select-option")].find(
        (option) => option.textContent === "Cinematic",
      )!,
    );
    expect(styleTrigger).toHaveTextContent("Cinematic");
    expect(document.querySelector(".composer-select-menu")).not.toBeInTheDocument();
  });

  it("lists every available video model with its provider", () => {
    const { container } = render(<LandingPage {...props} />);
    const modelTrigger = container.querySelector(
      '.composer-select-trigger[aria-label="Model"]',
    )!;

    fireEvent.click(modelTrigger);

    const options = [...document.querySelectorAll(".composer-select-option")];
    expect(options).toHaveLength(16);
    expect(options.map((option) => option.textContent)).toEqual([
      "Auto",
      "Kling/Kling Video 4.0",
      "Kling/Kling Video 3.0 Omni",
      "Kling/Kling Video 3.0",
      "Kling/Kling Video 3.0 Turbo",
      "Kling/Kling Video O1",
      "Kling/Kling Video 2.6",
      "Kling/Kling Video 2.5",
      "Pippit/Seedance 2.5 Draft",
      "Pippit/Seedance 2.5",
      "Pippit/Seedance 2.0 Fast VIP",
      "Pippit/Seedance 2.0 VIP",
      "Pippit/Seedance 2.0 Mini Preview",
      "Pippit/Seedance 2.0 Mini",
      "Pippit/Wan 3.0",
      "Pippit/HappyHorse 1.1",
    ]);

    fireEvent.click(
      options.find((option) => option.textContent === "Kling/Kling Video 4.0")!,
    );
    expect(modelTrigger).toHaveTextContent("Kling/Kling Video 4.0");
  });

  it("opens composer menus upward when there is not enough space below", () => {
    vi.stubGlobal("innerHeight", 400);
    const { container } = render(<LandingPage {...props} />);
    const styleTrigger = container.querySelector(
      '.composer-select-trigger[aria-label="Style"]',
    )!;
    vi.spyOn(styleTrigger, "getBoundingClientRect").mockReturnValue({
      bottom: 360,
      height: 40,
      left: 0,
      right: 180,
      top: 320,
      width: 180,
      x: 0,
      y: 320,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.click(styleTrigger);

    expect(document.querySelector(".composer-select-menu")).toHaveAttribute(
      "data-placement",
      "top",
    );
  });

  it("keeps length and quality menus inside the viewport near the bottom", () => {
    vi.stubGlobal("innerHeight", 300);
    const { container } = render(<LandingPage {...props} />);

    for (const label of ["Length", "Quality"]) {
      const trigger = container.querySelector(
        `.composer-select-trigger[aria-label="${label}"]`,
      )!;
      vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
        bottom: 280,
        height: 40,
        left: 900,
        right: 1080,
        top: 240,
        width: 180,
        x: 900,
        y: 240,
        toJSON: () => ({}),
      } as DOMRect);

      fireEvent.click(trigger);
      const menu = document.querySelector(".composer-select-menu") as HTMLElement;
      expect(menu).toHaveAttribute("data-placement", "top");
      expect(Number.parseFloat(menu.style.top)).toBeGreaterThanOrEqual(12);
      expect(Number.parseFloat(menu.style.maxHeight)).toBeLessThanOrEqual(220);
      fireEvent.click(trigger);
    }
  });

  it("shows the signed-in account menu and signs out", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/credits")) {
        return { ok: true, json: async () => ({ credits: 42 }) };
      }
      if (url.endsWith("/auth/me")) {
        return { ok: true, json: async () => ({ email: "creator@example.com" }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(
      <LandingPage {...props} accountApiBase="/api/account" mode="app" />,
    );

    await waitFor(() =>
      expect(container.querySelector(".account-avatar")).toHaveTextContent("CR"),
    );
    fireEvent.click(container.querySelector(".account-avatar")!);
    expect(container.querySelector(".account-menu")).toHaveTextContent(
      "creator@example.com",
    );
    fireEvent.click(
      [...container.querySelectorAll(".account-menu button")].find(
        (button) => button.textContent === "Sign out",
      )!,
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/account/auth/logout",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(container.querySelector(".account-menu")).toHaveTextContent("Log in");
  });

  it("publishes a Hots post with an uploaded video", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/hots") && init?.method === "POST") {
        expect(init.body).toBeInstanceOf(FormData);
        return Promise.resolve(
          Response.json({
            id: "hot-1",
            asset_id: "asset-1",
            title: "A new film from my studio",
            prompt: "A new film from my studio",
            skill: "auto",
            author: "studio_author",
            likes: 0,
            is_mine: true,
            created_at: "2026-11-05T00:00:00Z",
          }),
        );
      }
      if (url.endsWith("/hots")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      if (url.endsWith("/assets")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      if (url.endsWith("/workspace")) {
        return Promise.resolve(Response.json({ folders: [], recents: [] }));
      }
      if (url.endsWith("/skills")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      return Promise.resolve(new Response(null, { status: 401 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(
      <LandingPage {...props} accountApiBase="/api/account" mode="app" />,
    );

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Hots",
      )!,
    );
    fireEvent.click(container.querySelector(".community-publish-card")!);
    const dialog = container.querySelector(".publish-dialog")!;
    fireEvent.change(dialog.querySelector(".hots-publish-field input")!, {
      target: { value: "A new film from my studio" },
    });
    fireEvent.change(container.querySelector(".publish-dialog textarea")!, {
      target: { value: "A new film from my studio" },
    });
    fireEvent.change(dialog.querySelector('input[type="file"]')!, {
      target: {
        files: [
          new File(["video"], "studio.mp4", {
            type: "video/mp4",
          }),
        ],
      },
    });
    fireEvent.click(
      container.querySelector('.publish-dialog button[type="submit"]')!,
    );

    await waitFor(() =>
      expect(
        container.querySelector(".community-card:not(.community-publish-card)"),
      ).toHaveTextContent("A new film from my studio"),
    );
    expect(container.querySelector(".community-author")).toHaveTextContent(
      "studio_author",
    );
    expect(container.querySelector(".community-likes")).toHaveTextContent("0");
  });

  it("publishes a user skill with a namespaced ID", async () => {
    const optimized = {
      skill_id: "lip_sync",
      title: "Lip Sync",
      description: "Synchronize speech motion to a supplied audio track.",
      instructions:
        "Goal\nSynchronize speech motion.\n\nQuality gates\nPreserve identity.",
      prompt_template: "Synchronize this character with the supplied audio:",
      input_schema: { type: "object", required: ["request"] },
      output_schema: { type: "object", required: ["result"] },
    };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/skills/optimize") && init?.method === "POST") {
        return Promise.resolve(Response.json(optimized));
      }
      if (url.endsWith("/skills") && init?.method === "POST") {
        return Promise.resolve(
          Response.json({
            ...optimized,
            id: "skill-1",
            user_id: "skill_author",
            visibility: "public",
            created_at: "2026-11-05T00:00:00Z",
            updated_at: "2026-11-05T00:00:00Z",
          }),
        );
      }
      if (url.endsWith("/skills")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      return Promise.resolve(new Response(null, { status: 401 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(
      <LandingPage
        {...props}
        accountApiBase="/api/account"
        mode="app"
      />,
    );

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Skills",
      )!,
    );
    fireEvent.click(container.querySelector(".skill-publish-card")!);
    fireEvent.change(
      [...container.querySelectorAll(".skill-publish-dialog label")].find(
        (label) => label.textContent?.includes("Your idea"),
      )!.querySelector("textarea")!,
      {
        target: {
          value: "Create a reusable lip sync workflow for character videos",
        },
      },
    );
    fireEvent.click(
      [...container.querySelectorAll(".skill-optimize-row button")][0]!,
    );
    await waitFor(() =>
      expect(container.querySelector('input[placeholder="my_skill"]')).toHaveValue(
        "lip_sync",
      ),
    );
    fireEvent.click(
      container.querySelector('.skill-publish-dialog button[type="submit"]')!,
    );

    await waitFor(() =>
      expect(
        container.querySelector("#skills .skill-card:not(.skill-publish-card)"),
      ).toHaveTextContent("skill_author/lip_sync"),
    );
    expect(container.querySelector("#skills")).toHaveTextContent("Lip Sync");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/skills",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"instructions"'),
      }),
    );
  });

  it("opens Skill synthesis directly in the structured skill studio", () => {
    const { container } = render(<LandingPage {...props} mode="app" />);

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Skills",
      )!,
    );
    const synthesis = [...container.querySelectorAll("#skills .skill-card")].find(
      (card) => card.textContent?.includes("skill_synthesis"),
    )!;
    fireEvent.click(synthesis);

    expect(container.querySelector(".skill-publish-dialog")).toBeInTheDocument();
    expect(container.querySelector(".skill-optimize-action")).toBeInTheDocument();
    expect(container.querySelector(".skill-publish-dialog textarea")).toHaveValue(
      "A reusable video skill that ",
    );
  });

  it("creates project folders and starts a new conversation from history plus buttons", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/me")) {
        return Promise.resolve(
          Response.json({
            id: "user-1",
            email: "director@example.com",
            locale: "en",
            created_at: "2026-11-05T00:00:00Z",
          }),
        );
      }
      if (url.endsWith("/workspace/folders") && init?.method === "POST") {
        return Promise.resolve(
          Response.json({
            id: "folder-1",
            name: "Campaign work",
            created_at: "2026-11-05T00:00:00Z",
            updated_at: "2026-11-05T00:00:00Z",
          }),
        );
      }
      if (url.endsWith("/workspace")) {
        return Promise.resolve(Response.json({ folders: [], recents: [] }));
      }
      if (url.endsWith("/skills")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      if (url.endsWith("/hots")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      if (url.endsWith("/assets")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      return Promise.resolve(new Response(null, { status: 401 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(
      <LandingPage {...props} accountApiBase="/api/account" mode="app" />,
    );

    await waitFor(() =>
      expect(
        container.querySelector('[aria-label="Create project"]'),
      ).toBeInTheDocument(),
    );
    fireEvent.click(container.querySelector('[aria-label="Create project"]')!);
    fireEvent.change(container.querySelector(".project-folder-field input")!, {
      target: { value: "Campaign work" },
    });
    fireEvent.click(
      container.querySelector('.project-folder-dialog button[type="submit"]')!,
    );
    await waitFor(() =>
      expect(container.querySelector(".sidebar-history")).toHaveTextContent(
        "Campaign work",
      ),
    );

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Skills",
      )!,
    );
    fireEvent.click(container.querySelector('[aria-label="New conversation"]')!);
    expect(container.querySelector("#agents")).toBeInTheDocument();
  });

  it("opens a conversation as a same-page view without replacing the route", async () => {
    window.history.replaceState({}, "", "/en?workspace=stable");
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/me")) {
        return Promise.resolve(
          Response.json({
            id: "user-1",
            email: "director@example.com",
            locale: "en",
            created_at: "2026-11-05T00:00:00Z",
          }),
        );
      }
      if (url.endsWith("/workspace")) {
        return Promise.resolve(
          Response.json({
            folders: [{ id: "folder-1", name: "Campaign work" }],
            recents: [
              {
                id: "project-1",
                title: "Campaign cut",
                brief: "A product film",
                preview: null,
                stage: "script",
                status: "awaiting_approval",
                folder_id: null,
                message_count: 2,
                created_at: "2026-11-05T00:00:00Z",
                updated_at: "2026-11-05T00:00:00Z",
              },
              {
                id: "project-2",
                title: "Filed cut",
                brief: "A documentary",
                preview: null,
                stage: "outline",
                status: "awaiting_approval",
                folder_id: "folder-1",
                message_count: 1,
                created_at: "2026-11-05T00:00:00Z",
                updated_at: "2026-11-05T00:00:00Z",
              },
            ],
          }),
        );
      }
      if (
        url.endsWith("/skills") ||
        url.endsWith("/hots") ||
        url.endsWith("/assets")
      ) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      return Promise.resolve(Response.json({ credits: 0 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(
      <LandingPage
        {...props}
        accountApiBase="/api/account"
        mode="app"
        renderConversation={(projectId) => (
          <div data-testid="conversation-content">{projectId}</div>
        )}
      />,
    );

    const conversation = await waitFor(() => {
      const link = container.querySelector('a[href="#conversation/project-1"]');
      expect(link).toBeInTheDocument();
      return link as HTMLAnchorElement;
    });
    expect(conversation.querySelector("svg")).not.toBeInTheDocument();
    const folderSummary = container.querySelector(
      ".sidebar-project-list details summary",
    );
    expect(folderSummary?.querySelector(".project-folder-chevron")).toBeInTheDocument();
    expect(folderSummary?.querySelector(".project-folder-icon")).toBeInTheDocument();
    expect(
      folderSummary?.querySelector("span")?.textContent,
    ).toBe("Campaign work");
    expect(
      container.querySelector(".sidebar-project-list .sidebar-thread"),
    ).toHaveTextContent("Filed cut");
    expect(
      container.querySelectorAll(".sidebar-recent-list .sidebar-thread"),
    ).toHaveLength(1);
    expect(
      container.querySelector('[aria-label="Create project"]'),
    ).toHaveClass("sidebar-history-add");

    const dataTransfer = {
      getData: () => "project-1",
      setData: vi.fn(),
    } as unknown as DataTransfer;
    fireEvent.dragStart(conversation, { dataTransfer });
    fireEvent.dragOver(folderSummary!, { dataTransfer });
    fireEvent.drop(folderSummary!, { dataTransfer });
    await waitFor(() =>
      expect(
        container.querySelectorAll(".sidebar-project-list .sidebar-thread"),
      ).toHaveLength(2),
    );
    expect(
      container.querySelectorAll(".sidebar-recent-list .sidebar-thread"),
    ).toHaveLength(0);

    fireEvent.click(
      container.querySelector('a[href="#conversation/project-1"]')!,
    );

    expect(window.location.pathname).toBe("/en");
    expect(window.location.search).toBe("?workspace=stable");
    expect(window.location.hash).toBe("#conversation/project-1");
    expect(
      await waitFor(() =>
        container.querySelector('[data-testid="conversation-content"]'),
      ),
    ).toHaveTextContent("project-1");
  });

  it("shows Projects and Recents before sign-in and without conversations", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null, { status: 401 }))),
    );
    const { container } = render(
      <LandingPage {...props} accountApiBase="/api/account" mode="app" />,
    );

    const history = container.querySelector(".sidebar-history");
    expect(history).toBeVisible();
    expect(history).toHaveTextContent("Projects");
    expect(history).toHaveTextContent("Recents");
    expect(history?.querySelectorAll(".sidebar-thread")).toHaveLength(0);
    expect(history?.querySelector(".sidebar-project-list svg")).toBeNull();
  });

  it("searches Skills, Hots, and Assets", () => {
    const { container } = render(<LandingPage {...props} />);

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Skills",
      )!,
    );
    fireEvent.change(container.querySelector("#skills .view-search input")!, {
      target: { value: "video_agent/review" },
    });
    expect(
      container.querySelectorAll("#skills .skill-card:not(.skill-publish-card)"),
    ).toHaveLength(1);
    expect(container.querySelector("#skills .skill-code")).toHaveTextContent(
      "video_agent/review",
    );

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Hots",
      )!,
    );
    fireEvent.change(container.querySelector("#hots .view-search input")!, {
      target: { value: "night" },
    });
    expect(container.querySelectorAll("#hots .community-card video")).toHaveLength(1);
    expect(container.querySelector("#hots")).toHaveTextContent("Night city");
    expect(container.querySelector("#hots")).not.toHaveTextContent("Editorial vlog");

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Assets",
      )!,
    );
    fireEvent.click(
      [...container.querySelectorAll("#assets .asset-tabs button")].find(
        (button) => button.textContent?.trim() === "Skill",
      )!,
    );
    fireEvent.change(container.querySelector("#assets .view-search input")!, {
      target: { value: "review" },
    });
    expect(container.querySelectorAll("#assets .asset-card")).toHaveLength(1);
    expect(container.querySelector("#assets")).toHaveTextContent(
      "Storyboard review",
    );
  });

  it("opens a skill in Agents with the matching skill selected", () => {
    const { container } = render(<LandingPage {...props} />);

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Skills",
      )!,
    );
    const skillCard = [...container.querySelectorAll("#skills .skill-card")].find(
      (card) => card.textContent?.includes("kling/text_to_video"),
    )!;
    fireEvent.click(skillCard);

    expect(container.querySelector("#agents")).toBeInTheDocument();
    expect(
      container.querySelector('.composer-select-trigger[aria-label="Skill"]'),
    ).toHaveTextContent("kling/text_to_video");
    expect(container.querySelector(".creation-composer textarea")).toHaveValue(
      "Create a five-second cinematic clip from this idea:",
    );
  });

  it("applies a production playbook to the composer", () => {
    const { container } = render(<LandingPage {...props} />);
    const playbook = [...container.querySelectorAll(".playbook-row button")].find(
      (button) => button.textContent === "Product ad",
    );

    fireEvent.click(playbook!);

    expect(
      (container.querySelector(".creation-composer textarea") as HTMLTextAreaElement)
        .value,
    ).toContain("ten-second product ad");
    expect(
      container.querySelector('.composer-select-trigger[aria-label="Skill"]'),
    ).toHaveTextContent("video_agent/product_film");
    expect(
      container.querySelector('.composer-select-trigger[aria-label="Hook"]'),
    ).toHaveTextContent("Proof first");
    expect(
      container.querySelector('.composer-select-trigger[aria-label="Style"]'),
    ).toHaveTextContent("Product");
    expect(
      container.querySelector('.composer-select-trigger[aria-label="Frame"]'),
    ).toHaveTextContent("9:16");
    expect(
      container.querySelector('.composer-select-trigger[aria-label="Review"]'),
    ).toHaveTextContent("Ask first");
    expect(playbook).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(playbook!);

    expect(playbook).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelector(".creation-composer textarea")).toHaveValue("");
    expect(
      container.querySelector('.composer-select-trigger[aria-label="Skill"]'),
    ).toHaveTextContent("Skill");
    expect(
      container.querySelector('.composer-select-trigger[aria-label="Hook"]'),
    ).toHaveTextContent("Hook");
  });

  it("opens a scenario from Hots with its skill already selected", () => {
    const { container } = render(<LandingPage {...props} />);
    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Hots",
      )!,
    );
    const scenario = [...container.querySelectorAll("#hots .community-card")].find(
      (card) => card.textContent?.includes("Three hooks, one product"),
    );

    fireEvent.click(scenario!);

    expect(
      container.querySelector('.composer-select-trigger[aria-label="Skill"]'),
    ).toHaveTextContent("video_agent/batch_variants");
    expect(
      (container.querySelector(".creation-composer textarea") as HTMLTextAreaElement)
        .value,
    ).toContain("three product-video hooks");
  });

  it("searches bilingual documentation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            document: "operations.html",
            documentId: "operations",
            lang: "en",
            title: "Ops",
            text: "Launch readiness, provider credits, and incident response.",
          },
        ],
      }),
    );
    const { container } = render(<LandingPage {...props} />);

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Docs",
      )!,
    );
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    fireEvent.change(container.querySelector(".docs-search input")!, {
      target: { value: "credits" },
    });
    await waitFor(() =>
      expect(container.querySelector(".docs-search-results button")).toHaveTextContent(
        "Ops",
      ),
    );
    fireEvent.click(container.querySelector(".docs-search-results button")!);
    expect(container.querySelector("#docs iframe")).toHaveAttribute(
      "src",
      "/docs/operations.html?v=31",
    );
  });

  it("submits the home composer as a complete project draft", async () => {
    const onCreateProject = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <LandingPage {...props} mode="app" onCreateProject={onCreateProject} />,
    );
    const textarea = container.querySelector(".creation-composer textarea");

    fireEvent.change(textarea!, {
      target: { value: "A quiet Copenhagen morning told in one shot" },
    });
    fireEvent.click(
      container.querySelector(".creation-composer .composer-submit")!,
    );

    await waitFor(() =>
      expect(onCreateProject).toHaveBeenCalledWith({
        prompt: "A quiet Copenhagen morning told in one shot",
        skill: "auto",
        hook: "auto",
        style: "auto",
        aspectRatio: "auto",
        durationSeconds: "auto",
        model: "auto",
        resolution: "auto",
        audio: "auto",
        reviewMode: "auto",
      }),
    );
  });

  it("shows the preview notice for unavailable project-page actions", () => {
    const { container } = render(<LandingPage {...props} />);

    fireEvent.change(container.querySelector(".creation-composer textarea")!, {
      target: { value: "A product film" },
    });
    fireEvent.click(container.querySelector(".creation-composer .composer-submit")!);

    expect(container.querySelector(".preview-dialog")).toHaveTextContent("Preview only");
    expect(container.querySelector(".preview-dialog")).toHaveTextContent(
      "This page is a design preview",
    );
  });

  it("renders the hero video as a seamless horizontal carousel", () => {
    const { container } = render(<LandingPage {...props} />);
    const indices = [...container.querySelectorAll(".hero-video-frame")].map((frame) =>
      frame.getAttribute("data-video-index"),
    );

    expect(container.querySelector(".hero-media-track")).toBeInTheDocument();
    expect(indices).toEqual(["0", "1", "2", "0", "1", "2"]);
  });

  it("streams the headline in sequence and loops after a pause", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<LandingPage {...props} />);
      const lines = container.querySelectorAll(".hero-line-live");

      act(() => {
        vi.advanceTimersByTime(730);
      });
      expect(lines[0]).toHaveTextContent("VideoAgent");
      expect(lines[1]).toHaveTextContent("");
      expect(container.querySelector(".hero-title-icon")).toHaveClass("is-visible");

      act(() => {
        vi.advanceTimersByTime(1200);
      });
      expect(lines[0]).toHaveTextContent("VideoAgent");
      expect(lines[1]).toHaveTextContent("You Are the Director");

      act(() => {
        vi.advanceTimersByTime(3300);
      });
      expect(lines[0]).toHaveTextContent("");
      expect(lines[1]).toHaveTextContent("");
      expect(container.querySelector(".hero-title-icon")).not.toHaveClass("is-visible");
    } finally {
      vi.useRealTimers();
    }
  });
});
