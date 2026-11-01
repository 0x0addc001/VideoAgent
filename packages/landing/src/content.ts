export type LandingLocale = "en" | "zh-CN";

export const landingContent = {
  en: {
    localeLabel: "English",
    documentTitle: "VideoAgent — Direct the story",
    nav: {
      product: "Product",
      workflow: "Workflow",
      docs: "Docs",
      language: "Change language",
    },
    hero: {
      eyebrow: "AI VIDEO CREATION WORKSPACE",
      title: "Direct the story",
      description:
        "Turn a brief into a structured storyboard, generate each shot with a model provider, and keep the final cut under your control.",
      create: "Create",
      github: "GitHub",
      workflow: "Workflow",
    },
    product: {
      label: "Product",
      title: "A clear workflow for deliberate video creation",
      description:
        "The agent handles planning and repetitive production work. The project remains visible, editable, and auditable at every stage.",
      features: [
        {
          number: "01",
          title: "Creative planning",
          body: "A structured agent turns the creative brief into an editable treatment and shot sequence.",
        },
        {
          number: "02",
          title: "Shot-level control",
          body: "Prompt, duration, aspect ratio, provider mode, and approval state remain inspectable.",
        },
        {
          number: "03",
          title: "Provider boundary",
          body: "A stable provider interface keeps the product independent from a single video model.",
        },
      ],
    },
    workflow: {
      label: "Workflow",
      title: "From brief to final cut",
      steps: ["Describe or attach", "Shape the story", "Generate each shot", "Review and assemble"],
    },
    documents: [
      { path: "software-design.html", label: "Software Design" },
      { path: "software-implementation.html", label: "Implementation Guide" },
      { path: "software-test-plan.html", label: "Testing & TDD" },
    ],
  },
  "zh-CN": {
    localeLabel: "简体中文",
    documentTitle: "VideoAgent — 导演你的故事",
    nav: {
      product: "产品",
      workflow: "流程",
      docs: "文档",
      language: "切换语言",
    },
    hero: {
      eyebrow: "AI 视频创作工作台",
      title: "导演你的故事",
      description:
        "把创意变成结构化故事板，通过模型服务生成每个镜头，并让最终成片始终处于你的掌控之中。",
      create: "创作",
      github: "GitHub",
      workflow: "流程",
    },
    product: {
      label: "产品",
      title: "清晰、可控的视频创作流程",
      description:
        "Agent 负责策划与重复性制作工作，项目在每个阶段都保持可见、可编辑、可追踪。",
      features: [
        {
          number: "01",
          title: "创意策划",
          body: "结构化 Agent 将创意需求整理为可编辑的方案和镜头序列。",
        },
        {
          number: "02",
          title: "镜头级控制",
          body: "提示词、时长、画面比例、Provider 模式与审批状态全部可检查。",
        },
        {
          number: "03",
          title: "Provider 抽象",
          body: "稳定的 Provider 接口让产品不绑定于单一视频模型。",
        },
      ],
    },
    workflow: {
      label: "流程",
      title: "从创意到最终成片",
      steps: ["描述或上传", "设计故事", "生成镜头", "审核与合成"],
    },
    documents: [
      { path: "software-design.html", label: "设计文档" },
      { path: "software-implementation.html", label: "实现文档" },
      { path: "software-test-plan.html", label: "测试文档" },
    ],
  },
} as const;
