export type SettingsAttribute = {
  label: string;
  value: string;
};

type SettingsMessage = {
  content: string;
  created_at?: string;
  id?: string;
  metadata?: Record<string, unknown>;
  role: string;
};

const CJK = /[\u3400-\u9fff]/;

const labelAliases: Array<[RegExp, string]> = [
  [/^(audience|target audience|受众|目标受众)$/i, "Audience"],
  [/^(tone|mood|基调|语气|情绪)$/i, "Tone"],
  [/^(conflict|冲突|矛盾)$/i, "Conflict"],
  [/^(character|characters|cast|人物|角色)$/i, "Characters"],
  [/^(setting|scene|environment|location|场景|环境|地点)$/i, "Setting"],
  [/^(visual style|style|visual direction|视觉风格|视觉方向|风格)$/i, "Visual style"],
  [/^(lighting|light|光线|灯光)$/i, "Lighting"],
  [/^(palette|color|colour|色调|色彩)$/i, "Palette"],
  [/^(duration|length|时长)$/i, "Duration"],
  [/^(format|content type|形式|类型)$/i, "Format"],
  [/^(product|subject|产品|主体)$/i, "Product"],
  [/^(opening|opening shot|hook|开场|开场镜头|钩子)$/i, "Opening"],
  [/^(development|middle|body|过程|发展)$/i, "Development"],
  [/^(ending|ending shot|结尾|收尾)$/i, "Ending"],
  [/^(camera|camera movement|运镜|镜头运动)$/i, "Camera"],
  [/^(audio|sound|声音|音频)$/i, "Audio"],
  [/^(call to action|cta|行动号召)$/i, "Call to action"],
];

const chineseTerms: Array<[RegExp, string]> = [
  [/十秒/g, " 10 seconds "],
  [/五秒/g, " 5 seconds "],
  [/十五秒/g, " 15 seconds "],
  [/三十秒/g, " 30 seconds "],
  [/英雄镜头/g, " hero shot "],
  [/产品广告/g, " product ad "],
  [/品牌广告/g, " brand film "],
  [/产品片/g, " product film "],
  [/创作者视频|创作者?vlog/gi, " creator vlog "],
  [/短剧|微短剧/g, " short drama "],
  [/音乐视频|音乐mv/gi, " music video "],
  [/视频/g, " video "],
  [/产品效果/g, " product benefit "],
  [/产品使用/g, " product in use "],
  [/年轻创作者/g, " young creators "],
  [/产品团队/g, " product teams "],
  [/开发者/g, " developers "],
  [/普通观众/g, " general audience "],
  [/产品特写/g, " product close-up "],
  [/使用场景/g, " usage scene "],
  [/展示|呈现/g, " show "],
  [/温暖/g, " warm "],
  [/冷静|平静/g, " calm "],
  [/紧张/g, " tense "],
  [/克制/g, " restrained "],
  [/活力/g, " energetic "],
  [/效果/g, " benefit "],
  [/开场/g, " opening "],
  [/结尾|收尾/g, " ending "],
  [/自然光/g, " natural light "],
  [/柔和光/g, " soft lighting "],
  [/工作室/g, " studio "],
  [/清晨/g, " morning "],
  [/夜晚|夜间/g, " night "],
  [/室内/g, " interior "],
  [/户外/g, " exterior "],
  [/慢动作/g, " slow motion "],
  [/手持/g, " handheld "],
  [/推镜/g, " push-in "],
  [/拉镜/g, " pull-out "],
  [/环绕/g, " orbit "],
  [/暖色/g, " warm tones "],
  [/冷色/g, " cool tones "],
  [/电影感/g, " cinematic "],
  [/竖屏|纵向/g, " vertical "],
  [/横屏|横向/g, " horizontal "],
  [/连续镜头|一镜到底/g, " one continuous shot "],
  [/人物|角色/g, " character "],
  [/场景|环境/g, " setting "],
  [/画面/g, " visuals "],
  [/镜头/g, " shot "],
  [/静音|无声/g, " silent "],
  [/旁白/g, " voiceover "],
  [/字幕/g, " captions "],
];

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  "一": 1,
  "二": 2,
  "三": 3,
  "四": 4,
  "五": 5,
  "六": 6,
  "七": 7,
  "八": 8,
  "九": 9,
  "十": 10,
};

function canonicalLabel(rawLabel: string) {
  const normalized = rawLabel.trim().replace(/[:：]+$/, "").trim();
  const alias = labelAliases.find(([pattern]) => pattern.test(normalized))?.[1];
  if (alias) return alias;
  if (/^(creative brief|director direction|director note|note|说明|备注)$/i.test(normalized)) {
    return null;
  }
  if (!CJK.test(normalized)) return normalized.slice(0, 48);
  return null;
}

function normalizeValue(value: string, locale: string) {
  let normalized = value
    .replace(/\s+/g, " ")
    .replace(/^[\s,，:：.-]+|[\s,，;；:：.-]+$/g, "")
    .replace(/^(?:a|an|the)\s+/i, "")
    .trim();
  for (const [pattern, replacement] of chineseTerms) {
    normalized = normalized.replace(pattern, replacement);
  }
  normalized = normalized
    .replace(/\b(show)\s+(?=[a-z])/gi, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
  if (locale.startsWith("zh")) return normalized.slice(0, 140);
  if (CJK.test(normalized)) return "";
  return normalized.slice(0, 140);
}

function durationValue(text: string) {
  const match =
    text.match(
      /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty)[-\s]?(?:second|seconds|sec|secs|s)\b/i,
    ) ?? text.match(/([一二三四五六七八九十\d]+)\s*秒/);
  if (!match) return "";
  const raw = match[1]?.toLowerCase() ?? "";
  return `${numberWords[raw] ?? raw} seconds`;
}

function formatValue(text: string) {
  if (/product ad|product film|commercial|品牌广告|产品广告|产品片/i.test(text)) {
    return "Product ad";
  }
  if (/creator vlog|\bvlog\b|创作者视频/i.test(text)) return "Creator vlog";
  if (/short drama|micro drama|短剧|微短剧/i.test(text)) return "Short drama";
  if (/music video|音乐视频|音乐mv/i.test(text)) return "Music video";
  if (/locali[sz]ation|本地化/i.test(text)) return "Localization";
  if (/batch variants|variant matrix|批量变体/i.test(text)) return "Batch variants";
  if (/portrait|肖像/i.test(text)) return "Cinematic portrait";
  if (/one shot|single shot|one continuous|一镜到底|单个镜头/i.test(text)) {
    return "One-shot film";
  }
  return "";
}

function productValue(text: string) {
  const match = text.match(
    /(?:product ad|product film|commercial|brand film|video)\s+(?:for|about)\s+([^.,;。，；]+)/i,
  );
  if (!match?.[1]) return "";
  return match[1]
    .trim()
    .replace(/\bmacbook\b/gi, "MacBook")
    .replace(/\bpro\b/gi, "Pro")
    .replace(/\biphone\b/gi, "iPhone")
    .replace(/\bipad\b/gi, "iPad")
    .replace(/\bwindows\b/gi, "Windows");
}

function extractPairs(text: string) {
  const pairs: Array<[string, string]> = [];
  const add = (label: string, value: string) => {
    if (value.trim()) pairs.push([label, value]);
  };

  add("Format", formatValue(text));
  add("Duration", durationValue(text));
  add("Product", productValue(text));

  const opening =
    text.match(/\bopen(?:s|ing)? with\s+(.+?)(?=(?:,?\s+then\b|,?\s+and then\b|\.\s|$))/i)?.[1] ??
    text.match(/开场(?:是|用|以)?\s*([^，,。；;]+)/)?.[1];
  add("Opening", opening ?? "");

  const development =
    text.match(/\bthen\s+(?:show|reveal|move to|cut to)\s+(.+?)(?=(?:,?\s+and\s+end\b|\.\s|$))/i)?.[1] ??
    text.match(/然后(?:展示|呈现|拍摄)?\s*([^，,。；;]+)/)?.[1];
  add("Development", development ?? "");

  const ending =
    text.match(/\bend(?:s|ing)? on\s+(?:the\s+)?(.+?)(?:\.\s|$)/i)?.[1] ??
    text.match(/最后(?:以|是|落在)?\s*([^。；;]+?)(?:结束|收尾|结尾|$)/)?.[1];
  add("Ending", ending ?? "");

  const tone = text.match(/\b(?:tone|mood)\s*(?:is|:)\s*([^.;]+)/i)?.[1];
  add("Tone", tone ?? "");

  const visualStyle =
    text.match(/\bvisual (?:style|direction)\s*(?:is|:)\s*([^.;]+)/i)?.[1];
  add("Visual style", visualStyle ?? "");

  const lighting = text.match(/\blighting\s*(?:is|:)?\s*([^.;]+)/i)?.[1];
  add("Lighting", lighting ?? "");

  return pairs;
}

export function extractedConversationAttributes(
  messages: SettingsMessage[],
  locale = "en",
): SettingsAttribute[] {
  const attributes: SettingsAttribute[] = [];
  const setAttribute = (label: string, value: string) => {
    const normalizedLabel = canonicalLabel(label);
    const normalizedValue = normalizeValue(value, locale);
    if (!normalizedLabel || !normalizedValue) return false;
    const existing = attributes.findIndex((item) => item.label === normalizedLabel);
    if (existing >= 0) {
      attributes[existing] = { label: normalizedLabel, value: normalizedValue };
    } else {
      attributes.push({ label: normalizedLabel, value: normalizedValue });
    }
    return true;
  };

  for (const [index, message] of messages.entries()) {
    if (message.role !== "user" || message.metadata?.workflow_choice) continue;
    const rawText = message.content.trim();
    const text = rawText.replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (
      /^(why|what|how|please)\b.*\b(translat|chinese|english|language|respond|answer)\b/i.test(
        text,
      ) ||
      /^(请|为什么|怎么).*(翻译|中文|英文|语言)/.test(text)
    ) {
      continue;
    }

    const explicit = [
      ...rawText.matchAll(/(?:^|\n)\s*([^:：\n]{2,40})[:：]\s*([^\n]+)/g),
    ].map((match) => ({
      label: match[1]?.trim() ?? "",
      value: match[2]?.trim() ?? "",
    }));
    const acceptedExplicit = explicit.filter((pair) =>
      setAttribute(pair.label, pair.value),
    ).length;

    const extracted = extractPairs(text);
    for (const [label, value] of extracted) setAttribute(label, value);

    const revision = text.match(
      /^make (?:the )?(opening|ending|pacing|tone|product|lighting) (?:more )?(.+)$/i,
    );
    if (revision?.[1] && revision[2]) {
      const label =
        revision[1].toLowerCase() === "opening"
          ? "Opening"
          : revision[1].toLowerCase() === "ending"
            ? "Ending"
            : revision[1][0]?.toUpperCase() + revision[1].slice(1);
      setAttribute(label, revision[2]);
    }

    if (extracted.length === 0 && acceptedExplicit === 0 && !revision) {
      const concept = text.split(/(?<=[.!?。！？])\s+/, 1)[0]?.trim() ?? "";
      if (concept && concept.length <= 90) setAttribute("Concept", concept);
      const quiet = text.match(/\b(quiet|calm|serene|intimate|tense|energetic|dramatic)\b/i);
      if (quiet?.[1]) setAttribute("Tone", quiet[1]);
      if (/\b(one shot|single shot|one continuous)\b/i.test(text)) {
        setAttribute("Shots", "One continuous shot");
      }
    }

    const previousQuestion =
      [...messages.slice(0, index)]
        .reverse()
        .find((candidate) => candidate.role === "assistant")?.content ?? "";
    if (previousQuestion) {
      const inferred = [
        [/audience|受众|观众/i, "Audience"],
        [/tone|mood|emotion|情绪|基调/i, "Tone"],
        [/conflict|冲突|矛盾/i, "Conflict"],
        [/character|人物|角色/i, "Characters"],
        [/scene|setting|environment|场景|环境/i, "Setting"],
        [/style|visual|视觉|风格/i, "Visual style"],
      ].find(([pattern]) => (pattern as RegExp).test(previousQuestion))?.[1] as
        | string
        | undefined;
      if (inferred && attributes.every((item) => item.label !== inferred)) {
        setAttribute(inferred, message.content);
      }
    }
  }
  return attributes;
}
