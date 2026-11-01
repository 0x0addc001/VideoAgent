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

  it("uses concise creator-focused product messaging", () => {
    expect(en.hero.title).toBe("Direct the story");
    expect(zhCN.hero.title).toBe("导演你的故事");
    expect(en.hero.eyebrow).toBe("AI VIDEO CREATION WORKSPACE");
    expect(zhCN.hero.eyebrow).toBe("AI 视频创作工作台");
    expect(en.brand).toEqual({ name: "VideoAgent" });
    expect(zhCN.brand).toEqual({ name: "VideoAgent" });
  });
});

