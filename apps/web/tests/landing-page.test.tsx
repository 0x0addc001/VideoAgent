import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  appHref: "/en/register",
  githubHref: "https://github.com/0x0addc001/VideoAgent",
  localeLinks: { en: "/en", "zh-CN": "/zh-CN" },
  docsBase: "https://0x0addc001.github.io/VideoAgent/docs/",
};

describe("LandingPage", () => {
  it("keeps the navigation, language control, and a single hero action", () => {
    const { container } = render(<LandingPage {...props} />);
    const nav = container.querySelector(".site-header > nav");
    const heroActions = container.querySelector(".hero-actions");

    expect(nav?.textContent).toContain("Product");
    expect(nav?.textContent).toContain("Experience");
    expect(nav?.textContent).toContain("Docs");
    expect(container.querySelector(".language-button svg")).toBeInTheDocument();
    expect(heroActions?.querySelectorAll("a")).toHaveLength(1);
    expect(heroActions).toHaveTextContent("GitHub");
    expect(heroActions?.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector(".secondary-action")).not.toBeInTheDocument();
    expect(container.querySelector(".hero-video-front")).toHaveAttribute(
      "data-video-index",
      "0",
    );
    expect(container.querySelectorAll(".hero-video-frame")).toHaveLength(3);
    const videoSources = [...container.querySelectorAll(".hero-video-frame source")].map(
      (source) => source.getAttribute("src"),
    );
    expect(new Set(videoSources).size).toBe(3);
    expect(container.querySelector(".workflow-grid p")).toHaveTextContent(
      "Write a brief",
    );
  });

  it("removes the duplicate header action on the application homepage", () => {
    const { container } = render(<LandingPage {...props} mode="app" />);

    expect(container.querySelector(".header-action")).not.toBeInTheDocument();
    expect(container.querySelector(".hero-actions .primary-action")).toHaveTextContent(
      "Create",
    );
  });

  it("does not add decorative icons to product capabilities", () => {
    const { container } = render(<LandingPage {...props} />);

    expect(container.querySelector(".capabilities svg")).not.toBeInTheDocument();
    expect(container.querySelector(".feature-icon")).not.toBeInTheDocument();
  });

  it("brings the next hero video to the front", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<LandingPage {...props} />);

      act(() => {
        vi.advanceTimersByTime(5200);
      });

      expect(container.querySelector(".hero-video-front")).toHaveAttribute(
        "data-video-index",
        "1",
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
