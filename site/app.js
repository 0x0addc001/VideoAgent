const languageButton = document.querySelector("#language-button");
const languageOptions = document.querySelector("#language-options");
const currentLanguage = document.querySelector("#current-language");

const copy = {
  en: {
    label: "English",
    title: "VideoAgent — Direct the story.",
  },
  zh: {
    label: "简体中文",
    title: "VideoAgent — 导演你的故事。",
  },
};

function closeLanguageMenu() {
  if (!languageOptions || !languageButton) return;
  languageOptions.hidden = true;
  languageButton.setAttribute("aria-expanded", "false");
}

function applyLanguage(language) {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = copy[language].title;
  if (currentLanguage) currentLanguage.textContent = copy[language].label;

  document.querySelectorAll("[data-en][data-zh]").forEach((element) => {
    element.textContent = element.dataset[language];
  });

  document.querySelectorAll("[data-language]").forEach((option) => {
    option.setAttribute("aria-current", String(option.dataset.language === language));
  });

  try {
    window.localStorage.setItem("videoagent-language", language);
  } catch {
    // Storage may be unavailable in hardened browser modes.
  }
}

let initialLanguage = "en";
try {
  const queryLanguage = new URLSearchParams(window.location.search).get("lang");
  const savedLanguage = window.localStorage.getItem("videoagent-language");
  if (queryLanguage === "zh" || queryLanguage === "en") {
    initialLanguage = queryLanguage;
  } else if (savedLanguage === "zh" || savedLanguage === "en") {
    initialLanguage = savedLanguage;
  } else if (navigator.language.toLowerCase().startsWith("zh")) {
    initialLanguage = "zh";
  }
} catch {
  if (navigator.language.toLowerCase().startsWith("zh")) initialLanguage = "zh";
}

applyLanguage(initialLanguage);

languageButton?.addEventListener("click", () => {
  if (!languageOptions || !languageButton) return;
  const willOpen = languageOptions.hidden;
  languageOptions.hidden = !willOpen;
  languageButton.setAttribute("aria-expanded", String(willOpen));
});

document.querySelectorAll("[data-language]").forEach((option) => {
  option.addEventListener("click", () => {
    applyLanguage(option.dataset.language);
    closeLanguageMenu();
  });
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest(".language-switcher")) closeLanguageMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLanguageMenu();
    languageButton?.focus();
  }
});

