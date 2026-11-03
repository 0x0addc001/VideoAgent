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
});

describe("LandingPage", () => {
  it("keeps left-side navigation, a VA brand, and creation composer", () => {
    const { container } = render(<LandingPage {...props} />);
    const nav = container.querySelector(".site-header > nav");
    const composer = container.querySelector(".creation-composer");

    expect(nav?.textContent).toContain("Agents");
    expect(nav?.textContent).toContain("Skills");
    expect(nav?.textContent).toContain("Assets");
    expect(nav?.textContent).toContain("Hots");
    expect(nav?.textContent).toContain("Docs");
    expect(nav?.querySelectorAll(".nav-icon")).toHaveLength(5);
    expect(container.querySelector(".language-button")).not.toBeInTheDocument();
    expect(container.querySelector(".notification-button svg")).toBeInTheDocument();
    expect(container.querySelector(".brand-mark")).toHaveTextContent("VA");
    expect(composer).toBeInTheDocument();
    expect(composer?.querySelectorAll(".composer-select")).toHaveLength(7);
    expect(
      [...(composer?.querySelectorAll("select") ?? [])].map((select) => select.value),
    ).toEqual(["auto", "auto", "auto", "auto", "auto", "auto", "auto"]);
    expect(composer).toHaveTextContent("Cinematic");
    expect(composer).toHaveTextContent("16:9");
    expect(composer).toHaveTextContent("5s");
    expect(container.querySelector(".credit-count")).toHaveTextContent("0");
    expect(container.querySelector(".account-avatar svg")).toBeInTheDocument();
    expect(container.querySelector("a.account-summary")).not.toBeInTheDocument();
    const actionItems = [...container.querySelectorAll(".header-actions > *")];
    expect(actionItems.map((item) => item.className)).toEqual([
      "account-avatar",
      "credit-count",
      "notification-switcher",
    ]);
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
    expect(container.querySelector("#skills .feature-card")).toHaveTextContent(
      "Storyboard",
    );
    expect(container.querySelector("#agents")).not.toBeInTheDocument();
    expect(container.querySelector(".review-skill")).toHaveTextContent("Instant review");

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Assets",
      )!,
    );
    expect(container.querySelector("#assets .feature-card")).toHaveTextContent(
      "Projects",
    );
    expect(container.querySelector("#skills")).not.toBeInTheDocument();

    fireEvent.click(
      [...container.querySelectorAll(".site-header button")].find(
        (button) => button.textContent === "Hots",
      )!,
    );
    expect(container.querySelector("#hots .community-card")).toHaveTextContent(
      "Editorial vlog",
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
      "/docs/software-design.html?v=11",
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
    } finally {
      vi.useRealTimers();
    }
  });
});
