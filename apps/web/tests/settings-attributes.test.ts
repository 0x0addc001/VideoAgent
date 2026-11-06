import { describe, expect, it } from "vitest";
import { extractedConversationAttributes } from "@/lib/settings-attributes";

describe("settings attribute extraction", () => {
  it("breaks a long creative brief into directing attributes", () => {
    const attributes = extractedConversationAttributes(
      [
        {
          id: "user-1",
          role: "user",
          content:
            "Create a ten-second product ad for macbook pro. Open with a visual proof of the product benefit, then show the product in use and end on the hero packshot.",
          created_at: "2026-11-05T00:00:00Z",
        },
        {
          id: "user-2",
          role: "user",
          content: "why there has chinese everwhere? please translate them into english",
          created_at: "2026-11-05T00:00:01Z",
        },
      ],
      "en",
    );

    expect(attributes).toEqual([
      { label: "Format", value: "Product ad" },
      { label: "Duration", value: "10 seconds" },
      { label: "Product", value: "MacBook Pro" },
      {
        label: "Opening",
        value: "visual proof of the product benefit",
      },
      { label: "Development", value: "product in use" },
      { label: "Ending", value: "hero packshot" },
    ]);
    expect(attributes.some((item) => item.label === "Creative brief")).toBe(false);
    expect(attributes.some((item) => item.label === "Director direction")).toBe(false);
    expect(
      attributes.some((item) =>
        /[\u3400-\u9fff]/.test(`${item.label} ${item.value}`),
      ),
    ).toBe(false);
  });

  it("normalizes common Chinese directing terms into English", () => {
    const attributes = extractedConversationAttributes(
      [
        {
          id: "user-1",
          role: "user",
          content:
            "制作一条十秒产品广告，开场展示产品效果，然后展示产品使用，最后以英雄镜头结束。",
          created_at: "2026-11-05T00:00:00Z",
        },
      ],
      "en",
    );

    expect(attributes).toEqual([
      { label: "Format", value: "Product ad" },
      { label: "Duration", value: "10 seconds" },
      { label: "Opening", value: "show product benefit" },
      { label: "Development", value: "product in use" },
      { label: "Ending", value: "hero shot" },
    ]);
  });

  it("translates labelled Chinese directing attributes", () => {
    const attributes = extractedConversationAttributes(
      [
        {
          id: "user-1",
          role: "user",
          content: "受众：年轻创作者\n基调：温暖\n场景：夜间工作室",
          created_at: "2026-11-05T00:00:00Z",
        },
      ],
      "en",
    );

    expect(attributes).toEqual([
      { label: "Audience", value: "young creators" },
      { label: "Tone", value: "warm" },
      { label: "Setting", value: "night studio" },
    ]);
  });
});
