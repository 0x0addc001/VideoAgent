import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import zhCN from "../messages/zh-CN.json";
import { localeLabels, supportedLocales } from "@/i18n/config";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("localization resources", () => {
  it("ships the supported English and Chinese locales", () => {
    expect(supportedLocales).toEqual(["en", "zh-CN"]);
    expect(localeLabels).toEqual({ en: "English", "zh-CN": "简体中文" });
  });

  it("keeps English and Chinese translation keys in sync", () => {
    expect(flattenKeys(zhCN).sort()).toEqual(flattenKeys(en).sort());
  });

  it("uses director-led brand messaging in both languages", () => {
    expect(en.hero.title).toBe("Every idea deserves its own frame.");
    expect(zhCN.hero.title).toBe("让每个灵感，都有自己的镜头。");
    expect(en.brand.tagline).toContain("direct");
    expect(zhCN.brand.tagline).toContain("导演");
    expect(en.hero.eyebrow).toBe("AI VIDEO DIRECTOR'S DESK");
    expect(zhCN.hero.eyebrow).toBe("AI 视频导演台");
  });
});

