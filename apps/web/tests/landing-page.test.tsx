import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingPage } from "@videoagent/landing";

const props = {
  locale: "en" as const,
  mode: "project" as const,
  videoSrc: "/media/vlog-hero.mp4",
  posterSrc: "/media/vlog-hero-poster.jpg",
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
    expect(container.querySelector(".secondary-action")).not.toBeInTheDocument();
  });

  it("does not add decorative icons to product capabilities", () => {
    const { container } = render(<LandingPage {...props} />);

    expect(container.querySelector(".capabilities svg")).not.toBeInTheDocument();
    expect(container.querySelector(".feature-icon")).not.toBeInTheDocument();
  });
});
