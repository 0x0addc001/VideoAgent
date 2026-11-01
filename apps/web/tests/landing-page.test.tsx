import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LandingPage } from "@videoagent/landing";

const props = {
  locale: "en" as const,
  mode: "project" as const,
  videos: [
    { src: "/media/vlog-hero.mp4#t=0.2", poster: "/media/vlog-hero-poster-1.jpg" },
    { src: "/media/vlog-hero.mp4#t=2.4", poster: "/media/vlog-hero-poster-2.jpg" },
    { src: "/media/vlog-hero.mp4#t=4.7", poster: "/media/vlog-hero-poster-3.jpg" },
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
    expect(nav?.textContent).toContain("Workflow");
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
