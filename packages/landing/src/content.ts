export type LandingLocale = "en" | "zh-CN";

export const landingContent = {
  en: {
    localeLabel: "English",
    documentTitle: "VideoAgent — You Are the Director",
    nav: {
      agents: "Agent",
      skills: "Skills",
      assets: "Assets",
      hots: "Hots",
      docs: "Docs",
      language: "Change language",
      credits: "credits",
      account: "Account",
      notifications: "Notifications",
      emptyNotifications: "No notifications",
    },
    hero: {
      eyebrow: "VideoAgent",
      title: "You Are the Director",
      description:
        "Describe the idea. VideoAgent builds the shots.",
      create: "Create project",
      github: "GitHub",
      videoLabel: "A creator filming a cinematic personal vlog",
    },
    composer: {
      label: "Start with an idea",
      placeholder: "Describe a story, a mood, or a product film...",
      agentMode: "Agent",
      videoMode: "Video",
      submit: "Action",
      creating: "Starting...",
      settingsLabel: "Project settings",
      styleLabel: "Style",
      frameLabel: "Frame",
      lengthLabel: "Length",
      modelLabel: "Model",
      resolutionLabel: "Quality",
      audioLabel: "Audio",
      reviewLabel: "Review",
      seconds: "s",
      error: "The project could not be created. Please try again.",
      examplesLabel: "Try an idea",
      examples: [
        "A quiet Copenhagen morning told in one shot",
        "A one-take fragrance campaign",
        "A founder story in three cinematic beats",
      ],
      styles: [
        { id: "cinematic", label: "Cinematic" },
        { id: "ugc", label: "UGC" },
        { id: "product", label: "Product" },
      ],
      models: ["Auto", "Seedance 2.5", "Seedance 2.0 Mini", "Wan 3.0"],
      resolutions: ["720p", "1080p"],
      audioOptions: [
        { id: "auto", label: "Auto" },
        { id: "on", label: "On" },
        { id: "off", label: "Off" },
      ],
      reviewOptions: [
        { id: "auto", label: "Auto" },
        { id: "ask", label: "Ask first" },
      ],
    },
    skills: {
      label: "Skills",
      title: "Start with a tool",
      review: {
        title: "Instant review",
        body: "Score consistency, coverage, clarity, and pacing, then get actionable fixes.",
        action: "Open projects",
      },
      items: [
        {
          title: "Storyboard",
          body: "Turn one idea into editable shots.",
          prompt: "Build a three-shot storyboard from this idea:",
        },
        {
          title: "Shot direction",
          body: "Plan framing, movement, and duration.",
          prompt: "Create a shot list with framing, camera movement, and duration for:",
        },
        {
          title: "UGC video",
          body: "Create a natural creator-led vertical video.",
          prompt: "Create a vertical UGC video with a natural creator-led performance for:",
        },
      ],
    },
    assets: {
      label: "Assets",
      title: "Open your workspace",
      items: [
        {
          title: "Projects",
          body: "Your conversations, boards, and jobs.",
          href: "/projects",
        },
        {
          title: "Storyboards",
          body: "Continue planning an existing film.",
          href: "/projects",
        },
        {
          title: "Generated clips",
          body: "Review finished and active shots.",
          href: "/projects",
        },
      ],
    },
    hots: {
      label: "Hots",
      title: "Community feed",
      makeThis: "Make this",
      items: [
        {
          title: "Editorial vlog",
          prompt: "Create a quiet editorial vlog in a dark creative studio.",
        },
        {
          title: "European morning",
          prompt: "Create a natural European morning vlog with handheld movement.",
        },
        {
          title: "Studio portrait",
          prompt: "Create a fashion studio vlog with warm rim light and calm movement.",
        },
        {
          title: "Product reveal",
          prompt: "Create a slow product reveal with precise studio lighting.",
        },
        {
          title: "Night city",
          prompt: "Create a restrained night-city vlog with soft practical lights.",
        },
        {
          title: "Founder portrait",
          prompt: "Create a three-shot founder portrait with natural interview movement.",
        },
      ],
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
    documentTitle: "VideoAgent — 把脑海里的画面拍出来",
    nav: {
      agents: "Agent",
      skills: "Skills",
      assets: "资产",
      hots: "Hots",
      docs: "文档",
      language: "切换语言",
      credits: "积分",
      account: "账户",
      notifications: "通知",
      emptyNotifications: "暂无通知",
    },
    hero: {
      eyebrow: "VideoAgent",
      title: "把想象拍成片",
      description:
        "描述创意，VideoAgent 编排镜头。",
      create: "创建项目",
      github: "GitHub",
      videoLabel: "正在拍摄电影感 Vlog 的创作者",
    },
    composer: {
      label: "从一个想法开始",
      placeholder: "描述一个故事、一种情绪，或你想展示的产品……",
      agentMode: "Agent",
      videoMode: "视频",
      submit: "开拍",
      creating: "准备中……",
      settingsLabel: "创作设定",
      styleLabel: "风格",
      frameLabel: "画幅",
      lengthLabel: "时长",
      modelLabel: "模型",
      resolutionLabel: "清晰度",
      audioLabel: "音频",
      reviewLabel: "审核",
      seconds: "秒",
      error: "项目创建失败，请稍后重试。",
      examplesLabel: "试试这些灵感",
      examples: [
        "清晨的哥本哈根，一镜到底",
        "一支一镜到底的香水广告",
        "用三个电影感片段讲述创始人故事",
      ],
      styles: [
        { id: "cinematic", label: "电影感" },
        { id: "ugc", label: "真实感" },
        { id: "product", label: "产品片" },
      ],
      models: ["自动", "Seedance 2.5", "Seedance 2.0 Mini", "Wan 3.0"],
      resolutions: ["720p", "1080p"],
      audioOptions: [
        { id: "auto", label: "自动" },
        { id: "on", label: "开启" },
        { id: "off", label: "关闭" },
      ],
      reviewOptions: [
        { id: "auto", label: "自动" },
        { id: "ask", label: "生成前确认" },
      ],
    },
    skills: {
      label: "技能",
      title: "直接开始",
      review: {
        title: "即时评估",
        body: "量化一致性、镜头覆盖、提示清晰度和节奏，并给出修改建议。",
        action: "打开项目",
      },
      items: [
        {
          title: "故事板",
          body: "把一个想法变成可编辑的镜头。",
          prompt: "根据这个想法创建三段式故事板：",
        },
        {
          title: "镜头设计",
          body: "规划构图、运镜和时长。",
          prompt: "为下面的创意生成镜头清单，包含构图、运镜和时长：",
        },
        {
          title: "真实感视频",
          body: "生成自然的竖屏创作者视频。",
          prompt: "生成一条自然、竖屏、创作者出镜的真实感视频：",
        },
      ],
    },
    assets: {
      label: "素材",
      title: "进入工作区",
      items: [
        {
          title: "项目",
          body: "对话、故事板和生成任务。",
          href: "/projects",
        },
        {
          title: "故事板",
          body: "继续编排已有视频。",
          href: "/projects",
        },
        {
          title: "已生成镜头",
          body: "查看完成中和已完成的镜头。",
          href: "/projects",
        },
      ],
    },
    hots: {
      label: "Hots",
      title: "社区作品",
      makeThis: "做同款",
      items: [
        {
          title: "编辑感 Vlog",
          prompt: "在暗色创意工作室拍摄一条安静的编辑感 Vlog。",
        },
        {
          title: "欧洲清晨",
          prompt: "拍摄一条自然、手持感的欧洲清晨 Vlog。",
        },
        {
          title: "影棚人像",
          prompt: "拍摄一条暖色轮廓光、动作克制的时尚影棚 Vlog。",
        },
        {
          title: "产品亮相",
          prompt: "拍摄一条动作缓慢、灯光精准的产品亮相视频。",
        },
        {
          title: "夜间城市",
          prompt: "拍摄一条克制的夜间城市 Vlog，使用柔和的环境实景光。",
        },
        {
          title: "创始人肖像",
          prompt: "用三个镜头拍摄一条自然的创始人肖像视频。",
        },
      ],
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
