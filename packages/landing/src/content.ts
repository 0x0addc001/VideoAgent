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
    },
    hero: {
      eyebrow: "AI VIDEO CREATION WORKSPACE",
      title: "Direct the story",
      description:
        "Turn a brief into a structured storyboard, generate each shot with a model provider, and keep the final cut under your control.",
      create: "Create",
      github: "GitHub",
      videoLabel: "A creator filming a cinematic personal vlog",
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
    ],
  },
  "zh-CN": {
    localeLabel: "简体中文",
    documentTitle: "VideoAgent — 导演你的故事",
    nav: {
      product: "产品",
      workflow: "体验",
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
      videoLabel: "正在拍摄电影感 Vlog 的创作者",
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
      label: "体验",
      title: "从创意到最终成片",
      steps: [
        {
          title: "描述或上传",
          description: "写下创意，或加入参考图、现有素材与视觉线索。",
        },
        {
          title: "设计故事",
          description: "Agent 将你的方向整理为可编辑的故事板和镜头清单。",
        },
        {
          title: "生成镜头",
          description: "确认提示词、时长与构图后，再由视频模型渲染。",
        },
        {
          title: "审核与合成",
          description: "保留、修改或重新生成镜头，最后完成剪辑。",
        },
      ],
    },
    documents: [
      { path: "software-design.html", label: "设计文档" },
      { path: "software-implementation.html", label: "实现文档" },
      { path: "software-test-plan.html", label: "测试文档" },
    ],
  },
} as const;
