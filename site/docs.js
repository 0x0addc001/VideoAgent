const shell = document.querySelector("#document-shell");
const toc = document.querySelector("#document-toc");
const tocToggle = document.querySelector("#toc-toggle");
const tocLinks = [...document.querySelectorAll(".toc-link")];
const tocTargets = tocLinks
  .map((link) => {
    const id = link.getAttribute("href")?.slice(1);
    return id ? document.getElementById(id) : null;
  })
  .filter((target) => target !== null);

function setCollapsed(collapsed, persist = true) {
  shell?.classList.toggle("toc-collapsed", collapsed);
  toc?.setAttribute("data-collapsed", String(collapsed));
  tocToggle?.setAttribute("aria-expanded", String(!collapsed));
  if (persist) {
    try {
      window.localStorage.setItem("videoagent-docs-toc-collapsed", String(collapsed));
    } catch {
      // Storage may be disabled.
    }
  }
}

let initiallyCollapsed = window.matchMedia("(max-width: 780px)").matches;
try {
  const saved = window.localStorage.getItem("videoagent-docs-toc-collapsed");
  if (saved === "true" || saved === "false") initiallyCollapsed = saved === "true";
} catch {
  // Storage may be disabled.
}
setCollapsed(initiallyCollapsed, false);

tocToggle?.addEventListener("click", () => {
  setCollapsed(toc?.getAttribute("data-collapsed") !== "true");
});

function setActiveLink(target) {
  for (const link of tocLinks) {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${target.id}`);
  }
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveLink(visible[0].target);
    },
    { rootMargin: "-12% 0px -72% 0px", threshold: [0, 1] },
  );
  tocTargets.forEach((target) => observer.observe(target));
}
