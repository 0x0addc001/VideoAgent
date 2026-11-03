const themeToggle = document.querySelector("#theme-toggle");
const themeLabel = themeToggle?.querySelector(".theme-label");
const themeIcon = themeToggle?.querySelector(".theme-icon");

function preferredTheme() {
  try {
    const saved = window.localStorage.getItem("videoagent-docs-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Storage may be disabled.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (themeLabel) themeLabel.textContent = theme === "dark" ? "Light" : "Dark";
  if (themeIcon) themeIcon.textContent = theme === "dark" ? "☀" : "◐";
  themeToggle?.setAttribute("aria-pressed", String(theme === "dark"));
  try {
    window.localStorage.setItem("videoagent-docs-theme", theme);
  } catch {
    // Storage may be disabled.
  }
}

applyTheme(preferredTheme());

themeToggle?.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
