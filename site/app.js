const languageButton = document.querySelector("#language-toggle");
const languageLabel = languageButton?.querySelector(".language-label");
const productPreview = document.querySelector("#product-preview");

const copy = {
  en: {
    button: "简体中文",
    title: "VideoAgent — Your idea. Your direction. Your cut.",
    preview: "./assets/home-en.png",
    previewAlt: "VideoAgent studio preview in English",
  },
  zh: {
    button: "English",
    title: "VideoAgent — 你的灵感，你的导演，你的成片。",
    preview: "./assets/home-zh.png",
    previewAlt: "VideoAgent 中文创作工作台",
  },
};

function applyLanguage(language) {
  const languageCopy = copy[language];
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = languageCopy.title;

  document.querySelectorAll("[data-en][data-zh]").forEach((element) => {
    element.textContent = element.dataset[language];
  });

  if (languageLabel) {
    languageLabel.textContent = languageCopy.button;
  }
  if (productPreview) {
    productPreview.src = languageCopy.preview;
    productPreview.alt = languageCopy.previewAlt;
  }
  try {
    window.localStorage.setItem("videoagent-language", language);
  } catch {
    // Storage can be unavailable in hardened browser modes.
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
  if (navigator.language.toLowerCase().startsWith("zh")) {
    initialLanguage = "zh";
  }
}

applyLanguage(initialLanguage);

languageButton?.addEventListener("click", () => {
  applyLanguage(document.documentElement.lang === "zh-CN" ? "en" : "zh");
});

const year = document.querySelector("#year");
if (year) {
  year.textContent = String(new Date().getFullYear());
}

