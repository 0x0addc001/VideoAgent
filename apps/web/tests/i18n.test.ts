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
    expect(landingContent.en.hero.title).toBe("You Are the Director");
    expect(landingContent["zh-CN"].hero.title).toBe("把想象拍成片");
    expect(landingContent.en.nav.agents).toBe("Agents");
    expect(landingContent.en.nav.skills).toBe("Skills");
    expect(landingContent["zh-CN"].nav.agents).toBe("小秘");
    expect(landingContent["zh-CN"].nav.skills).toBe("技能");
    expect(landingContent["zh-CN"].nav.assets).toBe("资产");
    expect(landingContent["zh-CN"].nav.hots).toBe("视频");
    expect(landingContent.en.nav.docsSearch).toBe("Search docs");
    expect(landingContent["zh-CN"].nav.docsSearch).toBe("搜索文档");
    expect(landingContent.en.hero.eyebrow).toBe("VideoAgent");
    expect(landingContent["zh-CN"].hero.eyebrow).toBe("视频小秘");
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

