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
    ).toHaveLength(22);
    expect(container.querySelector("#skills")).toHaveTextContent("Search all resources");
    expect(container.querySelector("#skills")).toHaveTextContent(
      "kling/text_to_video",
    );
    expect(container.querySelector("#skills")).toHaveTextContent("Style transfer");
    expect(container.querySelector("#skills")).toHaveTextContent("Product film");
    expect(container.querySelector("#skills")).toHaveTextContent("Short drama");
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
      "/docs/product-requirements.html?v=25",
    );
    expect(container.querySelectorAll(".docs-tab-icon")).toHaveLength(8);
    expect(
      [...container.querySelectorAll(".docs-tabs button")].map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(["PRD", "Design", "Interface", "Impl", "Test", "Ops", "FAQ", "TODO"]);
    fireEvent.click(
      [...container.querySelectorAll(".docs-tabs button")].find(
        (button) => button.textContent?.trim() === "FAQ",
      )!,
    );
    expect(container.querySelector("#docs iframe")).toHaveAttribute(
      "src",
      "/docs/faq.html?v=25",
    );

    fireEvent.click(container.querySelector(".language-button")!);
    fireEvent.click(
      [...container.querySelectorAll(".language-options button")].find(
        (button) => button.textContent === "中文",
      )!,
    );
    expect(container.querySelector("#docs iframe")).toHaveAttribute(
      "src",
      "/docs/faq.zh.html?v=25",
    );
    expect(
      [...container.querySelectorAll(".docs-tabs button")].map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(["产品", "设计", "接口", "实现", "测试", "运营", "客服", "待办"]);
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
    expect(container.querySelector(".composer-select-menu")).toBeInTheDocument();
    fireEvent.click(
      [...container.querySelectorAll(".composer-select-option")].find(
        (option) => option.textContent === "Cinematic",
      )!,
    );
    expect(styleTrigger).toHaveTextContent("Cinematic");
    expect(container.querySelector(".composer-select-menu")).not.toBeInTheDocument();
  });

  it("lists every available video model with its provider", () => {
    const { container } = render(<LandingPage {...props} />);
    const modelTrigger = container.querySelector(
      '.composer-select-trigger[aria-label="Model"]',
    )!;

    fireEvent.click(modelTrigger);

    const options = [...container.querySelectorAll(".composer-select-option")];
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

    expect(container.querySelector(".composer-select-menu")).toHaveAttribute(
      "data-placement",
      "top",
    );
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

  it("publishes a Hots post from the app feed", () => {
    const { container } = render(<LandingPage {...props} mode="app" />);

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Hots",
      )!,
    );
    fireEvent.click(container.querySelector(".community-publish-card")!);
    fireEvent.change(container.querySelector(".publish-dialog textarea")!, {
      target: { value: "A new film from my studio" },
    });
    fireEvent.click(
      container.querySelector('.publish-dialog button[type="submit"]')!,
    );

    expect(
      container.querySelector(".community-card:not(.community-publish-card)"),
    ).toHaveTextContent("A new film from my studio");
    expect(container.querySelector(".community-author")).toHaveTextContent("You");
    expect(container.querySelector(".community-likes")).toHaveTextContent("0");
  });

  it("publishes a user skill with a namespaced ID", () => {
    const { container } = render(<LandingPage {...props} mode="app" />);

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Skills",
      )!,
    );
    fireEvent.click(container.querySelector(".skill-publish-card")!);
    fireEvent.change(container.querySelector(".skill-publish-dialog input")!, {
      target: { value: "Lip Sync" },
    });
    fireEvent.change(container.querySelector(".skill-publish-dialog textarea")!, {
      target: { value: "Synchronize speech motion to a supplied audio track." },
    });
    fireEvent.click(
      container.querySelector('.skill-publish-dialog button[type="submit"]')!,
    );

    expect(
      container.querySelector("#skills .skill-card:not(.skill-publish-card)"),
    ).toHaveTextContent("local_user/lip_sync");
    expect(container.querySelector("#skills")).toHaveTextContent("Lip Sync");
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
      "/docs/operations.html?v=25",
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
