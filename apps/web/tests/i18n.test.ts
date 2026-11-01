import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import zhCN from "../messages/zh-CN.json";
import { localeLabels, supportedLocales } from "@/i18n/config";
import { landingContent } from "../../../packages/landing/src/content";

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
    expect(landingContent.en.hero.title).toBe("Direct the story");
    expect(landingContent["zh-CN"].hero.title).toBe("导演你的故事");
    expect(landingContent.en.hero.eyebrow).toBe("VideoAgent");
    expect(landingContent["zh-CN"].hero.eyebrow).toBe("VideoAgent");
    expect(landingContent["zh-CN"].product.features[1].title).toBe("镜头管理");
    expect(landingContent["zh-CN"].product.title).toBe("省心策划与制作");
    expect(landingContent["zh-CN"].product.features[2].title).toBe("评估反馈");
    expect(landingContent["zh-CN"].workflow.steps.map((step) => step.title)).toEqual([
      "描述创意",
      "编排故事",
      "生成镜头",
      "合成成片",
    ]);
  });
});

