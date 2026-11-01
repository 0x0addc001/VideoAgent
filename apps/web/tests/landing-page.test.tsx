import { act, fireEvent, render } from "@testing-library/react";
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
  it("keeps the navigation, account summary, and two hero actions", () => {
    const { container } = render(<LandingPage {...props} />);
    const nav = container.querySelector(".site-header > nav");
    const heroActions = container.querySelector(".hero-actions");

    expect(nav?.textContent).toContain("Product");
    expect(nav?.textContent).toContain("Experience");
    expect(nav?.textContent).toContain("Docs");
    expect(container.querySelector(".language-button svg")).toBeInTheDocument();
    expect(heroActions?.querySelectorAll("a, button")).toHaveLength(2);
    expect(heroActions).toHaveTextContent("Create");
    expect(heroActions).toHaveTextContent("GitHub");
    expect(heroActions?.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector(".secondary-action")).toHaveTextContent("GitHub");
    expect(container.querySelector(".credit-count")).toHaveTextContent("66");
    expect(container.querySelector(".account-avatar")).toHaveTextContent("VA");
    expect(container.querySelector("footer")).not.toBeInTheDocument();
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
    expect(container.querySelector(".hero-title .title-kicker")).toHaveTextContent(
      "AI VIDEO CREATION WORKSPACE",
    );
    expect(container.querySelector(".combined-section-title .title-kicker")).toHaveTextContent(
      "Product",
    );
    expect(container.querySelector(".experience-title .title-kicker")).toHaveTextContent(
      "Experience",
    );
  });

  it("removes the duplicate header action on the application homepage", () => {
    const { container } = render(<LandingPage {...props} mode="app" />);

    expect(container.querySelector(".header-action")).not.toBeInTheDocument();
    expect(container.querySelector(".hero-actions .primary-action")).toHaveTextContent(
      "Create",
    );
    expect(container.querySelector(".hero-actions .secondary-action")).toHaveTextContent(
      "GitHub",
    );
  });

  it("shows the preview notice for unavailable project-page actions", () => {
    const { container } = render(<LandingPage {...props} />);

    fireEvent.click(container.querySelector(".hero-actions .primary-action")!);

    expect(container.querySelector(".preview-dialog")).toHaveTextContent("Preview only");
    expect(container.querySelector(".preview-dialog")).toHaveTextContent(
      "This page is a design preview",
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
