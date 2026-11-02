export type LandingLocale = "en" | "zh-CN";

export const landingContent = {
  en: {
    localeLabel: "English",
    documentTitle: "VideoAgent — Direct the story",
    nav: {
      product: "Product",
      workflow: "Experience",
      docs: "Docs",
      language: "Change language",
      credits: "credits",
      account: "Account",
    },
    hero: {
      eyebrow: "VideoAgent",
      title: "Direct the story",
      description:
        "Turn a brief into a structured storyboard, generate each shot with a model provider, and keep the final cut under your control.",
      create: "Create",
      github: "GitHub",
      videoLabel: "A creator filming a cinematic personal vlog",
    },
    product: {
      label: "Product",
      title: "Worry-free planning and production",
      features: [
        {
          title: "Creative planning",
          body: "A structured agent turns the creative brief into an editable treatment and shot sequence.",
        },
        {
          title: "Shot-level control",
          body: "Prompt, duration, aspect ratio, provider mode, and approval state remain inspectable.",
        },
        {
          title: "Provider boundary",
          body: "Timely creative feedback helps refine the direction and expression as the work evolves.",
        },
      ],
    },
    workflow: {
      label: "Experience",
      title: "From brief to final cut",
      steps: [
        {
          title: "Describe or attach",
          description: "Write a brief, or bring references, footage, and visual cues.",
        },
        {
          title: "Shape the story",
          description: "The agent turns your direction into an editable storyboard and shot list.",
        },
        {
          title: "Generate each shot",
          description: "Approve prompts, duration, and framing before a provider renders.",
        },
        {
          title: "Review and assemble",
          description: "Keep, revise, or regenerate shots, then sequence the final cut.",
        },
      ],
    },
    documents: [
      { path: "software-design.html", label: "Software Design" },
      { path: "software-implementation.html", label: "Implementation Guide" },
      { path: "software-test-plan.html", label: "Testing & TDD" },
      { path: "api-reference.html", label: "API Reference" },
    ],
    preview: {
      title: "Preview only",
      body: "This page is a design preview. Use the full VideoAgent product to create projects, manage shots, and generate videos.",
      action: "Got it",
      close: "Close preview notice",
    },
  },
  "zh-CN": {
    localeLabel: "简体中文",
    documentTitle: "VideoAgent — 导演你的故事",
    nav: {
      product: "产品",
      workflow: "体验",
      docs: "文档",
      language: "切换语言",
      credits: "积分",
      account: "账户",
    },
    hero: {
      eyebrow: "VideoAgent",
      title: "导演你的故事",
      description:
        "把创意变成结构化故事板，通过模型服务生成每个镜头，并让最终成片始终处于你的掌控之中。",
      create: "创作",
      github: "GitHub",
      videoLabel: "正在拍摄电影感 Vlog 的创作者",
    },
    product: {
      label: "产品",
      title: "省心策划与制作",
      features: [
        {
          title: "创意策划",
          body: "结构化 Agent 将创意需求整理为可编辑的方案和镜头序列。",
        },
        {
          title: "镜头管理",
          body: "提示词、时长、画面比例、生成模式与审批状态全部可检查。",
        },
        {
          title: "评估反馈",
          body: "随创作进程提供针对性建议，帮助你及时调整方向与表达。",
        },
      ],
    },
    workflow: {
      label: "体验",
      title: "从创意到最终成片",
      steps: [
        {
          title: "描述创意",
          description: "写下创意，或加入参考图、现有素材与视觉线索。",
        },
        {
          title: "编排故事",
          description: "Agent 将你的方向整理为可编辑的故事板和镜头清单。",
        },
        {
          title: "生成镜头",
          description: "确认提示词、时长与构图后，再由视频模型渲染。",
        },
        {
          title: "合成成片",
          description: "保留、修改或重新生成镜头，最后完成剪辑。",
        },
      ],
    },
    documents: [
      { path: "software-design.html", label: "设计文档" },
      { path: "software-implementation.html", label: "实现文档" },
      { path: "software-test-plan.html", label: "测试文档" },
      { path: "api-reference.html", label: "API 文档" },
    ],
    preview: {
      title: "仅供预览",
      body: "此页面仅用于设计预览。请使用正式产品创建项目、管理镜头并生成视频。",
      action: "知道了",
      close: "关闭预览提示",
    },
  },
} as const;
