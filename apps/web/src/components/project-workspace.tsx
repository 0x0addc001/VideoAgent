"use client";

import {
  ArrowLeft,
  ArrowUp,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Film,
  Folder,
  FolderOpen,
  Gem,
  Image,
  Link2,
  LoaderCircle,
  Layers3,
  Mail,
  MapPin,
  MessageSquareText,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  ScanSearch,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  Video,
  WandSparkles,
  Wrench,
  X,
} from "lucide-react";
import { landingContent, StreamingText } from "@videoagent/landing";
import { useLocale, useTranslations } from "next-intl";
import {
  type CSSProperties,
  DragEvent,
  FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "@/i18n/navigation";
import { resolveApiBaseUrl } from "@/lib/api";
import { extractedConversationAttributes } from "@/lib/settings-attributes";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  title: string;
  brief: string;
  state: string;
  access_permission: "owner" | "edit" | "view";
  created_at: string;
  updated_at: string;
};

type Shot = {
  id: string;
  index: number;
  description: string;
  prompt_en: string;
  prompt_zh: string | null;
  duration_seconds: number;
  aspect_ratio: "21:9" | "16:9" | "9:16" | "1:1";
  generation_mode: "text_to_video" | "image_to_video";
  status: string;
};

type Character = {
  id: string;
  index: number;
  name: string;
  description: string;
  prompt_en: string;
  prompt_zh: string | null;
};

type Scene = {
  id: string;
  index: number;
  name: string;
  description: string;
  location: string;
  prompt_en: string;
  prompt_zh: string | null;
};

type ShotDraft = Pick<
  Shot,
  | "description"
  | "prompt_en"
  | "prompt_zh"
  | "duration_seconds"
  | "aspect_ratio"
  | "generation_mode"
>;

type CharacterDraft = Pick<
  Character,
  "name" | "description" | "prompt_en" | "prompt_zh"
>;

type SceneDraft = Pick<
  Scene,
  "name" | "description" | "location" | "prompt_en" | "prompt_zh"
>;

type Storyboard = {
  id: string;
  project_id: string;
  version: number;
  shots: Shot[];
  characters: Character[];
  scenes: Scene[];
};

type CostEstimate = {
  provider: string;
  credits: number;
  duration_seconds: number;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
  metadata?: Record<string, unknown>;
};

type AgentActivity = {
  id: string;
  run_id: string;
  sequence: number;
  kind:
    | "context"
    | "memory"
    | "skill"
    | "planning"
    | "validation"
    | "state"
    | "reply";
  label: string;
  detail: string | null;
  status: "running" | "completed" | "failed";
  created_at: string;
};

type AgentTurn = {
  user_message: Message;
  assistant_message: Message;
  storyboard: Storyboard;
  workflow: WorkflowState;
};

type WorkflowStage = "concept" | "outline" | "script" | "ready";

type WorkflowState = {
  project_id: string;
  stage: WorkflowStage;
  status: "awaiting_approval" | "approved";
  updated_at: string;
};

type WorkflowDecisionResponse = {
  user_message: Message;
  assistant_message: Message;
  storyboard: Storyboard;
  workflow: WorkflowState;
};

type WorkspaceFolder = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type WorkspaceThread = {
  id: string;
  title: string;
  brief: string;
  folder_id: string | null;
  message_count: number;
  preview: string | null;
  stage: WorkflowStage;
  status: "awaiting_approval" | "approved";
  created_at: string;
  updated_at: string;
};

type WorkspaceData = {
  folders: WorkspaceFolder[];
  recents: WorkspaceThread[];
};

type CanvasSelection =
  | { kind: "settings" }
  | { kind: "document"; document: "outline" | "script" }
  | { kind: "shot"; shotId: string }
  | {
      kind: "character";
      characterId: string;
    }
  | {
      kind: "scene";
      sceneId: string;
    }
  | {
      kind: "asset";
      assetId: string;
      section?: "description" | "generation";
    };

type GenerationJob = {
  id: string;
  shot_id: string;
  status:
    | "pending"
    | "submission_uncertain"
    | "submitted"
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "cancelled";
  result_url: string | null;
};

type Asset = {
  id: string;
  project_id: string | null;
  shot_id: string | null;
  kind: "upload" | "generated" | "export" | "cover" | "subtitle";
  filename: string;
  content_type: string;
  byte_size: number;
  checksum: string;
  permission: "private" | "public";
  content_url: string;
  created_at: string;
  updated_at: string;
};

type ExportResponse = {
  items: Asset[];
  cover: Asset | null;
};

type ShareLink = {
  id: string;
  asset_id: string;
  token: string;
  share_url: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

type ProjectCollaboration = {
  id: string;
  project_id: string;
  permission: "view" | "edit";
  collaborator_email: string | null;
  share_url: string;
  expires_at: string;
  created_at: string;
};

type VisualReviewMetricKey =
  | "character_consistency"
  | "style_consistency"
  | "prompt_alignment"
  | "temporal_stability";

type VisualReviewModel = {
  id: string;
  label: string;
};

type VisualReview = {
  asset_id: string;
  model: string;
  overall_score: number;
  metrics: {
    key: VisualReviewMetricKey;
    score: number;
    rationale: string;
  }[];
  summary: string;
  frame_count: number;
  updated_at: string;
};

const API_BASE_URL = resolveApiBaseUrl();
const PRODUCTION_SETTINGS_MARKER = /\n+\s*Production settings:/i;
const VIDEO_MODEL_OPTIONS = landingContent.en.composer.models.filter(
  (option) => option.id !== "auto",
);
const IMAGE_MODEL_OPTIONS = [
  {
    id: "kling-image-v3_0",
    label: "Kling/Kling Image 3.0",
    provider: "Kling",
  },
] as const;

function selectedModelRoute(modelId: string) {
  if (modelId === "project") return {};
  const option = [...VIDEO_MODEL_OPTIONS, ...IMAGE_MODEL_OPTIONS].find(
    (item) => item.id === modelId,
  );
  if (!option) return {};
  return {
    provider: option.provider.toLowerCase() as "kling" | "pippit",
    model: option.id,
  };
}

function creativeBrief(brief: string) {
  return brief.split(PRODUCTION_SETTINGS_MARKER, 1)[0]?.trim() || brief.trim();
}

function productionSettingPairs(brief: string) {
  const settingsLine = brief.match(/Production settings:\s*(.+)/i)?.[1];
  if (!settingsLine) return [];
  const labels = [
    "Skill",
    "Hook",
    "Style",
    "Frame",
    "Length",
    "Model",
    "Quality",
    "Audio",
    "Review",
  ];
  return settingsLine
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((value, index) => ({
      label: labels[index] ?? `Setting ${index + 1}`,
      value: value.replace(/^(Hook|Audio|Review)\s+/i, ""),
    }));
}

function WorkspaceModelSelect({
  allowProjectDefault = true,
  label = "Model",
  onChange,
  options,
  value,
}: {
  allowProjectDefault?: boolean;
  label?: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string;
}) {
  return (
    <label className="block min-w-44 text-[12px] text-white/38">
      <span>{label}</span>
      <select
        className="mt-2 w-full rounded-xl border border-white/[0.09] bg-[#11100d] px-3 py-2.5 text-[14px] text-white/78 outline-none transition focus:border-[#1677ff]/45"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {allowProjectDefault ? (
          <option value="project">Project default</option>
        ) : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AgentActivityTrace({
  activities,
  isWorking,
  locale,
}: {
  activities: AgentActivity[];
  isWorking: boolean;
  locale: string;
}) {
  const chinese = locale.startsWith("zh");
  const labels: Record<AgentActivity["kind"], string> = {
    context: chinese ? "载入项目上下文" : "Load project context",
    memory: chinese ? "读取项目记忆" : "Read project memory",
    skill: chinese ? "检查 Skill 指令" : "Resolve Skill instructions",
    planning: chinese ? "规划故事板" : "Plan the storyboard",
    validation: chinese ? "校验结构结果" : "Validate structured result",
    state: chinese ? "更新项目状态" : "Update project state",
    reply: chinese ? "组织导演回复" : "Compose director reply",
  };
  const active = activities.some((activity) => activity.status === "running");
  const failed = activities.some((activity) => activity.status === "failed");
  const completed = activities.filter(
    (activity) => activity.status === "completed",
  ).length;

  function ActivityIcon({ kind }: { kind: AgentActivity["kind"] }) {
    const className = "h-3.5 w-3.5";
    if (kind === "memory") return <Database className={className} />;
    if (kind === "skill") return <Wrench className={className} />;
    if (kind === "validation") return <FileCheck2 className={className} />;
    if (kind === "planning") return <BrainCircuit className={className} />;
    if (kind === "state") return <Layers3 className={className} />;
    if (kind === "reply") return <MessageSquareText className={className} />;
    return <Sparkles className={className} />;
  }

  return (
    <section
      aria-label={chinese ? "Agent 执行过程" : "Agent activity"}
      className="mr-3 overflow-hidden rounded-2xl border border-[#1677ff]/20 bg-[#07101d]/[0.72]"
      data-testid="agent-activity"
    >
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3">
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-lg",
            failed
              ? "bg-red-400/10 text-red-300"
              : active || isWorking
                ? "bg-[#1677ff]/15 text-[#77c8ff]"
                : "bg-emerald-400/10 text-emerald-300",
          )}
        >
          {active || isWorking ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : failed ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </span>
        <span className="min-w-0 flex-1 text-[13px] font-medium text-white/78">
          {active || isWorking
            ? chinese
              ? "VideoAgent 正在执行"
              : "VideoAgent is working"
            : failed
              ? chinese
                ? "Agent 执行失败"
                : "Agent run failed"
              : chinese
                ? "Agent 执行完成"
                : "Agent run complete"}
        </span>
        <span className="rounded-md bg-white/[0.045] px-2 py-1 text-[12px] text-white/38">
          {completed} {chinese ? "步" : completed === 1 ? "step" : "steps"}
        </span>
      </div>
      <ol className="space-y-0.5 px-3 py-2">
        {activities.map((activity) => (
          <li
            className="grid grid-cols-[18px_minmax(0,1fr)] gap-2 rounded-lg px-1.5 py-1.5"
            key={activity.id}
          >
            <span
              className={cn(
                "mt-0.5 grid size-[18px] place-items-center",
                activity.status === "failed"
                  ? "text-red-300"
                  : activity.status === "running"
                    ? "text-[#77c8ff]"
                    : "text-emerald-300/80",
              )}
            >
              {activity.status === "running" ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ActivityIcon kind={activity.kind} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium leading-5 text-white/66">
                {labels[activity.kind] ?? activity.label}
              </p>
              {activity.detail ? (
                <p className="mt-0.5 break-words text-[11px] leading-5 text-white/32">
                  {activity.detail}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function workspaceCopy(locale: string) {
  const chinese = locale.startsWith("zh");
  return chinese
    ? {
        projects: "Projects",
        recent: "Recents",
        conversations: "全部对话",
        newFolder: "新建项目",
        newConversation: "新建对话",
        folderName: "项目名称",
        save: "保存",
        cancel: "取消",
        rename: "重命名项目",
        delete: "删除项目",
        deleteConfirm: "删除这个项目目录？对话不会被删除。",
        dropHere: "拖入对话以收纳",
        leaveFolder: "拖到这里移出项目",
        collapse: "收起导航",
        expand: "展开导航",
        collapseAssets: "收起资产",
        expandAssets: "展开资产",
        collapseAgents: "收起 Agents",
        expandAgents: "展开 Agents",
        docs: "文档",
        assets: "资产",
        direction: "创作方向",
        vision: "视觉",
        settings: "设定集",
        settingAttributes: "属性",
        description: "描述",
        generation: "生成",
        character: "角色集",
        scene: "场景集",
        scenes: "Scenes",
        location: "地点",
        versions: "版本",
        thinking: "思考中",
        noAssets: "当前对话还没有资产。",
        brief: "方向",
        storyboard: "故事板",
        script: "剧本集",
        scripts: "剧本集",
        shots: "镜头",
        outline: "大纲集",
        media: "媒体",
        uploads: "上传素材",
        generated: "生成素材",
        exported: "成片与导出",
        stage: "审批阶段",
        stageConcept: "整体设定",
        stageOutline: "故事大纲",
        stageScript: "逐场剧本",
        stageReady: "可以生成",
        awaiting: "等待你的批准",
        approved: "已批准",
        approve: "批准并继续",
        refine: "让 Agent 调整",
        custom: "自定义修改",
        customPlaceholder: "输入你的修改意见，Agent 会保持当前阶段并重新规划……",
        apply: "发送修改",
        decisionError: "Agent 未能完成这一步，请重试。",
        folderError: "项目目录更新失败。",
        chatPlaceholder: "描述下一步，或向 VideoAgent 提问……",
        send: "发送",
        export: "导出",
        sharing: "分享中……",
        exportReady: "成片已就绪",
        download: "下载",
        share: "分享",
        shareTitle: "分享与协作",
        inviteEmail: "受邀人邮箱（可选）",
        canEdit: "可编辑",
        canView: "仅查看",
        linkAccess: "链接权限",
        createLink: "创建链接",
        copyLink: "复制链接",
        copied: "已复制",
        openLink: "打开链接",
        publish: "发布",
        publishTitle: "发布成片",
        publishPrompt: "描述",
        published: "已发布到 Videos",
        shot: "镜头",
        duration: "时长",
        ratio: "画面比例",
        estimate: "估算积分",
        generate: "生成镜头",
        approvalRequired: "请先在 Agents 中批准故事，再生成镜头。",
        generating: "生成中……",
        upload: "上传素材",
        uploading: "上传中……",
        downloadResult: "下载生成内容",
        current: "当前",
        keep: "按当前方向推进",
        adjustTone: "增强情绪张力",
        adjustPace: "收紧节奏",
        adjustHook: "强化开场钩子",
        addBeat: "增加一个叙事节拍",
        commercial: "增强商业转化感",
        readyMessage: "剧本已批准。选择镜头即可估算和生成。",
      }
    : {
        projects: "Projects",
        recent: "Recents",
        conversations: "All conversations",
        newFolder: "New project",
        newConversation: "New conversation",
        folderName: "Project name",
        save: "Save",
        cancel: "Cancel",
        rename: "Rename project",
        delete: "Delete project",
        deleteConfirm: "Delete this project folder? Conversations will not be deleted.",
        dropHere: "Drop a conversation here",
        leaveFolder: "Drop here to remove from project",
        collapse: "Collapse navigation",
        expand: "Expand navigation",
        collapseAssets: "Collapse assets",
        expandAssets: "Expand assets",
        collapseAgents: "Collapse agents",
        expandAgents: "Expand agents",
        docs: "Docs",
        assets: "Assets",
        direction: "Directions",
        vision: "Visions",
        settings: "Settings",
        settingAttributes: "Attributes",
        description: "Description",
        generation: "Generation",
        character: "Characters",
        scene: "Scenes",
        scenes: "Scenes",
        location: "Location",
        versions: "Versions",
        thinking: "Thinking",
        noAssets: "No assets in this conversation yet.",
        brief: "Direction",
        storyboard: "Storyboard",
        script: "Scripts",
        scripts: "Scripts",
        shots: "Shots",
        outline: "Outlines",
        media: "Media",
        uploads: "Uploads",
        generated: "Generated",
        exported: "Exports",
        stage: "Approval stage",
        stageConcept: "Overall direction",
        stageOutline: "Story outline",
        stageScript: "Scene script",
        stageReady: "Ready to generate",
        awaiting: "Waiting for your approval",
        approved: "Approved",
        approve: "Approve and continue",
        refine: "Ask the agent to refine",
        custom: "Custom instruction",
        customPlaceholder:
          "Describe a change. The agent will stay on this stage and plan again…",
        apply: "Send instruction",
        decisionError: "The agent could not complete this step. Try again.",
        folderError: "The project folder could not be updated.",
        chatPlaceholder: "Describe the next move or ask VideoAgent…",
        send: "Send",
        export: "Export",
        sharing: "Sharing…",
        exportReady: "Export ready",
        download: "Download",
        share: "Share",
        shareTitle: "Share and collaborate",
        inviteEmail: "Invitee email (optional)",
        canEdit: "Can edit",
        canView: "Can view",
        linkAccess: "Link access",
        createLink: "Create link",
        copyLink: "Copy link",
        copied: "Copied",
        openLink: "Open link",
        publish: "Publish",
        publishTitle: "Publish final cut",
        publishPrompt: "Description",
        published: "Published to Videos",
        shot: "Shot",
        duration: "Duration",
        ratio: "Aspect ratio",
        estimate: "Estimate credits",
        generate: "Generate shot",
        approvalRequired: "Approve the story in Agents before generating a shot.",
        generating: "Generating…",
        upload: "Upload asset",
        uploading: "Uploading…",
        downloadResult: "Download result",
        current: "Current",
        keep: "Continue with this direction",
        adjustTone: "Raise the emotional stakes",
        adjustPace: "Tighten the pacing",
        adjustHook: "Sharpen the opening hook",
        addBeat: "Add another story beat",
        commercial: "Make it more commercial",
        readyMessage: "The script is approved. Choose a shot to estimate and generate.",
      };
}

type WorkspaceHistoryProps = {
  activeProjectId: string;
  collapsed: boolean;
  draggingThreadId: string | null;
  locale: string;
  openFolders: string[];
  workspace: WorkspaceData;
  onBeginDrag: (event: DragEvent<HTMLElement>, threadId: string) => void;
  onDeleteFolder: (folder: WorkspaceFolder) => void;
  onDrop: (event: DragEvent<HTMLElement>, folderId: string | null) => void;
  onNewFolder: () => void;
  onRenameFolder: (folder: WorkspaceFolder) => void;
  onToggleCollapsed: () => void;
  onToggleFolder: (folderId: string) => void;
};

function WorkspaceHistory({
  activeProjectId,
  collapsed,
  draggingThreadId,
  locale,
  openFolders,
  workspace,
  onBeginDrag,
  onDeleteFolder,
  onDrop,
  onNewFolder,
  onRenameFolder,
  onToggleCollapsed,
  onToggleFolder,
}: WorkspaceHistoryProps) {
  const copy = workspaceCopy(locale);
  const [historySections, setHistorySections] = useState({
    projects: true,
    recents: true,
  });
  const primaryNavItems = [
    { href: "/#agents", icon: Sparkles, label: "Agents" },
    { href: "/#skills", icon: Video, label: "Skills" },
    { href: "/#hots", icon: Film, label: "Videos" },
    { href: "/#assets", icon: Layers3, label: copy.assets },
    { href: "/#docs", icon: FileText, label: copy.docs },
  ] as const;

  if (collapsed) {
    return (
      <aside className="flex w-[76px] min-h-0 shrink-0 flex-col items-center border-white/[0.07] bg-[#0d0c0a] py-3 xl:mb-5 xl:ml-5 xl:rounded-[26px] xl:border">
        <span className="grid size-10 place-items-center rounded-xl bg-[#1677ff] text-white">
          <Clapperboard className="h-5 w-5" />
        </span>
        <nav className="mt-5 grid gap-2" aria-label="Main navigation">
          {primaryNavItems.map(({ href, icon: Icon, label }) => (
            <a
              aria-label={label}
              className="grid size-10 place-items-center rounded-xl text-white/42 hover:bg-white/[0.06] hover:text-white"
              href={`/${locale}${href}`}
              key={label}
              title={label}
            >
              <Icon className="h-[18px] w-[18px]" />
            </a>
          ))}
        </nav>
        <button
          aria-label={copy.expand}
          className="mt-auto grid size-10 place-items-center rounded-xl text-white/50 hover:bg-white/[0.06] hover:text-white"
          onClick={onToggleCollapsed}
          type="button"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  const recentThreads = workspace.recents.filter((thread) => !thread.folder_id);
  const assignedByFolder = new Map<string, WorkspaceThread[]>();
  for (const thread of recentThreads) {
    if (!thread.folder_id) continue;
    const items = assignedByFolder.get(thread.folder_id) ?? [];
    items.push(thread);
    assignedByFolder.set(thread.folder_id, items);
  }

  function threadRow(thread: WorkspaceThread) {
    return (
      <a
        aria-current={thread.id === activeProjectId ? "page" : undefined}
        className={cn(
          "group relative block rounded-xl border px-3 py-2.5 transition",
          thread.id === activeProjectId
            ? "border-transparent bg-[#1677ff]/[0.14] text-[#8fdcff]"
            : "border-transparent hover:border-white/[0.08] hover:bg-white/[0.035]",
        )}
        draggable
        href={`#conversation/${thread.id}`}
        key={thread.id}
        onClick={(event) => {
          event.preventDefault();
          window.history.pushState(null, "", `#conversation/${thread.id}`);
          window.dispatchEvent(new Event("hashchange"));
        }}
        onDragStart={(event) => onBeginDrag(event, thread.id)}
      >
        <strong
          className={cn(
            "truncate text-[18px] font-medium",
            thread.id === activeProjectId ? "text-[#8fdcff]" : "text-white/78",
          )}
        >
          {thread.title}
        </strong>
      </a>
    );
  }

  return (
    <aside className="flex w-[280px] min-h-0 shrink-0 flex-col border-white/[0.07] bg-[#0d0c0a] xl:mb-5 xl:ml-5 xl:rounded-[26px] xl:border">
      <div
        className="flex h-14 items-center justify-between px-4"
        data-testid="workspace-header-history"
      >
        <Link className="flex items-center gap-2.5 text-[18px] font-semibold" href="/">
          <span className="grid size-8 place-items-center rounded-lg bg-[#1677ff] text-white">
            <PlayIcon />
          </span>
          VideoAgent
        </Link>
        <button
          aria-label={copy.collapse}
          className="grid size-8 place-items-center rounded-lg text-[#4facff] hover:bg-[#1677ff]/10 hover:text-[#9bd8ff]"
          onClick={onToggleCollapsed}
          type="button"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <nav
        className="grid gap-1 border-t border-white/10 px-3 py-3"
        aria-label="Main navigation"
      >
        {primaryNavItems.map(({ href, icon: Icon, label }) => (
          <a
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[18px] text-white/48 transition hover:bg-white/[0.04] hover:text-white"
            href={`/${locale}${href}`}
            key={label}
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </a>
        ))}
      </nav>

      <div className="conversation-history-scroll min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-3 py-3">
        <div className="flex items-center justify-between px-2">
          <button
            className="text-[18px] font-medium text-white/42 hover:text-white/72"
            onClick={() =>
              setHistorySections((current) => ({
                ...current,
                projects: !current.projects,
              }))
            }
            type="button"
          >
            {historySections.projects ? (
              <ChevronDown className="mr-1.5 inline h-4 w-4" />
            ) : (
              <ChevronRight className="mr-1.5 inline h-4 w-4" />
            )}
            {copy.projects}
          </button>
          <button
            aria-label={copy.newFolder}
            className="sidebar-history-add grid size-7 place-items-center rounded-lg bg-transparent text-white/38 hover:bg-white/[0.06] hover:text-white"
            onClick={onNewFolder}
            type="button"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {historySections.projects ? (
          <div className="mt-2 space-y-1">
          {workspace.folders.length === 0 ? (
            <button
              className="w-full rounded-xl border border-dashed border-white/[0.09] px-3 py-3 text-left text-[12px] text-white/28 hover:border-[#1677ff]/30"
              onClick={onNewFolder}
              type="button"
            >
              {copy.newFolder}
            </button>
          ) : null}
          {workspace.folders.map((folder) => {
            const folderThreads = assignedByFolder.get(folder.id) ?? [];
            const open = openFolders.includes(folder.id);
            return (
              <div
                className={cn(
                  "rounded-xl border border-transparent transition",
                  draggingThreadId && "border-[#1677ff]/15 bg-[#1677ff]/[0.03]",
                )}
                key={folder.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDrop(event, folder.id)}
              >
                <div className="group flex items-center">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-[18px] text-white/62"
                    onClick={() => onToggleFolder(folder.id)}
                    type="button"
                  >
                    {open ? (
                      <ChevronDown className="h-3.5 w-3.5 text-white/30" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-white/30" />
                    )}
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <button
                    aria-label={copy.rename}
                    className="mr-0.5 hidden size-7 place-items-center rounded-lg text-white/30 hover:bg-white/[0.06] hover:text-white group-hover:grid"
                    onClick={() => onRenameFolder(folder)}
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label={copy.delete}
                    className="mr-1 hidden size-7 place-items-center rounded-lg text-white/30 hover:bg-red-400/10 hover:text-red-300 group-hover:grid"
                    onClick={() => onDeleteFolder(folder)}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {open ? (
                  <div className="space-y-1 px-2 pb-2 pl-6">
                    {folderThreads.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-white/[0.08] px-3 py-2 text-[11px] text-white/24">
                        {copy.dropHere}
                      </p>
                    ) : (
                      folderThreads.map(threadRow)
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
          </div>
        ) : null}

        <div
          className="mt-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => onDrop(event, null)}
        >
          <div className="flex items-center justify-between px-2">
            <button
              className="text-[18px] font-medium text-white/42 hover:text-white/72"
              onClick={() =>
                setHistorySections((current) => ({
                  ...current,
                  recents: !current.recents,
                }))
              }
              type="button"
            >
              {historySections.recents ? (
                <ChevronDown className="mr-1.5 inline h-4 w-4" />
              ) : (
                <ChevronRight className="mr-1.5 inline h-4 w-4" />
              )}
              {copy.recent}
            </button>
            <a
              aria-label={copy.newConversation}
              className="sidebar-history-add grid size-7 place-items-center rounded-lg bg-transparent text-white/38 hover:bg-white/[0.06] hover:text-white"
              href="#agents"
            >
              <Plus className="h-4 w-4" />
            </a>
          </div>
          {historySections.recents ? (
            <div className="mt-2 space-y-1">
              {recentThreads.map(threadRow)}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 5.5v13l10-6.5-10-6.5Z" fill="currentColor" />
    </svg>
  );
}

type ApprovalCardProps = {
  copy: ReturnType<typeof workspaceCopy>;
  customOpen: boolean;
  customValue: string;
  isWorking: boolean;
  stage: WorkflowStage;
  onCustomOpen: () => void;
  onCustomValue: (value: string) => void;
  onDecision: (
    choice: "approve" | "refine" | "custom",
    instruction?: string,
  ) => void;
};

function ApprovalCard({
  copy,
  customOpen,
  customValue,
  isWorking,
  stage,
  onCustomOpen,
  onCustomValue,
  onDecision,
}: ApprovalCardProps) {
  const options =
    stage === "concept"
      ? [
          { label: copy.keep, choice: "approve" as const },
          { label: copy.adjustTone, choice: "refine" as const },
          { label: copy.commercial, choice: "refine" as const },
        ]
      : stage === "outline"
        ? [
            { label: copy.keep, choice: "approve" as const },
            { label: copy.addBeat, choice: "refine" as const },
            { label: copy.adjustPace, choice: "refine" as const },
          ]
        : [
            { label: copy.keep, choice: "approve" as const },
            { label: copy.adjustHook, choice: "refine" as const },
            { label: copy.adjustPace, choice: "refine" as const },
          ];

  return (
    <div className="rounded-2xl border border-[#1677ff]/25 bg-[#1677ff]/[0.055] p-3.5">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-[#1677ff]" />
        <p className="text-[12px] font-medium text-[#9bd3ff]">{copy.awaiting}</p>
      </div>
      <div className="mt-3 space-y-2">
        {options.map((option) => (
          <button
            className="flex w-full items-center justify-between rounded-xl border border-white/[0.09] bg-black/15 px-3 py-2.5 text-left text-[12px] text-white/70 transition hover:border-[#1677ff]/35 hover:bg-[#1677ff]/[0.07] hover:text-white"
            disabled={isWorking}
            key={`${option.choice}-${option.label}`}
            onClick={() =>
              onDecision(
                option.choice,
                option.choice === "approve" ? undefined : option.label,
              )
            }
            type="button"
          >
            {option.choice === "approve" ? (
              <Check className="h-3.5 w-3.5 text-[#73c5ff]" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-[#73c5ff]" />
            )}
            <span className="flex-1">{option.label}</span>
            <ChevronRight className="h-3.5 w-3.5 text-white/25" />
          </button>
        ))}
        <button
          className={cn(
            "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[12px] transition",
            customOpen
              ? "border-[#1677ff]/40 bg-[#1677ff]/[0.08] text-white"
              : "border-dashed border-white/[0.12] text-white/55 hover:border-white/25 hover:text-white",
          )}
          onClick={onCustomOpen}
          type="button"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="flex-1">{copy.custom}</span>
        </button>
        {customOpen ? (
          <div className="rounded-xl border border-white/[0.09] bg-black/20 p-2">
            <textarea
              autoFocus
              className="min-h-20 w-full resize-none bg-transparent px-2 py-1 text-[12px] leading-5 text-white outline-none placeholder:text-white/25"
              onChange={(event) => onCustomValue(event.target.value)}
              placeholder={copy.customPlaceholder}
              value={customValue}
            />
            <button
              className="mt-1 w-full rounded-lg bg-[#1677ff] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
              disabled={isWorking || !customValue.trim()}
              onClick={() => onDecision("custom", customValue)}
              type="button"
            >
              {copy.apply}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AssetResultList({
  assets,
  selectedAssetId,
  onDelete,
  onOpen,
  onSelect,
}: {
  assets: Asset[];
  selectedAssetId?: string;
  onDelete: (asset: Asset) => void;
  onOpen: (asset: Asset) => void;
  onSelect: (assetId: string | null) => void;
}) {
  if (assets.length === 0) return null;
  return (
    <div className="space-y-1">
      {assets.map((asset) => (
        <div
          className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-2 py-1.5"
          key={asset.id}
        >
          <input
            aria-label={`Select ${asset.id} as final`}
            checked={selectedAssetId === asset.id}
            className="size-4 accent-[#1677ff]"
            onChange={(event) => onSelect(event.target.checked ? asset.id : null)}
            type="checkbox"
          />
          <button
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-[12px] text-white/52 hover:text-white/82"
            onClick={() => onOpen(asset)}
            type="button"
          >
            {asset.content_type.startsWith("video/") ? (
              <Film className="h-3.5 w-3.5 shrink-0 text-[#4facff]" />
            ) : (
              <Image className="h-3.5 w-3.5 shrink-0 text-[#4facff]" />
            )}
            <span className="truncate">{asset.filename}</span>
            <span className="shrink-0 text-[11px] text-white/28">
              @{asset.id.slice(0, 8)}
            </span>
          </button>
          <button
            aria-label={`Copy asset ID ${asset.id}`}
            className="grid size-7 place-items-center rounded-md text-white/32 hover:bg-white/[0.04] hover:text-white"
            onClick={() => void navigator.clipboard?.writeText(asset.id)}
            title={asset.id}
            type="button"
          >
            <FileCheck2 className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label={`Delete ${asset.filename}`}
            className="grid size-7 place-items-center rounded-md text-white/32 hover:bg-red-400/10 hover:text-red-300"
            onClick={() => onDelete(asset)}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

type AssetsTreeProps = {
  assets: Asset[];
  collapsed: boolean;
  copy: ReturnType<typeof workspaceCopy>;
  onDeleteAsset: (asset: Asset) => void;
  onResizeStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onSelectAsset: (
    resourceType: "shot" | "character" | "scene",
    resourceId: string,
    assetId: string | null,
  ) => void;
  selected: CanvasSelection;
  selectedResourceAssets: Record<string, string>;
  storyboard: Storyboard | null;
  onSelect: (selection: CanvasSelection) => void;
  onToggleCollapsed: () => void;
};

function AssetsTree({
  assets,
  collapsed,
  copy,
  onDeleteAsset,
  onResizeStart,
  onSelectAsset,
  selected,
  selectedResourceAssets,
  storyboard,
  onSelect,
  onToggleCollapsed,
}: AssetsTreeProps) {
  const [sections, setSections] = useState({
    direction: true,
    vision: true,
    character: true,
    scene: true,
    shots: true,
    versions: true,
  });
  const selectedClass =
    "border-[#1677ff]/30 bg-[#1677ff]/[0.08] text-white";
  const idleClass =
    "border-transparent text-white/50 hover:border-white/[0.07] hover:bg-white/[0.03] hover:text-white/75";

  if (collapsed) {
    return (
      <aside className="flex w-full min-h-0 flex-col items-center border-r border-white/[0.07] bg-[#0b0a08]/[0.82] backdrop-blur-xl">
        <div
          className="grid h-[88px] shrink-0 place-items-center border-b border-white/[0.07] bg-[#0b0a08]/[0.96]"
          data-testid="workspace-header-assets"
        >
          <button
            aria-label={copy.expandAssets}
            className="grid size-8 place-items-center rounded-lg text-[#4facff] hover:bg-[#1677ff]/10"
            onClick={onToggleCollapsed}
            type="button"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
        <button
          className="mt-3 grid place-items-center gap-3 rounded-xl px-2 py-3 text-[#4facff] hover:bg-[#1677ff]/10"
          onClick={onToggleCollapsed}
          type="button"
        >
          <Layers3 className="h-5 w-5" />
          <span className="[writing-mode:vertical-rl] text-[13px] tracking-[0.08em]">
            {copy.assets}
          </span>
        </button>
      </aside>
    );
  }

  function sectionButton(
    key: keyof typeof sections,
    label: string,
    nested = false,
  ) {
    const DirectoryIcon = sections[key] ? FolderOpen : Folder;
    return (
      <button
        className={cn(
          "flex w-full items-center gap-2 rounded-lg py-2 pr-2 text-left text-[15px] font-semibold text-white/48 hover:bg-white/[0.035] hover:text-white/72",
          nested ? "pl-7" : "pl-2",
        )}
        onClick={() =>
          setSections((current) => ({ ...current, [key]: !current[key] }))
        }
        type="button"
      >
        {sections[key] ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <DirectoryIcon className="h-4 w-4 text-[#6eb8ff]" />
        {label}
      </button>
    );
  }

  const characters = storyboard?.characters ?? [];
  const scenes = storyboard?.scenes ?? [];
  const sourceAssets = assets.filter(
    (asset) => !["export", "cover"].includes(asset.kind),
  );
  const versionAssets = assets.filter((asset) => asset.kind === "export");

  return (
    <aside className="relative flex w-full min-h-0 min-w-0 shrink-0 flex-col border-r border-white/[0.07] bg-[#0b0a08]/[0.72] backdrop-blur-lg">
      <button
        aria-label="Resize assets pane"
        className="absolute -right-1 top-0 z-20 hidden h-full w-2 cursor-col-resize bg-transparent xl:block"
        onPointerDown={onResizeStart}
        type="button"
      />
      <div
        className="flex h-[88px] items-center justify-between border-b border-white/[0.07] bg-[#0b0a08]/[0.96] px-4"
        data-testid="workspace-header-assets"
      >
        <span className="flex items-center gap-2 text-[12px] font-medium text-white/82">
          <Layers3 className="h-4 w-4 text-[#6eb8ff]" />
          {copy.assets}
        </span>
        <button
          aria-label={copy.collapseAssets}
          className="grid size-8 place-items-center rounded-lg text-[#4facff] hover:bg-[#1677ff]/10"
          onClick={onToggleCollapsed}
          type="button"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {sectionButton("direction", copy.direction)}
          {sections.direction ? (
            <div className="space-y-1 pl-3">
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition",
                  selected.kind === "settings" ? selectedClass : idleClass,
                )}
                onClick={() => onSelect({ kind: "settings" })}
                type="button"
              >
                <FileText className="h-3.5 w-3.5 text-[#4facff]" />
                {copy.settings}
              </button>
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition",
                  selected.kind === "document" && selected.document === "outline"
                    ? selectedClass
                    : idleClass,
                )}
                onClick={() => onSelect({ kind: "document", document: "outline" })}
                type="button"
              >
                <FileText className="h-3.5 w-3.5 text-[#4facff]" />
                {copy.outline}
              </button>
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition",
                  selected.kind === "document" && selected.document === "script"
                    ? selectedClass
                    : idleClass,
                )}
                onClick={() => onSelect({ kind: "document", document: "script" })}
                type="button"
              >
                <FileText className="h-3.5 w-3.5 text-[#4facff]" />
                {copy.script}
              </button>
            </div>
          ) : null}

          {sectionButton("vision", copy.vision)}
          {sections.vision ? (
            <div className="space-y-1 pl-3">
              {sectionButton("character", copy.character, true)}
              {sections.character ? (
                <div className="space-y-1 pl-7">
                  {characters.map((character) => (
                    <div className="space-y-1" key={character.id}>
                      <button
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition",
                          selected.kind === "character" &&
                            selected.characterId === character.id
                            ? "bg-[#1677ff]/[0.08] text-white"
                            : "text-white/58 hover:bg-white/[0.03] hover:text-white/78",
                        )}
                        onClick={() =>
                          onSelect({
                            kind: "character",
                            characterId: character.id,
                          })
                        }
                        type="button"
                      >
                        <Folder className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                        <span className="truncate">{character.name}</span>
                      </button>
                        <div className="mt-1 pl-2">
                          <AssetResultList
                            assets={sourceAssets.filter(
                              (asset) =>
                                asset.content_type.startsWith("image/") &&
                                asset.filename.startsWith(
                                  `character-${character.id}-`,
                                ),
                            )}
                            onDelete={onDeleteAsset}
                            onOpen={(asset) =>
                              onSelect({
                                kind: "asset",
                                assetId: asset.id,
                                section: "generation",
                              })
                            }
                            onSelect={(assetId) =>
                              void onSelectAsset(
                                "character",
                                character.id,
                                assetId,
                              )
                            }
                            selectedAssetId={
                              selectedResourceAssets[
                                `character:${character.id}`
                              ]
                            }
                          />
                        </div>
                      </div>
                  ))}
                </div>
              ) : null}

              {sectionButton("scene", copy.scenes, true)}
              {sections.scene ? (
                <div className="space-y-1 pl-7">
                  {scenes.map((scene) => (
                    <div className="space-y-1" key={scene.id}>
                      <button
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition",
                          selected.kind === "scene" &&
                            selected.sceneId === scene.id
                            ? "bg-[#1677ff]/[0.08] text-white"
                            : "text-white/58 hover:bg-white/[0.03] hover:text-white/78",
                        )}
                        onClick={() =>
                          onSelect({
                            kind: "scene",
                            sceneId: scene.id,
                          })
                        }
                        type="button"
                      >
                        <Folder className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                        <span className="truncate">{scene.name}</span>
                      </button>
                      <div className="mt-1 pl-2">
                        <AssetResultList
                          assets={sourceAssets.filter(
                            (asset) =>
                              asset.content_type.startsWith("image/") &&
                              asset.filename.startsWith(`scene-${scene.id}-`),
                          )}
                          onDelete={onDeleteAsset}
                          onOpen={(asset) =>
                            onSelect({
                              kind: "asset",
                              assetId: asset.id,
                              section: "generation",
                            })
                          }
                          onSelect={(assetId) =>
                            void onSelectAsset("scene", scene.id, assetId)
                          }
                          selectedAssetId={
                            selectedResourceAssets[`scene:${scene.id}`]
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {sectionButton("shots", copy.shots, true)}
              {sections.shots ? (
                <div className="space-y-1 pl-7">
                  {storyboard?.shots.map((shot) => (
                    <div className="space-y-0.5" key={shot.id}>
                      <button
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition",
                          selected.kind === "shot" &&
                            selected.shotId === shot.id
                            ? "bg-[#1677ff]/[0.08] text-white"
                            : "text-white/58 hover:bg-white/[0.03] hover:text-white/78",
                        )}
                        onClick={() =>
                          onSelect({ kind: "shot", shotId: shot.id })
                        }
                        type="button"
                      >
                        <Folder className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                        <span className="truncate font-medium">
                          {copy.shot} {shot.index + 1}
                        </span>
                      </button>
                      <div className="pl-6">
                        <AssetResultList
                          assets={sourceAssets.filter(
                            (asset) => asset.shot_id === shot.id,
                          )}
                          onDelete={onDeleteAsset}
                          onOpen={(asset) =>
                            onSelect({
                              kind: "asset",
                              assetId: asset.id,
                              section: "generation",
                            })
                          }
                          onSelect={(assetId) =>
                            void onSelectAsset("shot", shot.id, assetId)
                          }
                          selectedAssetId={
                            selectedResourceAssets[`shot:${shot.id}`]
                          }
                        />
                      </div>
                    </div>
                  ))}
                  {sourceAssets
                    .filter(
                      (asset) =>
                        asset.shot_id === null &&
                        !asset.filename.startsWith("character-") &&
                        !asset.filename.startsWith("scene-"),
                    )
                    .map((asset) => (
                        <button
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[12px] transition",
                            selected.kind === "asset" &&
                              selected.assetId === asset.id
                              ? "bg-[#1677ff]/[0.07] text-white/82"
                              : "text-white/40 hover:bg-white/[0.025] hover:text-white/70",
                          )}
                          onClick={() =>
                            onSelect({
                              kind: "asset",
                              assetId: asset.id,
                              section: "generation",
                            })
                          }
                          key={asset.id}
                          type="button"
                        >
                          <Film className="h-3.5 w-3.5 text-[#4facff]" />
                          <span className="truncate">{asset.filename}</span>
                        </button>
                    ))}
                </div>
              ) : null}

            </div>
          ) : null}

          {sectionButton("versions", copy.versions)}
          {sections.versions ? (
            <div className="space-y-1 pl-3">
              {versionAssets.map((asset) => (
                <button
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition",
                    selected.kind === "asset" && selected.assetId === asset.id
                      ? selectedClass
                      : idleClass,
                  )}
                  key={asset.id}
                  onClick={() => onSelect({ kind: "asset", assetId: asset.id })}
                  type="button"
                >
                  <Film className="h-3.5 w-3.5 text-[#4facff]" />
                  <span className="truncate">{asset.filename}</span>
                  <time
                    className="ml-auto shrink-0 text-white/28"
                    dateTime={asset.created_at}
                  >
                    {asset.created_at.slice(0, 10)}
                  </time>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function ProjectWorkspace({
  projectId,
  embedded = false,
}: {
  projectId: string;
  embedded?: boolean;
}) {
  const t = useTranslations("workspace");
  const locale = useLocale();
  const [project, setProject] = useState<Project | null>(null);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([]);
  const [agentActivityRunId, setAgentActivityRunId] = useState<string | null>(
    null,
  );
  const [streamingMessageIds, setStreamingMessageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [messageDraft, setMessageDraft] = useState("");
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [shotDraft, setShotDraft] = useState<ShotDraft | null>(null);
  const [shotGenerationModel, setShotGenerationModel] = useState("project");
  const [characterDraft, setCharacterDraft] = useState<CharacterDraft | null>(
    null,
  );
  const [characterGenerationModel, setCharacterGenerationModel] = useState<string>(
    IMAGE_MODEL_OPTIONS[0].id,
  );
  const [sceneDraft, setSceneDraft] = useState<SceneDraft | null>(null);
  const [characterEstimate, setCharacterEstimate] = useState<CostEstimate | null>(
    null,
  );
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generationErrorOpen, setGenerationErrorOpen] = useState(false);
  const [generationErrorMessage, setGenerationErrorMessage] = useState<string | null>(
    null,
  );
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [visualReviewModels, setVisualReviewModels] = useState<
    VisualReviewModel[]
  >([]);
  const [visualReviewModel, setVisualReviewModel] = useState("");
  const [visualReviewMetrics, setVisualReviewMetrics] = useState<
    VisualReviewMetricKey[]
  >([
    "character_consistency",
    "style_consistency",
    "prompt_alignment",
    "temporal_stability",
  ]);
  const [visualReview, setVisualReview] = useState<VisualReview | null>(null);
  const [visualReviewError, setVisualReviewError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedResourceAssets, setSelectedResourceAssets] = useState<
    Record<string, string>
  >({});
  const [exportedAssets, setExportedAssets] = useState<Asset[]>([]);
  const [exportCover, setExportCover] = useState<Asset | null>(null);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [collaborationLink, setCollaborationLink] =
    useState<ProjectCollaboration | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] =
    useState<"view" | "edit">("view");
  const [shareCopied, setShareCopied] = useState(false);
  const [sharePermissionOpen, setSharePermissionOpen] = useState(false);
  const [publishAsset, setPublishAsset] = useState<Asset | null>(null);
  const [publishTitleDraft, setPublishTitleDraft] = useState("");
  const [publishPromptDraft, setPublishPromptDraft] = useState("");
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [assetsPanelCollapsed, setAssetsPanelCollapsed] = useState(false);
  const [agentPanelCollapsed, setAgentPanelCollapsed] = useState(false);
  const [assetsPaneWidth, setAssetsPaneWidth] = useState<number | null>(null);
  const [agentPaneWidth, setAgentPaneWidth] = useState<number | null>(null);
  const [mobilePanel, setMobilePanel] = useState<
    "agent" | "canvas" | "inspector" | "assets" | "history"
  >("canvas");
  const [workspace, setWorkspace] = useState<WorkspaceData>({
    folders: [],
    recents: [],
  });
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  const [selectedCanvas, setSelectedCanvas] = useState<CanvasSelection>({
    kind: "settings",
  });
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<WorkspaceFolder | null>(null);
  const [draggingThreadId, setDraggingThreadId] = useState<string | null>(null);
  const [customDecisionOpen, setCustomDecisionOpen] = useState(false);
  const [customDecision, setCustomDecision] = useState("");
  const [pendingDecision, setPendingDecision] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function beginAssistantStream(message: Message) {
    setStreamingMessageIds((current) => {
      const next = new Set(current);
      next.add(message.id);
      return next;
    });
  }

  function finishAssistantStream(messageId: string) {
    setStreamingMessageIds((current) => {
      if (!current.has(messageId)) return current;
      const next = new Set(current);
      next.delete(messageId);
      return next;
    });
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [
          projectResponse,
          storyboardResponse,
          messagesResponse,
          assetsResponse,
          workspaceResponse,
          workflowResponse,
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/projects/${projectId}`, { credentials: "include" }),
          fetch(`${API_BASE_URL}/projects/${projectId}/storyboard`, {
            credentials: "include",
          }),
          fetch(`${API_BASE_URL}/projects/${projectId}/messages`, {
            credentials: "include",
          }),
          fetch(`${API_BASE_URL}/projects/${projectId}/assets`, {
            credentials: "include",
          }),
          fetch(`${API_BASE_URL}/workspace`, { credentials: "include" }).catch(
            () => null,
          ),
          fetch(`${API_BASE_URL}/projects/${projectId}/workflow`, {
            credentials: "include",
          }).catch(() => null),
        ]);
        if (!active) return;
        if (projectResponse.status === 404) {
          setStatus("missing");
          return;
        }
        if (!projectResponse.ok) {
          throw new Error("load-failed");
        }
        const nextProject = (await projectResponse.json()) as Project;
        setProject(nextProject);
        if (storyboardResponse.ok) {
          const nextStoryboard = (await storyboardResponse.json()) as Storyboard;
          setStoryboard(nextStoryboard);
          setSelectedShotId(nextStoryboard.shots[0]?.id ?? null);
          setSelectedCanvas(
            nextStoryboard.shots.length > 0
              ? { kind: "document", document: "outline" }
              : { kind: "settings" },
          );
        }
        let nextMessages: Message[] = [];
        if (messagesResponse.ok) {
          nextMessages = ((await messagesResponse.json()) as { items: Message[] }).items;
          setMessages(nextMessages);
        }
        if (assetsResponse.ok) {
          const nextAssets = ((await assetsResponse.json()) as { items: Asset[] })
            .items;
          setAssets(nextAssets);
          setExportedAssets(
            nextAssets.filter((asset) => asset.kind === "export"),
          );
          setExportCover(
            nextAssets.find((asset) => asset.kind === "cover") ?? null,
          );
        }
        if (workspaceResponse?.ok) {
          const nextWorkspace = (await workspaceResponse.json()) as WorkspaceData;
          setWorkspace(nextWorkspace);
          setOpenFolders(nextWorkspace.folders.map((folder) => folder.id));
        }
        if (workflowResponse?.ok) {
          setWorkflow((await workflowResponse.json()) as WorkflowState);
        }
        const hashQuery = window.location.hash.split("?", 2)[1] ?? "";
        const shouldStart =
          new URLSearchParams(hashQuery).get("start") === "1" &&
          nextMessages.length === 0 &&
          Boolean(creativeBrief(nextProject.brief));
        if (shouldStart) {
          const runId = crypto.randomUUID();
          const turnResponse = await fetch(
            `${API_BASE_URL}/projects/${projectId}/messages`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: creativeBrief(nextProject.brief),
                run_id: runId,
              }),
            },
          );
          if (turnResponse.ok) {
            const turn = (await turnResponse.json()) as AgentTurn;
            beginAssistantStream(turn.assistant_message);
            setMessages([turn.user_message, turn.assistant_message]);
            setStoryboard(turn.storyboard);
            setSelectedShotId(turn.storyboard.shots[0]?.id ?? null);
            setSelectedCanvas(
              turn.storyboard.shots.length > 0
                ? { kind: "document", document: "outline" }
                : { kind: "settings" },
            );
            if (turn.workflow) setWorkflow(turn.workflow);
            setAgentActivityRunId(runId);
            const activityResponse = await fetch(
              `${API_BASE_URL}/projects/${projectId}/agent-activity/${runId}`,
              { credentials: "include" },
            ).catch(() => null);
            if (activityResponse?.ok) {
              const activityPayload = (await activityResponse.json()) as {
                items: AgentActivity[];
              };
              setAgentActivities(activityPayload.items);
            }
            window.history.replaceState(
              null,
              "",
              `#conversation/${projectId}`,
            );
          }
        }
        setStatus("ready");
      } catch {
        if (active) setStatus("missing");
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!project) return;
    let active = true;
    fetch(`${API_BASE_URL}/projects/${project.id}/asset-selections`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("selection-load-failed");
        return (await response.json()) as {
          items: Array<{
            resource_type: "shot" | "character" | "scene";
            resource_id: string;
            asset_id: string;
          }>;
        };
      })
      .then((payload) => {
        if (!active) return;
        setSelectedResourceAssets(
          Object.fromEntries(
            payload.items.map((item) => [
              `${item.resource_type}:${item.resource_id}`,
              item.asset_id,
            ]),
          ),
        );
      })
      .catch(() => {
        if (active) setSelectedResourceAssets({});
      });
    return () => {
      active = false;
    };
  }, [project]);

  useEffect(() => {
    if (!project || selectedCanvas.kind !== "asset") return;
    const asset = assets.find((item) => item.id === selectedCanvas.assetId);
    if (!asset || asset.kind !== "export") return;
    let active = true;
    fetch(`${API_BASE_URL}/projects/${project.id}/visual-review/models`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("visual-models-unavailable");
        return (await response.json()) as { items: VisualReviewModel[] };
      })
      .then((payload) => {
        if (!active) return;
        setVisualReviewModels(payload.items);
        setVisualReviewModel((current) => current || payload.items[0]?.id || "");
      })
      .catch(() => {
        if (active) setVisualReviewModels([]);
      });
    setVisualReview(null);
    setVisualReviewError(null);
    return () => {
      active = false;
    };
  }, [assets, project, selectedCanvas]);

  useEffect(() => {
    setHistoryCollapsed(
      window.localStorage.getItem("videoagent.workspace.history-collapsed") === "1",
    );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "videoagent.workspace.history-collapsed",
      historyCollapsed ? "1" : "0",
    );
  }, [historyCollapsed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ block: "end" });
  }, [agentActivities, messages]);

  useEffect(() => {
    if (!project || !agentActivityRunId || !isWorking) return;
    let active = true;
    let timer: number | undefined;

    async function poll() {
      const response = await fetch(
        `${API_BASE_URL}/projects/${project?.id}/agent-activity/${agentActivityRunId}`,
        { credentials: "include" },
      ).catch(() => null);
      if (!active) return;
      if (response?.ok) {
        const payload = (await response.json()) as { items: AgentActivity[] };
        setAgentActivities(payload.items);
      }
      timer = window.setTimeout(() => void poll(), 350);
    }

    void poll();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [agentActivityRunId, isWorking, project]);

  useEffect(() => {
    if (!activeJob) return;
    let active = true;
    const timer = window.setInterval(async () => {
      const response = await fetch(`${API_BASE_URL}/jobs/${activeJob.id}`, {
        credentials: "include",
      }).catch(() => null);
      if (!active || !response?.ok) return;
      const job = (await response.json()) as GenerationJob;
      if (job.status === "succeeded") {
        setStoryboard((current) =>
          current
            ? {
                ...current,
                shots: current.shots.map((shot) =>
                  shot.id === job.shot_id ? { ...shot, status: "completed" } : shot,
                ),
              }
            : current,
        );
        setActiveJob(null);
        void refreshAssets();
      } else if (["failed", "cancelled"].includes(job.status)) {
        setGenerationErrorOpen(true);
        setActiveJob(null);
      } else {
        setActiveJob(job);
      }
    }, 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeJob, t]);

  useEffect(() => {
    if (!generationErrorOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setGenerationErrorOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [generationErrorOpen]);

  const selectedShot = useMemo(
    () => storyboard?.shots.find((shot) => shot.id === selectedShotId) ?? null,
    [selectedShotId, storyboard],
  );
  const canEdit = project?.access_permission !== "view";
  const selectedAsset =
    selectedCanvas.kind === "asset"
      ? assets.find((asset) => asset.id === selectedCanvas.assetId) ?? null
      : null;
  const canvasShot =
    selectedCanvas.kind === "shot"
      ? storyboard?.shots.find((shot) => shot.id === selectedCanvas.shotId) ?? null
      : null;
  const selectedCharacter =
    selectedCanvas.kind === "character"
      ? storyboard?.characters?.find(
          (character) => character.id === selectedCanvas.characterId,
        ) ?? null
      : null;
  const selectedScene =
    selectedCanvas.kind === "scene"
      ? storyboard?.scenes?.find((scene) => scene.id === selectedCanvas.sceneId) ??
        null
      : null;

  useEffect(() => {
    if (!canvasShot) {
      setShotDraft(null);
      return;
    }
    setShotDraft({
      description: canvasShot.description,
      prompt_en: canvasShot.prompt_en,
      prompt_zh: canvasShot.prompt_zh,
      duration_seconds: canvasShot.duration_seconds,
      aspect_ratio: canvasShot.aspect_ratio,
      generation_mode: canvasShot.generation_mode,
    });
  }, [canvasShot]);

  useEffect(() => {
    if (!selectedCharacter) {
      setCharacterDraft(null);
      return;
    }
    setCharacterDraft({
      name: selectedCharacter.name,
      description: selectedCharacter.description,
      prompt_en: selectedCharacter.prompt_en,
      prompt_zh: selectedCharacter.prompt_zh,
    });
  }, [selectedCharacter]);

  useEffect(() => {
    if (!selectedScene) {
      setSceneDraft(null);
      return;
    }
    setSceneDraft({
      name: selectedScene.name,
      description: selectedScene.description,
      location: selectedScene.location,
      prompt_en: selectedScene.prompt_en,
      prompt_zh: selectedScene.prompt_zh,
    });
  }, [selectedScene]);

  async function refreshWorkspace() {
    const response = await fetch(`${API_BASE_URL}/workspace`, {
      credentials: "include",
    }).catch(() => null);
    if (response?.ok) {
      setWorkspace((await response.json()) as WorkspaceData);
    }
  }

  async function refreshAssets() {
    if (!project) return;
    const response = await fetch(
      `${API_BASE_URL}/projects/${project.id}/assets`,
      { credentials: "include" },
    ).catch(() => null);
    if (response?.ok) {
      const nextAssets = ((await response.json()) as { items: Asset[] }).items;
      setAssets(nextAssets);
      setExportedAssets(
        nextAssets.filter((asset) => asset.kind === "export"),
      );
      setExportCover(
        nextAssets.find((asset) => asset.kind === "cover") ?? null,
      );
    }
  }

  function beginAgentRun() {
    const runId = crypto.randomUUID();
    setAgentActivities([]);
    setAgentActivityRunId(runId);
    return runId;
  }

  async function settleAgentRun(runId: string) {
    if (!project) return;
    const response = await fetch(
      `${API_BASE_URL}/projects/${project.id}/agent-activity/${runId}`,
      { credentials: "include" },
    ).catch(() => null);
    if (!response?.ok) return;
    const payload = (await response.json()) as { items: AgentActivity[] };
    setAgentActivities(payload.items);
  }

  function replaceShot(updated: Shot) {
    setStoryboard((current) =>
      current
        ? {
            ...current,
            shots: current.shots.map((shot) =>
              shot.id === updated.id ? updated : shot,
            ),
          }
        : current,
    );
  }

  function replaceCharacter(updated: Character) {
    setStoryboard((current) =>
      current
        ? {
            ...current,
            characters: current.characters.map((character) =>
              character.id === updated.id ? updated : character,
            ),
          }
        : current,
    );
  }

  function replaceScene(updated: Scene) {
    setStoryboard((current) =>
      current
        ? {
            ...current,
            scenes: current.scenes.map((scene) =>
              scene.id === updated.id ? updated : scene,
            ),
          }
        : current,
    );
  }

  async function saveShotDraft(
    shot: Shot,
    draft: ShotDraft | null = shotDraft,
  ): Promise<Shot | null> {
    if (!project || !draft) return null;
    const response = await fetch(
      `${API_BASE_URL}/projects/${project.id}/storyboard/shots/${shot.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      },
    ).catch(() => null);
    if (!response?.ok) {
      setActionError("Shot changes could not be saved.");
      return null;
    }
    const updated = (await response.json()) as Shot;
    replaceShot(updated);
    return updated;
  }

  async function saveCharacterDraft(
    character: Character,
  ): Promise<Character | null> {
    if (!project || !characterDraft) return null;
    const response = await fetch(
      `${API_BASE_URL}/projects/${project.id}/storyboard/characters/${character.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(characterDraft),
      },
    ).catch(() => null);
    if (!response?.ok) {
      setActionError("Character changes could not be saved.");
      return null;
    }
    const updated = (await response.json()) as Character;
    replaceCharacter(updated);
    return updated;
  }

  async function saveSceneDraft(scene: Scene): Promise<Scene | null> {
    if (!project || !sceneDraft) return null;
    const response = await fetch(
      `${API_BASE_URL}/projects/${project.id}/storyboard/scenes/${scene.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sceneDraft),
      },
    ).catch(() => null);
    if (!response?.ok) {
      setActionError("Scene changes could not be saved.");
      return null;
    }
    const updated = (await response.json()) as Scene;
    replaceScene(updated);
    return updated;
  }

  async function saveProjectBrief(brief: string) {
    if (!project) return;
    const productionSettings =
      project.brief.match(/\n+\s*Production settings:[\s\S]*/i)?.[0] ?? "";
    const response = await fetch(`${API_BASE_URL}/projects/${project.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brief: `${brief.trim()}${productionSettings}`,
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setActionError("Direction could not be saved.");
      return;
    }
    setProject((await response.json()) as Project);
  }

  async function saveProjectSettings(entries: Array<{ label: string; value: string }>) {
    if (!project || entries.length === 0) return;
    const response = await fetch(`${API_BASE_URL}/projects/${project.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brief: `${creativeBrief(project.brief)}\n\nProduction settings: ${entries
          .map((entry) => entry.value.trim())
          .filter(Boolean)
          .join(" · ")}`,
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setActionError("Settings could not be saved.");
      return;
    }
    setProject((await response.json()) as Project);
  }

  function referencedAsset(
    prompt: string,
    contentPrefix: string,
  ): Asset | null {
    return (
      assets.find(
        (asset) =>
          asset.content_type.startsWith(contentPrefix) &&
          prompt.includes(`@${asset.id}`),
      ) ?? null
    );
  }

  async function setSelectedAsset(
    resourceType: "shot" | "character" | "scene",
    resourceId: string,
    assetId: string | null,
  ) {
    if (!project) return;
    const response = await fetch(
      `${API_BASE_URL}/projects/${project.id}/asset-selections`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_type: resourceType,
          resource_id: resourceId,
          asset_id: assetId,
        }),
      },
    ).catch(() => null);
    if (!response?.ok) {
      setActionError("The selected result could not be updated.");
      return;
    }
    setSelectedResourceAssets((current) => {
      const next = { ...current };
      const key = `${resourceType}:${resourceId}`;
      if (assetId) next[key] = assetId;
      else delete next[key];
      return next;
    });
  }

  async function deleteProjectAsset(asset: Asset) {
    if (!project || !window.confirm(`Delete ${asset.filename}?`)) return;
    const response = await fetch(`${API_BASE_URL}/assets/${asset.id}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => null);
    if (!response?.ok) {
      setActionError("The asset could not be deleted.");
      return;
    }
    setAssets((current) => current.filter((item) => item.id !== asset.id));
    setSelectedResourceAssets((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([, assetId]) => assetId !== asset.id),
      ),
    );
  }

  async function renameProjectAsset(asset: Asset, filename: string) {
    const response = await fetch(`${API_BASE_URL}/assets/${asset.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    }).catch(() => null);
    if (!response?.ok) {
      setActionError("The asset name could not be saved.");
      return;
    }
    const updated = (await response.json()) as Asset;
    setAssets((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  async function saveFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = folderName.trim();
    if (!name) return;
    const isRename = Boolean(renamingFolder);
    const response = await fetch(
      isRename
        ? `${API_BASE_URL}/workspace/folders/${renamingFolder?.id}`
        : `${API_BASE_URL}/workspace/folders`,
      {
        method: isRename ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      },
    ).catch(() => null);
    if (!response?.ok) {
      setActionError(t("folderError"));
      return;
    }
    const folder = (await response.json()) as WorkspaceFolder;
    if (!isRename) {
      setOpenFolders((current) => [...current, folder.id]);
    }
    setFolderName("");
    setRenamingFolder(null);
    setFolderDialogOpen(false);
    await refreshWorkspace();
  }

  async function deleteFolder(folder: WorkspaceFolder) {
    if (!window.confirm(t("deleteFolderConfirm"))) return;
    const response = await fetch(
      `${API_BASE_URL}/workspace/folders/${folder.id}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    ).catch(() => null);
    if (!response?.ok) {
      setActionError(t("folderError"));
      return;
    }
    await refreshWorkspace();
  }

  async function moveThread(projectId: string, folderId: string | null) {
    const response = await fetch(
      `${API_BASE_URL}/workspace/threads/${projectId}/folder`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId }),
      },
    ).catch(() => null);
    if (!response?.ok) {
      setActionError(t("folderError"));
      return;
    }
    setDraggingThreadId(null);
    await refreshWorkspace();
  }

  function beginThreadDrag(event: DragEvent<HTMLElement>, threadId: string) {
    setDraggingThreadId(threadId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", threadId);
  }

  function dropThread(event: DragEvent<HTMLElement>, folderId: string | null) {
    event.preventDefault();
    const projectId = event.dataTransfer.getData("text/plain") || draggingThreadId;
    if (projectId) void moveThread(projectId, folderId);
  }

  function beginPaneResize(
    kind: "assets" | "agent",
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    const pane = event.currentTarget.parentElement;
    if (!pane) return;
    const startX = event.clientX;
    const startWidth = pane.getBoundingClientRect().width;
    const move = (moveEvent: PointerEvent) => {
      const delta =
        kind === "assets"
          ? moveEvent.clientX - startX
          : startX - moveEvent.clientX;
      const next = Math.max(
        220,
        Math.min(window.innerWidth * 0.32, startWidth + delta),
      );
      if (kind === "assets") setAssetsPaneWidth(next);
      else setAgentPaneWidth(next);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }

  async function decideWorkflow(
    choice: "approve" | "refine" | "custom",
    instruction?: string,
  ) {
    if (!project || isWorking) return;
    if (choice === "custom" && !instruction?.trim()) return;
    const runId = beginAgentRun();
    setIsWorking(true);
    setPendingDecision(
      locale.startsWith("zh")
        ? "VideoAgent 正在整理当前阶段……"
        : "VideoAgent is refining this stage…",
    );
    setActionError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${project.id}/workflow/decision`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ choice, instruction, run_id: runId }),
        },
      );
      if (!response.ok) throw new Error("workflow-decision-failed");
      const decision = (await response.json()) as WorkflowDecisionResponse;
      beginAssistantStream(decision.assistant_message);
      setMessages((current) => [
        ...current,
        decision.user_message,
        decision.assistant_message,
      ]);
      setStoryboard(decision.storyboard);
      setSelectedShotId(decision.storyboard.shots[0]?.id ?? null);
      setWorkflow(decision.workflow);
      setSelectedCanvas(
        decision.storyboard.shots.length > 0
          ? { kind: "document", document: "outline" }
          : { kind: "settings" },
      );
      setCustomDecision("");
      setCustomDecisionOpen(false);
      await settleAgentRun(runId);
      await refreshWorkspace();
    } catch {
      setActionError(t("decisionError"));
    } finally {
      setIsWorking(false);
      setPendingDecision(null);
    }
  }

  async function createStarterStoryboard() {
    if (!project) return;
    setIsWorking(true);
    setActionError(null);
    const description = creativeBrief(project.brief) || project.title;

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}/storyboard`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shots: [
            {
              description,
              prompt_en: description,
              prompt_zh: locale.startsWith("zh") ? description : null,
              duration_seconds: 5,
              aspect_ratio: "16:9",
              generation_mode: "text_to_video",
            },
          ],
        }),
      });
      if (!response.ok) throw new Error("create-storyboard-failed");
      const nextStoryboard = (await response.json()) as Storyboard;
      setStoryboard(nextStoryboard);
      setSelectedShotId(nextStoryboard.shots[0]?.id ?? null);
      setMobilePanel("inspector");
    } catch {
      setActionError(t("planFirst"));
    } finally {
      setIsWorking(false);
    }
  }

  async function sendMessage() {
    const content = messageDraft.trim();
    if (!project || !content || isWorking) return;
    const runId = beginAgentRun();
    setIsWorking(true);
    setPendingDecision(copy.thinking);
    setActionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, run_id: runId }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(body?.error?.message || "agent-message-failed");
      }
      const turn = (await response.json()) as AgentTurn;
      beginAssistantStream(turn.assistant_message);
      setMessages((current) => [...current, turn.user_message, turn.assistant_message]);
      setStoryboard(turn.storyboard);
      if (turn.workflow) setWorkflow(turn.workflow);
      setSelectedShotId(turn.storyboard.shots[0]?.id ?? null);
      if (turn.assistant_message.metadata?.action !== "render_final_cut") {
        setSelectedCanvas(
          turn.storyboard.shots.length > 0
            ? { kind: "document", document: "outline" }
            : { kind: "settings" },
        );
      }
      setEstimate(null);
      setMessageDraft("");
      setMobilePanel("canvas");
      await refreshAssets();
      await settleAgentRun(runId);
      await refreshWorkspace();
    } catch (error) {
      setActionError(
        error instanceof Error && error.message !== "agent-message-failed"
          ? error.message
          : t("agentIntro"),
      );
    } finally {
      setIsWorking(false);
      setPendingDecision(null);
    }
  }

  async function estimateShot() {
    if (!selectedShot) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const savedShot = await saveShotDraft(selectedShot);
      if (!savedShot) return;
      const response = await fetch(`${API_BASE_URL}/shots/${selectedShot.id}/estimate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedModelRoute(shotGenerationModel)),
      });
      if (!response.ok) throw new Error("estimate-failed");
      setEstimate((await response.json()) as CostEstimate);
    } catch {
      setActionError(t("noShot"));
    } finally {
      setIsWorking(false);
    }
  }

  async function submitGeneration(
    shot: Shot,
    prompt: string = shot.prompt_en,
  ) {
    const reference = referencedAsset(prompt, "image/");
    const response = await fetch(`${API_BASE_URL}/shots/${shot.id}/generate`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        approved: true,
        generation_mode: reference ? "image_to_video" : "text_to_video",
        reference_asset_id: reference?.id ?? null,
        ...selectedModelRoute(shotGenerationModel),
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      throw new Error(body?.error?.message || "generation-failed");
    }
    const job = (await response.json()) as GenerationJob;
    setStoryboard((current) =>
      current
        ? {
            ...current,
            shots: current.shots.map((item) =>
              item.id === shot.id
                ? {
                    ...item,
                    status: job.status === "succeeded" ? "completed" : "generating",
                  }
                : item,
            ),
          }
        : current,
    );
    if (job.status !== "succeeded") {
      setActiveJob(job);
    }
    return job;
  }

  async function generateShot() {
    if (!selectedShot) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const savedShot = await saveShotDraft(selectedShot);
      if (!savedShot) return;
      if (!estimate) {
        const estimateResponse = await fetch(
          `${API_BASE_URL}/shots/${selectedShot.id}/estimate`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(selectedModelRoute(shotGenerationModel)),
          },
        );
        if (!estimateResponse.ok) throw new Error("estimate-failed");
        setEstimate((await estimateResponse.json()) as CostEstimate);
      }
      const job = await submitGeneration(savedShot, savedShot.prompt_en);
      if (job.status === "succeeded") {
        await refreshAssets();
      }
    } catch (error) {
      setGenerationErrorMessage(
        error instanceof Error && error.message !== "generation-failed"
          ? error.message
          : t("generationError"),
      );
      setGenerationErrorOpen(true);
    } finally {
      setIsWorking(false);
    }
  }

  async function generateFromAgent() {
    if (!selectedShot || selectedShot.status === "completed") return;
    setIsWorking(true);
    setActionError(null);
    try {
      const estimateResponse = await fetch(
        `${API_BASE_URL}/shots/${selectedShot.id}/estimate`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selectedModelRoute(shotGenerationModel)),
        },
      );
      if (!estimateResponse.ok) throw new Error("estimate-failed");
      const nextEstimate = (await estimateResponse.json()) as CostEstimate;
      setEstimate(nextEstimate);
      if (!window.confirm(t("agentGenerateConfirm", { credits: nextEstimate.credits }))) {
        return;
      }
      const savedShot = await saveShotDraft(selectedShot);
      if (!savedShot) return;
      await submitGeneration(savedShot, savedShot.prompt_en);
      const generationMessage: Message = {
        id: `generation-${crypto.randomUUID()}`,
        role: "assistant",
        content: t("agentGenerationStarted", {
          shot: selectedShot.description,
        }),
        created_at: new Date().toISOString(),
      };
      beginAssistantStream(generationMessage);
      setMessages((current) => [
        ...current,
        generationMessage,
      ]);
      setMobilePanel("canvas");
    } catch (error) {
      setGenerationErrorMessage(
        error instanceof Error && error.message !== "generation-failed"
          ? error.message
          : t("generationError"),
      );
      setGenerationErrorOpen(true);
    } finally {
      setIsWorking(false);
    }
  }

  async function runVisualReview() {
    if (
      !project ||
      !selectedAsset ||
      selectedAsset.kind !== "export" ||
      !visualReviewModel ||
      visualReviewMetrics.length === 0 ||
      isReviewing
    ) {
      return;
    }
    setIsReviewing(true);
    setVisualReviewError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${project.id}/visual-review`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset_id: selectedAsset.id,
            model: visualReviewModel,
            metrics: visualReviewMetrics,
          }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(
          payload?.error?.message || "Visual review could not be completed.",
        );
      }
      setVisualReview((await response.json()) as VisualReview);
    } catch (error) {
      setVisualReviewError(
        error instanceof Error
          ? error.message
          : "Visual review could not be completed.",
      );
    } finally {
      setIsReviewing(false);
    }
  }

  function mediaUrl(path: string) {
    return new URL(path, API_BASE_URL).toString();
  }

  async function uploadVisionAsset(
    file: File,
    shotId?: string,
  ): Promise<Asset | null> {
    if (!project || isWorking) return null;
    setIsWorking(true);
    setActionError(null);
    const body = new FormData();
    body.append("file", file);
    if (shotId) body.append("shot_id", shotId);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}/assets`, {
        method: "POST",
        credentials: "include",
        body,
      });
      if (!response.ok) throw new Error("upload-failed");
      const asset = (await response.json()) as Asset;
      setAssets((current) => [asset, ...current]);
      return asset;
    } catch {
      setActionError(t("uploadError"));
      return null;
    } finally {
      setIsWorking(false);
    }
  }

  async function uploadCharacterAsset(
    character: Character,
    file: File,
  ): Promise<Asset | null> {
    if (!project || isWorking) return null;
    setIsWorking(true);
    setActionError(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch(
        `${API_BASE_URL}/characters/${character.id}/assets`,
        {
          method: "POST",
          credentials: "include",
          body,
        },
      );
      if (!response.ok) throw new Error("character-upload-failed");
      const asset = (await response.json()) as Asset;
      setAssets((current) => [asset, ...current]);
      const nextDraft = {
        ...(characterDraft ?? {
          name: character.name,
          description: character.description,
          prompt_en: character.prompt_en,
          prompt_zh: character.prompt_zh,
        }),
        prompt_en: `${character.prompt_en.trim()} @${asset.id}`.trim(),
      };
      setCharacterDraft(nextDraft);
      const patchResponse = await fetch(
        `${API_BASE_URL}/projects/${project.id}/storyboard/characters/${character.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextDraft),
        },
      ).catch(() => null);
      if (patchResponse?.ok) {
        replaceCharacter((await patchResponse.json()) as Character);
      }
      return asset;
    } catch {
      setActionError(t("uploadError"));
      return null;
    } finally {
      setIsWorking(false);
    }
  }

  async function uploadSceneAsset(
    scene: Scene,
    file: File,
  ): Promise<Asset | null> {
    if (!project || isWorking) return null;
    setIsWorking(true);
    setActionError(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch(`${API_BASE_URL}/scenes/${scene.id}/assets`, {
        method: "POST",
        credentials: "include",
        body,
      });
      if (!response.ok) throw new Error("scene-upload-failed");
      const asset = (await response.json()) as Asset;
      setAssets((current) => [asset, ...current]);
      const nextDraft = {
        ...(sceneDraft ?? {
          name: scene.name,
          description: scene.description,
          location: scene.location,
          prompt_en: scene.prompt_en,
          prompt_zh: scene.prompt_zh,
        }),
        prompt_en: `${scene.prompt_en.trim()} @${asset.id}`.trim(),
      };
      setSceneDraft(nextDraft);
      const patchResponse = await fetch(
        `${API_BASE_URL}/projects/${project.id}/storyboard/scenes/${scene.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextDraft),
        },
      ).catch(() => null);
      if (patchResponse?.ok) {
        replaceScene((await patchResponse.json()) as Scene);
      }
      return asset;
    } catch {
      setActionError(t("uploadError"));
      return null;
    } finally {
      setIsWorking(false);
    }
  }

  async function estimateCharacter(character: Character) {
    if (isWorking) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const saved = await saveCharacterDraft(character);
      if (!saved) return;
      const response = await fetch(
        `${API_BASE_URL}/characters/${character.id}/estimate`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("character-estimate-failed");
      setCharacterEstimate((await response.json()) as CostEstimate);
    } catch {
      setActionError(t("noShot"));
    } finally {
      setIsWorking(false);
    }
  }

  async function generateCharacter(character: Character) {
    if (isWorking) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const saved = await saveCharacterDraft(character);
      if (!saved) return;
      const reference = referencedAsset(saved.prompt_en, "image/");
      const response = await fetch(
        `${API_BASE_URL}/characters/${character.id}/generate`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approved: true,
            generation_mode: reference ? "image_to_image" : "text_to_image",
            reference_asset_id: reference?.id ?? null,
            ...selectedModelRoute(characterGenerationModel),
          }),
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(body?.error?.message || "character-generation-failed");
      }
      const asset = (await response.json()) as Asset;
      setAssets((current) => [asset, ...current]);
    } catch (error) {
      setGenerationErrorMessage(
        error instanceof Error && error.message !== "character-generation-failed"
          ? error.message
          : t("generationError"),
      );
      setGenerationErrorOpen(true);
    } finally {
      setIsWorking(false);
    }
  }

  async function exportProject(): Promise<Asset[]> {
    if (!project || isExporting) return [];
    setIsExporting(true);
    setActionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}/exports`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aspect_ratios: ["16:9", "9:16", "1:1"],
          permission: "private",
        }),
      });
      if (!response.ok) throw new Error("export-failed");
      const payload = (await response.json()) as ExportResponse;
      setExportedAssets(payload.items);
      setExportCover(payload.cover);
      setAssets((current) => [
        ...(payload.cover ? [payload.cover] : []),
        ...payload.items,
        ...current,
      ]);
      if (payload.items[0]) {
        setSelectedCanvas({ kind: "asset", assetId: payload.items[0].id });
      }
      return payload.items;
    } catch {
      setActionError(t("exportError"));
      return [];
    } finally {
      setIsExporting(false);
    }
  }

  async function shareExport(asset: Asset) {
    if (isSharing) return;
    setIsSharing(true);
    setActionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/assets/${asset.id}/share`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expires_in_hours: 24 }),
      });
      if (!response.ok) throw new Error("share-failed");
      setShareLink((await response.json()) as ShareLink);
    } catch {
      setActionError(t("shareError"));
    } finally {
      setIsSharing(false);
    }
  }

  async function shareProject() {
    if (!project) return;
    setShareDialogOpen(true);
    setCollaborationLink(null);
    setShareCopied(false);
    setSharePermission("view");
    setSharePermissionOpen(false);
  }

  async function createCollaborationLink() {
    if (!project || isSharing) return;
    setSharePermissionOpen(false);
    setIsSharing(true);
    setActionError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${project.id}/collaborations`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permission: sharePermission,
            collaborator_email: shareEmail.trim() || null,
            expires_in_hours: 24 * 7,
          }),
        },
      );
      if (!response.ok) throw new Error("collaboration-create-failed");
      setCollaborationLink((await response.json()) as ProjectCollaboration);
      setShareCopied(false);
    } catch {
      setActionError(t("shareError"));
    } finally {
      setIsSharing(false);
    }
  }

  async function copyCollaborationLink() {
    if (!collaborationLink) return;
    try {
      await navigator.clipboard.writeText(collaborationLink.share_url);
      setShareCopied(true);
    } catch {
      setActionError(t("shareError"));
    }
  }

  function openPublishDialog(asset: Asset) {
    setPublishAsset(asset);
    setPublishTitleDraft(project?.title ?? "VideoAgent film");
    setPublishPromptDraft(creativeBrief(project?.brief ?? ""));
    setPublishMessage(null);
  }

  async function publishFinalCut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!publishAsset || isWorking) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/hots/from-asset/${publishAsset.id}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: publishTitleDraft,
            prompt: publishPromptDraft,
            skill: "auto",
          }),
        },
      );
      if (!response.ok) throw new Error("publish-failed");
      setPublishMessage(copy.published);
    } catch {
      setActionError("The final cut could not be published.");
    } finally {
      setIsWorking(false);
    }
  }

  const visualMetricLabels: Record<VisualReviewMetricKey, string> = {
    character_consistency:
      locale.startsWith("zh") ? "人物一致性" : "Character consistency",
    style_consistency:
      locale.startsWith("zh") ? "风格一致性" : "Style consistency",
    prompt_alignment:
      locale.startsWith("zh") ? "提示词匹配" : "Prompt alignment",
    temporal_stability:
      locale.startsWith("zh") ? "时序稳定性" : "Temporal stability",
  };

  if (status === "loading") {
    return <div className="min-h-screen animate-pulse bg-[#11100d]" />;
  }

  if (!project) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#11100d] text-white">
        <div className="text-center">
          <div aria-level={1} className="text-2xl font-semibold" role="heading">
            {t("notFound")}
          </div>
          <Link className="mt-5 inline-flex items-center gap-2 text-[#5cc8ff]" href="/#assets">
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Link>
        </div>
      </main>
    );
  }

  const copy = workspaceCopy(locale);
  const canvasTitle = copy.storyboard;
  const activeDocumentMode =
    selectedCanvas.kind === "document" ? selectedCanvas.document : null;
  const settingPairs = [
    ...(project ? productionSettingPairs(project.brief) : []),
    ...extractedConversationAttributes(messages, locale),
  ];

  function selectShot(shot: Shot) {
    setSelectedShotId(shot.id);
    setSelectedCanvas({ kind: "shot", shotId: shot.id });
    setEstimate(null);
    setMobilePanel("canvas");
  }

  return (
    <main
      className={cn(
        "project-workspace-shell flex min-h-0 overflow-hidden bg-[#080807]/[0.28] text-white backdrop-blur-[2px]",
        embedded
          ? "project-workspace-embedded h-[100dvh]"
          : "h-screen min-h-[680px]",
      )}
    >
      {!embedded ? (
        <div className="hidden xl:mr-3 xl:flex">
          <WorkspaceHistory
            activeProjectId={project.id}
            collapsed={historyCollapsed}
            draggingThreadId={draggingThreadId}
            locale={locale}
            onBeginDrag={beginThreadDrag}
            onDeleteFolder={(folder) => void deleteFolder(folder)}
            onDrop={dropThread}
            onNewFolder={() => {
              setRenamingFolder(null);
              setFolderName("");
              setFolderDialogOpen(true);
            }}
            onRenameFolder={(folder) => {
              setRenamingFolder(folder);
              setFolderName(folder.name);
              setFolderDialogOpen(true);
            }}
            onToggleCollapsed={() => setHistoryCollapsed((current) => !current)}
            onToggleFolder={(folderId) =>
              setOpenFolders((current) =>
                current.includes(folderId)
                  ? current.filter((id) => id !== folderId)
                  : [...current, folderId],
              )
            }
            openFolders={openFolders}
            workspace={workspace}
          />
        </div>
      ) : null}

      <section className="flex min-w-0 flex-1 flex-col">
        <div
          className={cn(
            "workspace-grid grid min-h-0 flex-1",
            assetsPanelCollapsed && "assets-collapsed",
            agentPanelCollapsed && "agent-collapsed",
          )}
          style={
            {
              "--assets-pane-width": assetsPaneWidth
                ? `${assetsPaneWidth}px`
                : "25vw",
              "--agent-pane-width": agentPaneWidth
                ? `${agentPaneWidth}px`
                : "25vw",
            } as CSSProperties
          }
        >
          <div
            className={cn(
              "min-h-0 xl:flex",
              mobilePanel === "assets" ? "flex" : "hidden",
            )}
          >
            <AssetsTree
              assets={assets}
              collapsed={assetsPanelCollapsed}
              copy={copy}
              onDeleteAsset={(asset) => void deleteProjectAsset(asset)}
              onResizeStart={(event) => beginPaneResize("assets", event)}
              onSelectAsset={(resourceType, resourceId, assetId) =>
                void setSelectedAsset(resourceType, resourceId, assetId)
              }
              onSelect={(selection) => {
                setSelectedCanvas(selection);
                if (selection.kind === "shot") setSelectedShotId(selection.shotId);
                if (selection.kind === "character") {
                  setCharacterEstimate(null);
                }
                setMobilePanel("canvas");
              }}
              onToggleCollapsed={() =>
                setAssetsPanelCollapsed((current) => !current)
              }
              selected={selectedCanvas}
              selectedResourceAssets={selectedResourceAssets}
              storyboard={storyboard}
            />
          </div>

          <section
            className={cn(
              "min-h-0 min-w-0 flex-col bg-[#0b0a08]/[0.7] backdrop-blur-lg xl:flex",
              mobilePanel === "canvas" ? "flex" : "hidden",
            )}
          >
            <div
              className="flex h-[88px] shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0b0a08]/[0.96] px-5"
              data-testid="workspace-header-canvas"
            >
              <span className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-white/82">
                <Clapperboard className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                <span className="truncate">{canvasTitle}</span>
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {(project.access_permission ?? "owner") === "owner" ? (
                <button
                  className="flex items-center gap-1.5 rounded-lg bg-[#1677ff] px-3 py-2 text-[12px] font-semibold text-white"
                  onClick={() => void shareProject()}
                  type="button"
                >
                  <Share2 className="h-4 w-4" />
                  {copy.share}
                </button>
                ) : null}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {selectedCanvas.kind === "settings" ? (
                <article className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
                  <p className="text-[12px] font-semibold text-[#6eb8ff]">
                    {copy.settings}
                  </p>
                  <h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-white/90">
                    {project.title}
                  </h2>
                  <form
                    className="mt-7 space-y-3"
                    key={`${project.id}-${project.updated_at}`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      void saveProjectBrief(String(form.get("brief") ?? ""));
                    }}
                  >
                    <textarea
                      className="min-h-36 w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-[16px] leading-8 text-white/68 outline-none focus:border-[#1677ff]/40"
                      defaultValue={creativeBrief(project.brief)}
                      disabled={!canEdit}
                      name="brief"
                    />
                    <button
                      className="rounded-lg bg-[#1677ff] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-35"
                      disabled={!canEdit}
                      type="submit"
                    >
                      Save direction
                    </button>
                  </form>
                  <section className="mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                    <h3 className="text-[15px] font-semibold text-white/76">
                      {copy.settingAttributes}
                    </h3>
                    <form
                      className="mt-4 divide-y divide-white/[0.06]"
                      key={`${project.id}-${project.updated_at}-settings`}
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void saveProjectSettings(
                          settingPairs.map((pair, index) => ({
                            label: pair.label,
                            value: String(form.get(`setting-${index}`) ?? ""),
                          })),
                        );
                      }}
                    >
                      {settingPairs.map((pair, index) => (
                        <div
                          className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 py-2.5 text-[13px]"
                          key={`${pair.label}-${pair.value}`}
                        >
                          <span className="text-white/32">{pair.label}</span>
                          <input
                            aria-label={`${pair.label} setting`}
                            className="min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1 text-white/68 outline-none transition hover:border-white/[0.08] focus:border-[#1677ff]/40 focus:bg-white/[0.025]"
                            defaultValue={pair.value}
                            disabled={!canEdit}
                            name={`setting-${index}`}
                          />
                        </div>
                      ))}
                      <div className="pt-3">
                        <button
                          className="rounded-lg bg-[#1677ff] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-35"
                          disabled={!canEdit || settingPairs.length === 0}
                          type="submit"
                        >
                          Save settings
                        </button>
                      </div>
                    </form>
                  </section>
                </article>
              ) : null}

              {selectedCanvas.kind === "document" ? (
                <article
                  className="mx-auto max-w-4xl px-6 py-8 sm:px-10"
                  data-document-mode={activeDocumentMode ?? "storyboard"}
                >
                  <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] pb-6">
                    <div>
                      <p className="text-[12px] font-semibold text-[#6eb8ff]">
                        {copy[selectedCanvas.document]}
                      </p>
                      <h2 className="mt-3 line-clamp-2 font-display text-2xl leading-tight text-white/88">
                        {project.title}
                      </h2>
                    </div>
                    {storyboard ? (
                      <span className="shrink-0 rounded-lg border border-white/[0.08] px-3 py-2 text-[10px] text-white/28">
                        v{storyboard.version}
                      </span>
                    ) : null}
                  </div>
                  {storyboard ? (
                    <div className="mt-6 space-y-3">
                      {storyboard.shots.map((shot) => (
                        <form
                          className="group w-full rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5 text-left transition hover:border-[#1677ff]/25 hover:bg-[#1677ff]/[0.025]"
                          key={shot.id}
                          onSubmit={(event) => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            const content = String(form.get("content") ?? "");
                            void saveShotDraft(shot, {
                              description:
                                activeDocumentMode === "outline"
                                  ? content
                                  : shot.description,
                              prompt_en:
                                activeDocumentMode === "script"
                                  ? content
                                  : shot.prompt_en,
                              prompt_zh: shot.prompt_zh,
                              duration_seconds: shot.duration_seconds,
                              aspect_ratio: shot.aspect_ratio,
                              generation_mode: shot.generation_mode,
                            });
                          }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[12px] font-semibold text-[#6eb8ff]">
                              {copy.shot} {shot.index + 1}
                            </span>
                            <span className="flex flex-wrap items-center justify-end gap-2">
                              <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[12px] text-white/38">
                                {shot.duration_seconds}s
                              </span>
                              <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[12px] text-white/38">
                                {shot.aspect_ratio}
                              </span>
                              <button
                                className="rounded-md border border-white/[0.08] px-2.5 py-1 text-[12px] text-white/42 hover:text-white"
                                onClick={() => selectShot(shot)}
                                type="button"
                              >
                                Open
                              </button>
                            </span>
                          </div>
                          <textarea
                            aria-label={`Edit ${activeDocumentMode} for ${copy.shot} ${shot.index + 1}`}
                            className="mt-3 min-h-24 w-full resize-y rounded-xl border border-transparent bg-transparent px-1 py-1 text-[17px] font-medium leading-8 text-white/82 outline-none transition hover:border-white/[0.07] focus:border-[#1677ff]/35 focus:bg-white/[0.02] disabled:opacity-70"
                            defaultValue={
                              activeDocumentMode === "outline"
                                ? shot.description
                                : locale.startsWith("zh") && shot.prompt_zh
                                  ? shot.prompt_zh
                                  : shot.prompt_en
                            }
                            disabled={!canEdit}
                            key={`${shot.id}-${activeDocumentMode}-${shot.description}-${shot.prompt_en}`}
                            name="content"
                          />
                          <div className="mt-3 flex justify-end">
                            <button
                              className="rounded-lg border border-white/[0.09] px-3 py-2 text-[12px] text-white/58 hover:text-white disabled:opacity-35"
                              disabled={!canEdit}
                              type="submit"
                            >
                              Save {activeDocumentMode}
                            </button>
                          </div>
                        </form>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-10 rounded-2xl border border-dashed border-white/[0.1] p-10 text-center text-white/30">
                      {t("starterBody")}
                      <button
                        className="mx-auto mt-5 flex items-center gap-2 rounded-lg bg-[#1677ff] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-40"
                        disabled={isWorking}
                        onClick={() => void createStarterStoryboard()}
                        type="button"
                      >
                        <WandSparkles className="h-4 w-4" />
                        {t("createStarter")}
                      </button>
                    </div>
                  )}
                </article>
              ) : null}

              {selectedCanvas.kind === "character" && selectedCharacter ? (
                <article className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
                  <div className="rounded-2xl border border-white/[0.07] p-5">
                    <label className="block text-[12px] text-white/38">
                      <span>Character name</span>
                      <input
                        className="mt-2 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-2 text-[16px] text-white/78 outline-none"
                        disabled={!canEdit}
                        onChange={(event) =>
                          setCharacterDraft((current) =>
                            current
                              ? { ...current, name: event.target.value }
                              : current,
                          )
                        }
                        value={characterDraft?.name ?? ""}
                      />
                    </label>
                    <label className="mt-4 block text-[12px] text-white/38">
                      <span>{copy.description}</span>
                      <textarea
                        aria-label="Character description"
                        className="mt-2 min-h-24 w-full resize-y rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-3 text-[15px] leading-7 text-white/70 outline-none"
                        disabled={!canEdit}
                        onChange={(event) =>
                          setCharacterDraft((current) =>
                            current
                              ? { ...current, description: event.target.value }
                              : current,
                          )
                        }
                        value={characterDraft?.description ?? ""}
                      />
                    </label>
                    <div className="mt-4">
                      <WorkspaceModelSelect
                        allowProjectDefault={false}
                        label="Image model"
                        onChange={(value) => {
                          setCharacterGenerationModel(value);
                          setCharacterEstimate(null);
                        }}
                        options={IMAGE_MODEL_OPTIONS}
                        value={characterGenerationModel}
                      />
                    </div>
                    <label className="mt-4 block text-[12px] text-white/38">
                      <span>Prompt</span>
                      <textarea
                        aria-label="Character prompt"
                        className="mt-2 min-h-32 w-full resize-y rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-3 text-[15px] leading-7 text-white/70 outline-none"
                        disabled={!canEdit}
                        onChange={(event) =>
                          setCharacterDraft((current) =>
                            current
                              ? { ...current, prompt_en: event.target.value }
                              : current,
                          )
                        }
                        value={characterDraft?.prompt_en ?? ""}
                      />
                    </label>
                    <div className="mt-3 flex justify-end">
                      <button
                        className="rounded-lg border border-white/[0.09] px-3 py-2 text-[12px] text-white/58 hover:text-white disabled:opacity-35"
                        disabled={!canEdit}
                        onClick={() => void saveCharacterDraft(selectedCharacter)}
                        type="button"
                      >
                        Save character
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-3 py-2.5 text-[12px] text-white/60">
                        <Upload className="h-3.5 w-3.5 text-[#4facff]" />
                        Upload
                        <input
                          accept="image/*"
                          aria-label="Upload character image"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";
                            if (file) {
                              void uploadCharacterAsset(selectedCharacter, file);
                            }
                          }}
                          type="file"
                        />
                      </label>
                      <button
                        className="rounded-xl border border-white/[0.09] px-3 py-2.5 text-[12px] text-white/60 disabled:opacity-35"
                        disabled={isWorking}
                        onClick={() => void estimateCharacter(selectedCharacter)}
                        type="button"
                      >
                        {copy.estimate}
                      </button>
                      <button
                        className="rounded-xl bg-[#1677ff] px-3 py-2.5 text-[12px] font-semibold text-white disabled:opacity-35"
                        disabled={
                          isWorking || workflow?.status !== "approved"
                        }
                        onClick={() => void generateCharacter(selectedCharacter)}
                        type="button"
                      >
                        {isWorking ? copy.generating : "Generate"}
                      </button>
                    </div>
                    {characterEstimate ? (
                      <p className="mt-3 rounded-lg bg-[#1677ff]/[0.08] px-3 py-2 text-[12px] text-[#a8ddff]">
                        {t("estimatedCredits")}: {characterEstimate.credits} · {characterEstimate.provider}
                      </p>
                    ) : null}
                    {workflow?.status !== "approved" ? (
                      <p className="mt-3 rounded-lg border border-[#1677ff]/20 px-3 py-2 text-[12px] text-[#a8ddff]">
                        {copy.approvalRequired}
                      </p>
                    ) : null}
                  </div>
                  <section className="mt-5 rounded-2xl border border-white/[0.07] p-4">
                    <p className="mb-3 text-[12px] font-semibold text-white/38">
                      Results
                    </p>
                    <AssetResultList
                      assets={assets.filter(
                        (asset) =>
                          asset.content_type.startsWith("image/") &&
                          asset.filename.startsWith(
                            `character-${selectedCharacter.id}-`,
                          ),
                      )}
                      onDelete={(asset) => void deleteProjectAsset(asset)}
                      onOpen={(asset) =>
                        setSelectedCanvas({ kind: "asset", assetId: asset.id })
                      }
                      onSelect={(assetId) =>
                        void setSelectedAsset(
                          "character",
                          selectedCharacter.id,
                          assetId,
                        )
                      }
                      selectedAssetId={
                        selectedResourceAssets[
                          `character:${selectedCharacter.id}`
                        ]
                      }
                    />
                  </section>
                </article>
              ) : null}

              {selectedCanvas.kind === "scene" && selectedScene ? (
                <article className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
                  <div className="rounded-2xl border border-white/[0.07] p-5">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#7bc6ff]">
                      <MapPin className="h-4 w-4" />
                      {copy.scene}
                    </div>
                    <label className="mt-4 block text-[12px] text-white/38">
                      <span>Scene name</span>
                      <input
                        aria-label="Scene name"
                        className="mt-2 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-2 text-[16px] text-white/78 outline-none"
                        disabled={!canEdit}
                        onChange={(event) =>
                          setSceneDraft((current) =>
                            current
                              ? { ...current, name: event.target.value }
                              : current,
                          )
                        }
                        value={sceneDraft?.name ?? ""}
                      />
                    </label>
                    <label className="mt-4 block text-[12px] text-white/38">
                      <span>{copy.location}</span>
                      <input
                        aria-label="Scene location"
                        className="mt-2 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-2 text-[16px] text-white/78 outline-none"
                        disabled={!canEdit}
                        onChange={(event) =>
                          setSceneDraft((current) =>
                            current
                              ? { ...current, location: event.target.value }
                              : current,
                          )
                        }
                        value={sceneDraft?.location ?? ""}
                      />
                    </label>
                    <label className="mt-4 block text-[12px] text-white/38">
                      <span>{copy.description}</span>
                      <textarea
                        aria-label="Scene description"
                        className="mt-2 min-h-24 w-full resize-y rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-3 text-[15px] leading-7 text-white/70 outline-none"
                        disabled={!canEdit}
                        onChange={(event) =>
                          setSceneDraft((current) =>
                            current
                              ? { ...current, description: event.target.value }
                              : current,
                          )
                        }
                        value={sceneDraft?.description ?? ""}
                      />
                    </label>
                    <label className="mt-4 block text-[12px] text-white/38">
                      <span>Prompt</span>
                      <textarea
                        aria-label="Scene prompt"
                        className="mt-2 min-h-32 w-full resize-y rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-3 text-[15px] leading-7 text-white/70 outline-none"
                        disabled={!canEdit}
                        onChange={(event) =>
                          setSceneDraft((current) =>
                            current
                              ? { ...current, prompt_en: event.target.value }
                              : current,
                          )
                        }
                        value={sceneDraft?.prompt_en ?? ""}
                      />
                    </label>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-3 py-2.5 text-[12px] text-white/60 hover:border-[#1677ff]/35 hover:text-white">
                        <Upload className="h-3.5 w-3.5 text-[#4facff]" />
                        Upload
                        <input
                          accept="image/*"
                          aria-label="Upload scene image"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";
                            if (file) {
                              void uploadSceneAsset(selectedScene, file);
                            }
                          }}
                          type="file"
                        />
                      </label>
                      <button
                        className="rounded-lg border border-white/[0.09] px-3 py-2 text-[12px] text-white/58 hover:text-white disabled:opacity-35"
                        disabled={!canEdit || isWorking}
                        onClick={() => void saveSceneDraft(selectedScene)}
                        type="button"
                      >
                        Save scene
                      </button>
                    </div>
                  </div>
                  <section className="mt-5 rounded-2xl border border-white/[0.07] p-4">
                    <p className="mb-3 text-[12px] font-semibold text-white/38">
                      Results
                    </p>
                    <AssetResultList
                      assets={assets.filter(
                        (asset) =>
                          asset.content_type.startsWith("image/") &&
                          asset.filename.startsWith(
                            `scene-${selectedScene.id}-`,
                          ),
                      )}
                      onDelete={(asset) => void deleteProjectAsset(asset)}
                      onOpen={(asset) =>
                        setSelectedCanvas({ kind: "asset", assetId: asset.id })
                      }
                      onSelect={(assetId) =>
                        void setSelectedAsset(
                          "scene",
                          selectedScene.id,
                          assetId,
                        )
                      }
                      selectedAssetId={
                        selectedResourceAssets[`scene:${selectedScene.id}`]
                      }
                    />
                  </section>
                </article>
              ) : null}

              {selectedCanvas.kind === "shot" && canvasShot ? (
                <article className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
                  <div className="aspect-video overflow-hidden rounded-2xl border border-white/[0.08] bg-[radial-gradient(circle_at_72%_20%,rgba(22,119,255,0.26),transparent_28%),linear-gradient(145deg,#13213d,#080c13)] p-6">
                    <div className="flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-black/25 px-3 py-1.5 text-[12px] font-semibold backdrop-blur">
                          {copy.shot} {canvasShot.index + 1}
                        </span>
                        {canvasShot.status === "completed" ? (
                          <span className="grid size-8 place-items-center rounded-full bg-emerald-400 text-[#122016]">
                            <Check className="h-4 w-4" />
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <p className="max-w-2xl font-display text-2xl leading-tight text-white/85">
                          {shotDraft?.description ?? canvasShot.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-md border border-white/[0.1] bg-black/20 px-2.5 py-1 text-[12px] text-white/52">
                            {shotDraft?.duration_seconds ?? canvasShot.duration_seconds}s
                          </span>
                          <span className="rounded-md border border-white/[0.1] bg-black/20 px-2.5 py-1 text-[12px] text-white/52">
                            {shotDraft?.aspect_ratio ?? canvasShot.aspect_ratio}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/[0.07] p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-[12px] text-white/38 sm:col-span-2">
                        <span>{copy.description}</span>
                        <textarea
                          className="mt-2 min-h-20 w-full resize-y rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-2 text-[15px] leading-6 text-white/78 outline-none focus:border-[#1677ff]/40"
                          onChange={(event) =>
                            setShotDraft((current) =>
                              current
                                ? { ...current, description: event.target.value }
                                : current,
                            )
                          }
                          value={shotDraft?.description ?? ""}
                        />
                      </label>
                      <label className="text-[12px] text-white/38">
                        <span>{copy.duration}</span>
                        <input
                          className="mt-2 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-2 text-white/78 outline-none"
                          max={30}
                          min={1}
                          onChange={(event) =>
                            setShotDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    duration_seconds: Number(event.target.value),
                                  }
                                : current,
                            )
                          }
                          type="number"
                          value={shotDraft?.duration_seconds ?? 5}
                        />
                      </label>
                      <label className="text-[12px] text-white/38">
                        <span>{copy.ratio}</span>
                        <select
                          className="mt-2 w-full rounded-xl border border-white/[0.09] bg-[#11100d] px-3 py-2 text-white/78 outline-none"
                          onChange={(event) =>
                            setShotDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    aspect_ratio: event.target.value as Shot["aspect_ratio"],
                                  }
                                : current,
                            )
                          }
                          value={shotDraft?.aspect_ratio ?? "16:9"}
                        >
                          <option value="16:9">16:9</option>
                          <option value="21:9">21:9</option>
                          <option value="9:16">9:16</option>
                          <option value="1:1">1:1</option>
                        </select>
                      </label>
                    </div>
                    <div className="mt-4">
                      <WorkspaceModelSelect
                        label="Video model"
                        onChange={(value) => {
                          setShotGenerationModel(value);
                          setEstimate(null);
                        }}
                        options={VIDEO_MODEL_OPTIONS}
                        value={shotGenerationModel}
                      />
                    </div>
                    <label className="mt-4 block text-[12px] text-white/38">
                      <span>Prompt</span>
                      <textarea
                        aria-label="Shot prompt"
                        className="mt-2 min-h-40 w-full resize-y rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-3 text-[15px] leading-7 text-white/70 outline-none focus:border-[#1677ff]/40"
                        onChange={(event) =>
                          setShotDraft((current) =>
                            current
                              ? { ...current, prompt_en: event.target.value }
                              : current,
                          )
                        }
                        value={shotDraft?.prompt_en ?? ""}
                      />
                    </label>
                    <div className="mt-3 flex justify-end">
                      <button
                        className="rounded-lg border border-white/[0.09] px-3 py-2 text-[12px] text-white/58 hover:text-white"
                        onClick={() => void saveShotDraft(canvasShot)}
                        type="button"
                      >
                        Save shot
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-3 py-2.5 text-[12px] text-white/60 hover:border-[#1677ff]/35 hover:text-white">
                        <Upload className="h-3.5 w-3.5 text-[#4facff]" />
                        Upload
                        <input
                          accept="image/*"
                          aria-label="Upload shot reference"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.currentTarget.value = "";
                            if (!file) return;
                            void uploadVisionAsset(file, canvasShot.id).then(
                              async (asset) => {
                                if (!asset || !shotDraft) return;
                                const next = {
                                  ...shotDraft,
                                  prompt_en: `${shotDraft.prompt_en.trim()} @${asset.id}`,
                                };
                                setShotDraft(next);
                                await saveShotDraft(canvasShot, next);
                              },
                            );
                          }}
                          type="file"
                        />
                      </label>
                      <button
                        className="rounded-xl border border-white/[0.09] px-3 py-2.5 text-[12px] text-white/60 hover:text-white disabled:opacity-35"
                        disabled={isWorking}
                        onClick={() => void estimateShot()}
                        type="button"
                      >
                        {copy.estimate}
                      </button>
                      <button
                        className="rounded-xl bg-[#1677ff] px-3 py-2.5 text-[12px] font-semibold text-white disabled:opacity-35"
                        disabled={
                          isWorking ||
                          canvasShot.status === "completed" ||
                          workflow?.status !== "approved"
                        }
                        onClick={() => void generateShot()}
                        type="button"
                      >
                        {isWorking ? copy.generating : "Generate"}
                      </button>
                    </div>
                    {estimate ? (
                      <p className="mt-3 rounded-lg bg-[#1677ff]/[0.08] px-3 py-2 text-[12px] text-[#a8ddff]">
                        {t("estimatedCredits")}: {estimate.credits} · {estimate.provider}
                      </p>
                    ) : null}
                    {workflow?.status !== "approved" ? (
                      <p className="mt-3 rounded-lg border border-[#1677ff]/20 px-3 py-2 text-[12px] text-[#a8ddff]">
                        {copy.approvalRequired}
                      </p>
                    ) : null}
                  </div>
                  <section className="mt-5 rounded-2xl border border-white/[0.07] p-4">
                    <p className="mb-3 text-[12px] font-semibold text-white/38">
                      Results
                    </p>
                    <AssetResultList
                      assets={assets.filter(
                        (asset) =>
                          asset.shot_id === canvasShot.id &&
                          !["export", "cover"].includes(asset.kind),
                      )}
                      onDelete={(asset) => void deleteProjectAsset(asset)}
                      onOpen={(asset) =>
                        setSelectedCanvas({ kind: "asset", assetId: asset.id })
                      }
                      onSelect={(assetId) =>
                        void setSelectedAsset("shot", canvasShot.id, assetId)
                      }
                      selectedAssetId={
                        selectedResourceAssets[`shot:${canvasShot.id}`]
                      }
                    />
                  </section>
                </article>
              ) : null}

              {selectedCanvas.kind === "asset" && selectedAsset ? (
                <article className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
                  <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30">
                    {selectedAsset.content_type.startsWith("video/") ? (
                      <video
                        className="max-h-[65vh] w-full bg-black"
                        controls
                        playsInline
                        src={mediaUrl(selectedAsset.content_url)}
                      />
                    ) : selectedAsset.content_type.startsWith("image/") ? (
                      <img
                        alt={selectedAsset.filename}
                        className="max-h-[65vh] w-full object-contain"
                        src={mediaUrl(selectedAsset.content_url)}
                      />
                    ) : (
                      <div className="grid min-h-80 place-items-center">
                        <FileText className="h-12 w-12 text-white/18" />
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-4">
                    <div>
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          void renameProjectAsset(
                            selectedAsset,
                            String(form.get("filename") ?? ""),
                          );
                        }}
                      >
                        <input
                          className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[15px] font-medium text-white/82 outline-none"
                          defaultValue={selectedAsset.filename}
                          name="filename"
                        />
                        <button
                          className="rounded-lg border border-white/[0.09] px-3 py-2 text-[12px] text-white/52 hover:text-white"
                          type="submit"
                        >
                          Save
                        </button>
                      </form>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[12px] text-white/38">
                          {selectedAsset.content_type}
                        </span>
                        <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[12px] text-white/38">
                          {(selectedAsset.byte_size / 1024 / 1024).toFixed(1)} MB
                        </span>
                        <button
                          className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[12px] text-[#8fdcff] hover:text-white"
                          onClick={() =>
                            void navigator.clipboard?.writeText(selectedAsset.id)
                          }
                          title={selectedAsset.id}
                          type="button"
                        >
                          Copy ID @{selectedAsset.id.slice(0, 8)}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        className="flex items-center gap-2 rounded-lg border border-white/[0.09] px-3 py-2 text-[11px] text-white/55 hover:text-white"
                        download={selectedAsset.filename}
                        href={mediaUrl(selectedAsset.content_url)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {copy.download}
                      </a>
                      <button
                        aria-label={`Delete ${selectedAsset.filename}`}
                        className="grid size-9 place-items-center rounded-lg border border-white/[0.09] text-white/38 hover:border-red-400/30 hover:text-red-300"
                        onClick={() => void deleteProjectAsset(selectedAsset)}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {selectedAsset.kind === "export" ? (
                    <section className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[12px] font-semibold text-[#6eb8ff]">
                            {locale.startsWith("zh")
                              ? "终版视觉评估"
                              : "Final Cut review"}
                          </p>
                          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-white/40">
                            {locale.startsWith("zh")
                              ? "选择视觉评估模型与指标，在发布前检查最终成片。"
                              : "Choose a visual evaluator and quality metrics before publishing."}
                          </p>
                        </div>
                        <ScanSearch className="h-5 w-5 shrink-0 text-[#4facff]" />
                      </div>
                      {visualReviewModels.length === 0 ? (
                        <p className="mt-4 rounded-xl border border-white/[0.07] px-3 py-3 text-[13px] text-white/38">
                          {locale.startsWith("zh")
                            ? "尚未配置视觉评估模型。"
                            : "No visual evaluator is configured."}
                        </p>
                      ) : (
                        <>
                          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                            <label className="text-[12px] text-white/38">
                              <span>{locale.startsWith("zh") ? "评估模型" : "Evaluator"}</span>
                              <select
                                className="mt-2 w-full rounded-xl border border-white/[0.09] bg-[#11100d] px-3 py-2 text-[13px] text-white/72 outline-none"
                                onChange={(event) =>
                                  setVisualReviewModel(event.target.value)
                                }
                                value={visualReviewModel}
                              >
                                {visualReviewModels.map((model) => (
                                  <option key={model.id} value={model.id}>
                                    {model.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              className="flex items-center justify-center gap-2 rounded-xl bg-[#1677ff] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-35"
                              disabled={
                                isReviewing ||
                                !visualReviewModel ||
                                visualReviewMetrics.length === 0
                              }
                              onClick={() => void runVisualReview()}
                              type="button"
                            >
                              {isReviewing ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <ScanSearch className="h-4 w-4" />
                              )}
                              {isReviewing
                                ? locale.startsWith("zh")
                                  ? "评估中"
                                  : "Reviewing"
                                : locale.startsWith("zh")
                                  ? "开始评估"
                                  : "Run review"}
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(
                              Object.keys(
                                visualMetricLabels,
                              ) as VisualReviewMetricKey[]
                            ).map((metric) => {
                              const selected =
                                visualReviewMetrics.includes(metric);
                              return (
                                <button
                                  aria-pressed={selected}
                                  className={cn(
                                    "rounded-lg border px-3 py-2 text-[12px] transition",
                                    selected
                                      ? "border-[#1677ff]/30 bg-[#1677ff]/[0.08] text-[#9bdcff]"
                                      : "border-white/[0.08] text-white/38 hover:text-white/68",
                                  )}
                                  key={metric}
                                  onClick={() =>
                                    setVisualReviewMetrics((current) =>
                                      current.includes(metric)
                                        ? current.filter(
                                            (value) => value !== metric,
                                          )
                                        : [...current, metric],
                                    )
                                  }
                                  type="button"
                                >
                                  {visualMetricLabels[metric]}
                                </button>
                              );
                            })}
                          </div>
                          {visualReviewError ? (
                            <p className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.045] px-3 py-2 text-[12px] text-red-200/75">
                              {visualReviewError}
                            </p>
                          ) : null}
                          {visualReview ? (
                            <div className="mt-4 rounded-xl border border-white/[0.07] p-4">
                              <div className="flex items-end gap-3">
                                <strong className="font-display text-4xl leading-none text-white/88">
                                  {visualReview.overall_score}
                                </strong>
                                <span className="pb-1 text-[12px] text-white/35">
                                  {locale.startsWith("zh")
                                    ? "视觉综合分"
                                    : "Visual score"}
                                </span>
                              </div>
                              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {visualReview.metrics.map((metric) => (
                                  <div
                                    className="rounded-xl border border-white/[0.07] p-3"
                                    key={metric.key}
                                  >
                                    <div className="flex items-center justify-between gap-3 text-[12px]">
                                      <span>{visualMetricLabels[metric.key]}</span>
                                      <span className="text-[#8fdcff]">
                                        {metric.score}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-[12px] leading-5 text-white/36">
                                      {metric.rationale}
                                    </p>
                                  </div>
                                ))}
                              </div>
                              <p className="mt-3 text-[13px] leading-6 text-white/48">
                                {visualReview.summary}
                              </p>
                            </div>
                          ) : null}
                        </>
                      )}
                    </section>
                  ) : null}
                </article>
              ) : null}

              {actionError ? (
                <p
                  aria-live="polite"
                  className="mx-auto mt-3 max-w-4xl px-6 text-[12px] text-red-300 sm:px-10"
                >
                  {actionError}
                </p>
              ) : null}

              {exportedAssets.length > 0 ? (
                <section className="mx-auto mt-5 max-w-4xl px-6 pb-10 sm:px-10">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-[13px] font-semibold">{copy.exportReady}</h2>
                        <p className="mt-1 text-[11px] text-white/32">
                          {exportedAssets.length} {t("exportVariants")}
                        </p>
                      </div>
                      {exportCover ? (
                        <img
                          alt={t("exportCover")}
                          className="h-14 w-20 rounded-lg object-cover"
                          src={mediaUrl(exportCover.content_url)}
                        />
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {exportedAssets.map((asset) => (
                        <div className="flex items-center gap-1" key={asset.id}>
                          <a
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.09] px-3 py-2 text-[11px] text-white/62 hover:border-white/20 hover:text-white"
                            download={asset.filename}
                            href={mediaUrl(asset.content_url)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            {asset.filename}
                          </a>
                          <button
                            aria-label={`${copy.share} ${asset.filename}`}
                            className="grid size-8 place-items-center rounded-lg border border-white/[0.09] text-white/45 hover:text-white disabled:opacity-35"
                            disabled={isSharing}
                            onClick={() => void shareExport(asset)}
                            type="button"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            aria-label={`${copy.publish} ${asset.filename}`}
                            className="grid size-8 place-items-center rounded-lg border border-white/[0.09] text-white/45 hover:border-[#1677ff]/35 hover:text-white"
                            onClick={() => openPublishDialog(asset)}
                            type="button"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {shareLink ? (
                      <label className="mt-3 block text-[11px] text-white/38">
                        <span>{t("shareReady")}</span>
                        <input
                          className="mt-2 w-full rounded-lg border border-white/[0.09] bg-black/20 px-3 py-2 text-white/70"
                          readOnly
                          value={mediaUrl(shareLink.share_url)}
                        />
                      </label>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>
          </section>

          <aside
            className={cn(
              "relative min-h-0 flex-col border-l border-white/[0.07] bg-[#0d0c0a]/[0.76] backdrop-blur-lg xl:flex",
              mobilePanel === "agent" ? "flex" : "hidden",
            )}
          >
            <button
              aria-label="Resize agent pane"
              className="absolute -left-1 top-0 z-20 hidden h-full w-2 cursor-col-resize bg-transparent xl:block"
              onPointerDown={(event) => beginPaneResize("agent", event)}
              type="button"
            />
            {agentPanelCollapsed ? (
              <>
                <div
                  className="grid h-[88px] shrink-0 place-items-center border-b border-white/[0.07] bg-[#0d0c0a]/[0.96]"
                  data-testid="workspace-header-agents"
                >
                  <button
                    aria-label={copy.expandAgents}
                    className="grid size-8 place-items-center rounded-lg text-[#4facff] hover:bg-[#1677ff]/10"
                    onClick={() => setAgentPanelCollapsed(false)}
                    type="button"
                  >
                    <PanelRightOpen className="h-4 w-4" />
                  </button>
                </div>
                <button
                  className="mt-3 grid place-items-center gap-3 rounded-xl px-2 py-3 text-[#4facff] hover:bg-[#1677ff]/10"
                  onClick={() => setAgentPanelCollapsed(false)}
                  type="button"
                >
                  <Sparkles className="h-5 w-5" />
                  <span className="[writing-mode:vertical-rl] text-[13px] tracking-[0.08em]">
                    Agents
                  </span>
                </button>
              </>
            ) : null}
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col",
                agentPanelCollapsed && "hidden",
              )}
            >
            <div
              className="flex h-[88px] shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0d0c0a]/[0.96] px-4"
              data-testid="workspace-header-agents"
            >
              <span className="flex items-center gap-2 text-[12px] font-medium text-white/82">
                <span className="grid size-6 place-items-center rounded-lg bg-[#1677ff]/15 text-[#7bc6ff]">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                Agents
              </span>
              <button
                aria-label={copy.collapseAgents}
                className="grid size-8 place-items-center rounded-lg text-[#4facff] hover:bg-[#1677ff]/10"
                onClick={() => setAgentPanelCollapsed(true)}
                type="button"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-[15px] leading-7 text-white/58">
                  {t("agentIntro")}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-[15px] leading-7",
                      message.role === "user"
                        ? "ml-8 border border-[#1677ff]/20 bg-[#1677ff]/[0.075] text-white/78"
                        : "mr-3 border border-white/[0.07] bg-white/[0.02] text-white/52",
                    )}
                    key={message.id}
                  >
                    {message.role === "user" ? (
                      message.content
                    ) : (
                      <StreamingText
                        animate={streamingMessageIds.has(message.id)}
                        onComplete={() => finishAssistantStream(message.id)}
                        text={message.content}
                      />
                    )}
                  </div>
                ))
              )}
              {workflow?.stage === "ready" ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.045] px-4 py-3 text-[15px] leading-7 text-emerald-200/75">
                  {copy.readyMessage}
                </div>
              ) : null}
              {agentActivities.length > 0 ? (
                <AgentActivityTrace
                  activities={agentActivities}
                  isWorking={isWorking}
                  locale={locale}
                />
              ) : pendingDecision ? (
                <div className="mr-3 flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[15px] leading-7 text-white/52">
                  <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#4facff]" />
                  {pendingDecision}
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
            {canEdit &&
            workflow?.status === "awaiting_approval" &&
            workflow.stage !== "ready" ? (
              <div className="shrink-0 border-t border-white/[0.07] p-3">
                <ApprovalCard
                  copy={copy}
                  customOpen={customDecisionOpen}
                  customValue={customDecision}
                  isWorking={isWorking}
                  onCustomOpen={() => setCustomDecisionOpen((current) => !current)}
                  onCustomValue={setCustomDecision}
                  onDecision={(choice, instruction) =>
                    void decideWorkflow(choice, instruction)
                  }
                  stage={workflow.stage}
                />
              </div>
            ) : null}
            <div className="shrink-0 border-t border-white/[0.07] p-3">
              <label className="block rounded-2xl border border-white/[0.09] bg-white/[0.025] p-3 focus-within:border-[#1677ff]/35">
                <span className="sr-only">{t("agent")}</span>
                <textarea
                  className="min-h-16 w-full resize-none bg-transparent text-[15px] leading-7 text-white outline-none placeholder:text-white/28"
                  disabled={!canEdit}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  placeholder={copy.chatPlaceholder}
                  value={messageDraft}
                />
                <span className="flex items-center justify-end">
                  <button
                    aria-label={copy.send}
                    className="grid size-8 place-items-center rounded-xl bg-[#1677ff] text-white disabled:opacity-35"
                    disabled={!canEdit || !messageDraft.trim() || isWorking}
                    onClick={() => void sendMessage()}
                    type="button"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </span>
              </label>
            </div>
            </div>
          </aside>
        </div>

        <nav
          className={cn(
            "grid border-t border-white/[0.07] bg-[#0d0c0a] xl:hidden",
            embedded ? "grid-cols-3" : "grid-cols-4",
          )}
        >
          {[
            ...(!embedded
              ? [
                  {
                    id: "history" as const,
                    label: copy.recent,
                    icon: MessageSquareText,
                  },
                ]
              : []),
            { id: "assets" as const, label: copy.assets, icon: Layers3 },
            { id: "canvas" as const, label: t("canvas"), icon: Film },
            { id: "agent" as const, label: t("agent"), icon: Sparkles },
          ].map(({ id, label, icon: Icon }) => (
            <button
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px]",
                mobilePanel === id ? "text-[#6eb8ff]" : "text-white/30",
              )}
              key={id}
              onClick={() => setMobilePanel(id)}
              type="button"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </section>

      {mobilePanel === "history" ? (
        <div className="fixed inset-0 z-40 flex bg-black/60 backdrop-blur-sm xl:hidden">
          <WorkspaceHistory
            activeProjectId={project.id}
            collapsed={false}
            draggingThreadId={draggingThreadId}
            locale={locale}
            onBeginDrag={beginThreadDrag}
            onDeleteFolder={(folder) => void deleteFolder(folder)}
            onDrop={dropThread}
            onNewFolder={() => {
              setRenamingFolder(null);
              setFolderName("");
              setFolderDialogOpen(true);
            }}
            onRenameFolder={(folder) => {
              setRenamingFolder(folder);
              setFolderName(folder.name);
              setFolderDialogOpen(true);
            }}
            onToggleCollapsed={() => setMobilePanel("canvas")}
            onToggleFolder={(folderId) =>
              setOpenFolders((current) =>
                current.includes(folderId)
                  ? current.filter((id) => id !== folderId)
                  : [...current, folderId],
              )
            }
            openFolders={openFolders}
            workspace={workspace}
          />
        </div>
      ) : null}

      {folderDialogOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setFolderDialogOpen(false);
              setRenamingFolder(null);
            }
          }}
        >
          <form
            aria-label={renamingFolder ? copy.rename : copy.newFolder}
            className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#15130f] p-5"
            onSubmit={(event) => void saveFolder(event)}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">
                {renamingFolder ? copy.rename : copy.newFolder}
              </h2>
              <button
                aria-label={copy.cancel}
                className="grid size-8 place-items-center rounded-lg text-white/35 hover:bg-white/[0.06] hover:text-white"
                onClick={() => {
                  setFolderDialogOpen(false);
                  setRenamingFolder(null);
                }}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-5 block text-[12px] text-white/45">
              {copy.folderName}
              <input
                autoFocus
                className="mt-2 w-full rounded-xl border border-white/[0.09] bg-black/20 px-4 py-3 text-white outline-none focus:border-[#1677ff]/40"
                maxLength={120}
                onChange={(event) => setFolderName(event.target.value)}
                required
                value={folderName}
              />
            </label>
            <button
              className="mt-4 w-full rounded-xl bg-[#1677ff] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-35"
              disabled={!folderName.trim()}
              type="submit"
            >
              {copy.save}
            </button>
          </form>
        </div>
      ) : null}

      {generationErrorOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setGenerationErrorOpen(false);
          }}
        >
          <div
            aria-labelledby="generation-error-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#15120e] p-6"
            role="dialog"
          >
            <h2 id="generation-error-title" className="text-xl font-semibold">
              {t("generationError")}
            </h2>
            {generationErrorMessage ? (
              <p className="mt-3 whitespace-pre-wrap text-[12px] leading-6 text-white/48">
                {generationErrorMessage}
              </p>
            ) : null}
            <button
              autoFocus
              className="mt-6 rounded-lg bg-[#1677ff] px-5 py-2.5 text-[12px] font-semibold text-white"
              onClick={() => setGenerationErrorOpen(false)}
              type="button"
            >
              {t("dismiss")}
            </button>
          </div>
        </div>
      ) : null}

      {shareDialogOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setShareDialogOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="collaboration-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-white/[0.12] bg-[#15120e] p-6"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-xl font-semibold text-white"
                  id="collaboration-title"
                >
                  {copy.shareTitle}
                </h2>
              </div>
              <button
                aria-label={copy.cancel}
                className="grid size-8 place-items-center rounded-lg text-white/35 hover:bg-white/[0.06] hover:text-white"
                onClick={() => setShareDialogOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-5 block text-[12px] text-white/42">
              <span>{copy.inviteEmail}</span>
              <span className="mt-2 flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-3">
                <Mail className="h-4 w-4 text-[#4facff]" />
                <input
                  aria-label={copy.inviteEmail}
                  className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-white outline-none"
                  onChange={(event) => setShareEmail(event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  value={shareEmail}
                />
              </span>
            </label>
            <div className="relative mt-4">
              <span className="text-[12px] text-white/42">Access</span>
              <button
                aria-expanded={sharePermissionOpen}
                aria-haspopup="listbox"
                aria-label="Collaboration access"
                className="mt-2 flex w-full items-center justify-between rounded-xl border border-white/[0.09] bg-[#0f0e0c] px-3 py-3 text-left text-[15px] text-white transition hover:border-[#1677ff]/30"
                onClick={() => setSharePermissionOpen((current) => !current)}
                type="button"
              >
                <span>
                  {sharePermission === "view" ? copy.canView : copy.canEdit}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4 text-white/38 transition",
                    sharePermissionOpen && "rotate-180",
                  )}
                />
              </button>
              {sharePermissionOpen ? (
                <div
                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 grid gap-1 rounded-xl border border-white/[0.1] bg-[#17150f] p-1.5 shadow-2xl shadow-black/50"
                  role="listbox"
                >
                  {(["view", "edit"] as const).map((permission) => (
                    <button
                      aria-selected={sharePermission === permission}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-[14px] transition",
                        sharePermission === permission
                          ? "bg-[#1677ff]/15 text-[#9bd8ff]"
                          : "text-white/62 hover:bg-white/[0.05] hover:text-white",
                      )}
                      key={permission}
                      onClick={() => {
                        setSharePermission(permission);
                        setSharePermissionOpen(false);
                      }}
                      role="option"
                      type="button"
                    >
                      {permission === "view" ? copy.canView : copy.canEdit}
                      {sharePermission === permission ? (
                        <Check className="h-4 w-4" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1677ff] px-4 py-3 text-[13px] font-semibold text-white disabled:opacity-35"
              disabled={isSharing}
              onClick={() => void createCollaborationLink()}
              type="button"
            >
              {isSharing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {copy.createLink}
            </button>
            {collaborationLink ? (
              <div className="mt-5 rounded-xl border border-[#1677ff]/25 bg-[#1677ff]/[0.06] p-3">
                <p className="text-[12px] text-white/46">
                  {copy.linkAccess}
                  {" · "}
                  {collaborationLink.permission === "edit"
                    ? copy.canEdit
                    : copy.canView}
                </p>
                <input
                  aria-label="Collaboration link"
                  className="mt-3 w-full rounded-lg border border-white/[0.09] bg-black/25 px-3 py-2 text-[12px] text-white/68"
                  readOnly
                  value={collaborationLink.share_url}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.1] px-3 py-2 text-[12px] text-white/65 hover:text-white"
                    onClick={() => void copyCollaborationLink()}
                    type="button"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {shareCopied ? copy.copied : copy.copyLink}
                  </button>
                  <a
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/[0.08] px-3 py-2 text-[12px] text-white/65 hover:text-white"
                    href={collaborationLink.share_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {copy.openLink}
                  </a>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {publishAsset ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setPublishAsset(null);
          }}
        >
          <form
            aria-labelledby="publish-final-cut-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-white/[0.12] bg-[#15120e] p-6"
            onSubmit={(event) => void publishFinalCut(event)}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                className="text-xl font-semibold text-white"
                id="publish-final-cut-title"
              >
                {copy.publishTitle}
              </h2>
              <button
                aria-label={copy.cancel}
                className="grid size-8 place-items-center rounded-lg text-white/35 hover:bg-white/[0.06] hover:text-white"
                onClick={() => setPublishAsset(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-5 block text-[12px] text-white/42">
              <span>Title</span>
              <input
                aria-label="Published video title"
                className="mt-2 w-full rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-3 text-[15px] text-white outline-none"
                maxLength={200}
                onChange={(event) => setPublishTitleDraft(event.target.value)}
                required
                value={publishTitleDraft}
              />
            </label>
            <label className="mt-4 block text-[12px] text-white/42">
              <span>{copy.publishPrompt}</span>
              <textarea
                aria-label="Published video description"
                className="mt-2 min-h-28 w-full resize-y rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-3 text-[15px] leading-7 text-white outline-none"
                onChange={(event) => setPublishPromptDraft(event.target.value)}
                value={publishPromptDraft}
              />
            </label>
            {publishMessage ? (
              <p className="mt-4 rounded-lg bg-emerald-400/10 px-3 py-2 text-[12px] text-emerald-200">
                {publishMessage}
              </p>
            ) : null}
            <button
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1677ff] px-4 py-3 text-[13px] font-semibold text-white disabled:opacity-35"
              disabled={isWorking || !publishTitleDraft.trim()}
              type="submit"
            >
              <Send className="h-4 w-4" />
              {copy.publish}
            </button>
          </form>
        </div>
      ) : null}

    </main>
  );
}
