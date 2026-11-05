"use client";

import {
  ArrowLeft,
  ArrowUp,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Download,
  FileCheck2,
  FileText,
  Film,
  Flame,
  Folder,
  FolderOpen,
  Gem,
  Image,
  LoaderCircle,
  Layers3,
  MessageCircleMore,
  MessageSquareText,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  ScanSearch,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  Video,
  WandSparkles,
  Wrench,
  X,
} from "lucide-react";
import { StreamingText } from "@videoagent/landing";
import { useLocale, useTranslations } from "next-intl";
import {
  DragEvent,
  FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "@/i18n/navigation";
import { resolveApiBaseUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  title: string;
  brief: string;
  state: string;
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
  aspect_ratio: "16:9" | "9:16" | "1:1";
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

type Storyboard = {
  id: string;
  project_id: string;
  version: number;
  shots: Shot[];
  characters: Character[];
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
      section: "description" | "generation";
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

type ProjectProgress = {
  percent: number;
  workflow_stage: WorkflowStage;
  workflow_status: "awaiting_approval" | "approved";
  total_shots: number;
  completed_shots: number;
  updated_at: string;
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
        direction: "方向",
        vision: "视觉",
        settings: "设定集",
        settingAttributes: "属性",
        description: "描述",
        generation: "生成",
        directorInput: "导演输入",
        character: "角色集",
        finalCut: "终版",
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
        shot: "镜头",
        duration: "时长",
        ratio: "画面比例",
        estimate: "估算积分",
        generate: "生成镜头",
        approvalRequired: "请先在 Agents 中批准故事，再生成镜头。",
        generating: "生成中……",
        upload: "上传素材",
        uploading: "上传中……",
        direct: "直接生成",
        reference: "参考生成",
        referenceImage: "参考图",
        chooseReference: "选择 Vision 参考图",
        generateDirect: "直接生成",
        generateWithReference: "参考生成",
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
        direction: "Direction",
        vision: "Vision",
        settings: "Settings",
        settingAttributes: "Attributes",
        description: "Description",
        generation: "Generation",
        directorInput: "Director input",
        character: "Characters",
        finalCut: "Final Cut",
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
        shot: "Shot",
        duration: "Duration",
        ratio: "Aspect ratio",
        estimate: "Estimate credits",
        generate: "Generate shot",
        approvalRequired: "Approve the story in Agents before generating a shot.",
        generating: "Generating…",
        upload: "Upload asset",
        uploading: "Uploading…",
        direct: "Direct",
        reference: "Reference",
        referenceImage: "Reference image",
        chooseReference: "Choose a Vision reference",
        generateDirect: "Generate directly",
        generateWithReference: "Generate from reference",
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
    { href: "/#agents", icon: Clapperboard, label: "Agents" },
    { href: "/#skills", icon: Video, label: "Skills" },
    { href: "/#hots", icon: Flame, label: "Hots" },
    { href: "/#assets", icon: Film, label: copy.assets },
    { href: "/#docs", icon: FileText, label: copy.docs },
  ] as const;

  if (collapsed) {
    return (
      <aside className="flex w-[76px] min-h-0 shrink-0 flex-col items-center border-white/[0.07] bg-[#0d0c0a] py-3 xl:my-5 xl:ml-5 xl:rounded-[26px] xl:border">
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
    <aside className="flex w-[280px] min-h-0 shrink-0 flex-col border-white/[0.07] bg-[#0d0c0a] xl:my-5 xl:ml-5 xl:rounded-[26px] xl:border">
      <div className="flex h-14 items-center justify-between px-4">
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

type AssetsTreeProps = {
  assets: Asset[];
  collapsed: boolean;
  copy: ReturnType<typeof workspaceCopy>;
  selected: CanvasSelection;
  storyboard: Storyboard | null;
  onSelect: (selection: CanvasSelection) => void;
  onToggleCollapsed: () => void;
};

function AssetsTree({
  assets,
  collapsed,
  copy,
  selected,
  storyboard,
  onSelect,
  onToggleCollapsed,
}: AssetsTreeProps) {
  const [sections, setSections] = useState({
    direction: true,
    vision: true,
    character: true,
    shots: true,
    finalCut: true,
  });
  const selectedClass =
    "border-[#1677ff]/30 bg-[#1677ff]/[0.08] text-white";
  const idleClass =
    "border-transparent text-white/50 hover:border-white/[0.07] hover:bg-white/[0.03] hover:text-white/75";

  if (collapsed) {
    return (
      <aside className="flex w-full min-h-0 flex-col items-center border-r border-white/[0.07] bg-[#0b0a08]/[0.82] backdrop-blur-xl">
        <div className="grid h-14 shrink-0 place-items-center border-b border-white/[0.07] bg-[#0b0a08]/[0.96]">
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
  const shotAssets = assets.filter(
    (asset) =>
      asset.content_type.startsWith("video/") &&
      !["export", "cover"].includes(asset.kind),
  );
  const finalCutAssets = assets.filter((asset) =>
    ["export", "cover"].includes(asset.kind),
  );

  return (
    <aside className="flex w-full min-h-0 min-w-0 shrink-0 flex-col border-r border-white/[0.07] bg-[#0b0a08]/[0.72] backdrop-blur-lg">
      <div className="flex h-14 items-center justify-between border-b border-white/[0.07] bg-[#0b0a08]/[0.96] px-4">
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
                    <details
                      className="rounded-lg border border-white/[0.055] bg-black/10"
                      key={character.id}
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[12px] text-white/58">
                        <ChevronRight className="tree-chevron h-3.5 w-3.5 text-[#4facff]" />
                        <Folder className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                        <span className="truncate">{character.name}</span>
                      </summary>
                      <div className="space-y-1 px-2 pb-2 pl-6">
                        <button
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition",
                            selected.kind === "character" &&
                              selected.characterId === character.id &&
                              selected.section === "description"
                              ? selectedClass
                              : idleClass,
                          )}
                          onClick={() =>
                            onSelect({
                              kind: "character",
                              characterId: character.id,
                              section: "description",
                            })
                          }
                          type="button"
                        >
                          <FileText className="h-3.5 w-3.5 text-[#4facff]" />
                          {copy.description}
                        </button>
                        <button
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition",
                            selected.kind === "character" &&
                              selected.characterId === character.id &&
                              selected.section === "generation"
                              ? selectedClass
                              : idleClass,
                          )}
                          onClick={() =>
                            onSelect({
                              kind: "character",
                              characterId: character.id,
                              section: "generation",
                            })
                          }
                          type="button"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-[#4facff]" />
                          {copy.generation}
                        </button>
                      </div>
                    </details>
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
                      {shotAssets
                        .filter((asset) => asset.shot_id === shot.id)
                        .map((asset) => (
                        <button
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg py-1.5 pl-8 pr-3 text-left text-[12px] transition",
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
                          <Video className="h-3.5 w-3.5 text-[#4facff]" />
                          <span className="truncate">{asset.filename}</span>
                        </button>
                        ))}
                    </div>
                  ))}
                  {shotAssets
                    .filter((asset) => asset.shot_id === null)
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
                          <Video className="h-3.5 w-3.5 text-[#4facff]" />
                          <span className="truncate">{asset.filename}</span>
                        </button>
                    ))}
                </div>
              ) : null}

              {sectionButton("finalCut", copy.finalCut, true)}
              {sections.finalCut ? (
                <div className="space-y-1 pl-7">
                  {finalCutAssets.map((asset) => (
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
                      <Video className="h-3.5 w-3.5 text-[#4facff]" />
                      <span className="truncate">{asset.filename}</span>
                    </button>
                  ))}
                </div>
              ) : null}
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
  const [shotGenerationMode, setShotGenerationMode] = useState<
    "direct" | "reference"
  >("direct");
  const [referenceAssetId, setReferenceAssetId] = useState<string | null>(null);
  const [characterGenerationMode, setCharacterGenerationMode] = useState<
    "direct" | "reference"
  >("direct");
  const [characterReferenceAssetId, setCharacterReferenceAssetId] = useState<
    string | null
  >(null);
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
  const [projectProgress, setProjectProgress] = useState<ProjectProgress | null>(
    null,
  );
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
  const [exportedAssets, setExportedAssets] = useState<Asset[]>([]);
  const [exportCover, setExportCover] = useState<Asset | null>(null);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [assetsPanelCollapsed, setAssetsPanelCollapsed] = useState(false);
  const [agentPanelCollapsed, setAgentPanelCollapsed] = useState(false);
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
          setSelectedCanvas({ kind: "document", document: "outline" });
        }
        let nextMessages: Message[] = [];
        if (messagesResponse.ok) {
          nextMessages = ((await messagesResponse.json()) as { items: Message[] }).items;
          setMessages(nextMessages);
        }
        if (assetsResponse.ok) {
          setAssets(((await assetsResponse.json()) as { items: Asset[] }).items);
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
            setSelectedCanvas({ kind: "document", document: "outline" });
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
    let timer: number | undefined;

    async function refreshProgress() {
      const response = await fetch(
        `${API_BASE_URL}/projects/${project?.id}/progress`,
        { credentials: "include" },
      ).catch(() => null);
      if (!active) return;
      if (response?.ok) {
        setProjectProgress((await response.json()) as ProjectProgress);
      }
      timer = window.setTimeout(() => void refreshProgress(), 3_000);
    }

    void refreshProgress();

    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
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
  const canExport = Boolean(
    storyboard?.shots.some((shot) => shot.status === "completed"),
  );
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
  const referenceAssets = assets.filter((asset) =>
    asset.content_type.startsWith("image/"),
  );
  const generatedCharacterAsset =
    selectedCharacter === null
      ? undefined
      : assets.find(
          (asset) =>
            asset.content_type.startsWith("image/") &&
            asset.filename.startsWith(`character-${selectedCharacter.id}-`),
        );
  const generatedShotAsset = assets.find(
    (asset) =>
      asset.shot_id === canvasShot?.id &&
      asset.content_type.startsWith("video/") &&
      !["export", "cover"].includes(asset.kind),
  );

  async function refreshWorkspace() {
    const response = await fetch(`${API_BASE_URL}/workspace`, {
      credentials: "include",
    }).catch(() => null);
    if (response?.ok) {
      setWorkspace((await response.json()) as WorkspaceData);
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
      setSelectedCanvas({ kind: "document", document: "outline" });
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
      if (!response.ok) throw new Error("agent-message-failed");
      const turn = (await response.json()) as AgentTurn;
      beginAssistantStream(turn.assistant_message);
      setMessages((current) => [...current, turn.user_message, turn.assistant_message]);
      setStoryboard(turn.storyboard);
      if (turn.workflow) setWorkflow(turn.workflow);
      setSelectedShotId(turn.storyboard.shots[0]?.id ?? null);
      setSelectedCanvas({ kind: "document", document: "outline" });
      setEstimate(null);
      setMessageDraft("");
      setMobilePanel("canvas");
      await settleAgentRun(runId);
      await refreshWorkspace();
    } catch {
      setActionError(t("agentIntro"));
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
      const response = await fetch(`${API_BASE_URL}/shots/${selectedShot.id}/estimate`, {
        method: "POST",
        credentials: "include",
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
    mode: "direct" | "reference" = "direct",
  ) {
    const response = await fetch(`${API_BASE_URL}/shots/${shot.id}/generate`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        approved: true,
        generation_mode:
          mode === "reference" ? "image_to_video" : "text_to_video",
        reference_asset_id:
          mode === "reference"
            ? (referenceAssetId ?? referenceAssets[0]?.id ?? null)
            : null,
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
      if (!estimate) {
        const estimateResponse = await fetch(
          `${API_BASE_URL}/shots/${selectedShot.id}/estimate`,
          {
            method: "POST",
            credentials: "include",
          },
        );
        if (!estimateResponse.ok) throw new Error("estimate-failed");
        setEstimate((await estimateResponse.json()) as CostEstimate);
      }
      if (shotGenerationMode === "reference" && !referenceAssetId) {
        throw new Error("Select a reference image from Vision first.");
      }
      await submitGeneration(selectedShot, shotGenerationMode);
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
        },
      );
      if (!estimateResponse.ok) throw new Error("estimate-failed");
      const nextEstimate = (await estimateResponse.json()) as CostEstimate;
      setEstimate(nextEstimate);
      if (!window.confirm(t("agentGenerateConfirm", { credits: nextEstimate.credits }))) {
        return;
      }
      await submitGeneration(selectedShot);
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

  async function uploadVisionAsset(file: File): Promise<Asset | null> {
    if (!project || isWorking) return null;
    setIsWorking(true);
    setActionError(null);
    const body = new FormData();
    body.append("file", file);
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
    if (isWorking) return null;
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
      setCharacterReferenceAssetId(asset.id);
      setCharacterGenerationMode("reference");
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
      const referenceId =
        characterReferenceAssetId ?? referenceAssets[0]?.id ?? null;
      if (characterGenerationMode === "reference" && !referenceId) {
        throw new Error("Select or upload a reference image first.");
      }
      const response = await fetch(
        `${API_BASE_URL}/characters/${character.id}/generate`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approved: true,
            generation_mode:
              characterGenerationMode === "reference"
                ? "image_to_image"
                : "text_to_image",
            reference_asset_id:
              characterGenerationMode === "reference" ? referenceId : null,
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
    if (!project || isExporting || isSharing) return;
    const targets =
      exportedAssets.length > 0 ? exportedAssets : await exportProject();
    const target = targets[0];
    if (target) {
      await shareExport(target);
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
  const canvasTitle =
    selectedCanvas.kind === "settings"
      ? copy.settings
        : selectedCanvas.kind === "document"
          ? copy[selectedCanvas.document]
          : selectedCanvas.kind === "character"
            ? selectedCharacter?.name ?? copy.character
          : selectedCanvas.kind === "shot"
            ? canvasShot?.description ?? copy.shot
            : selectedAsset?.filename ?? copy.vision;
  const activeDocumentMode =
    selectedCanvas.kind === "document" ? selectedCanvas.document : null;
  const characterCanvasSection =
    selectedCanvas.kind === "character" ? selectedCanvas.section : null;
  const settingPairs = project ? productionSettingPairs(project.brief) : [];
  const settingAnswers = messages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => message.role === "user")
    .map(({ message, index }) => ({
      answer: message.content,
      question:
        [...messages.slice(0, index)]
          .reverse()
          .find((candidate) => candidate.role === "assistant")?.content ??
        copy.directorInput,
    }));

  function selectShot(shot: Shot) {
    setSelectedShotId(shot.id);
    setSelectedCanvas({ kind: "shot", shotId: shot.id });
    setEstimate(null);
    setShotGenerationMode("direct");
    setReferenceAssetId(referenceAssets[0]?.id ?? null);
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
              onSelect={(selection) => {
                setSelectedCanvas(selection);
                if (selection.kind === "shot") setSelectedShotId(selection.shotId);
                if (selection.kind === "character") {
                  setCharacterEstimate(null);
                  setCharacterGenerationMode("direct");
                  setCharacterReferenceAssetId(referenceAssets[0]?.id ?? null);
                }
                setMobilePanel("canvas");
              }}
              onToggleCollapsed={() =>
                setAssetsPanelCollapsed((current) => !current)
              }
              selected={selectedCanvas}
              storyboard={storyboard}
            />
          </div>

          <section
            className={cn(
              "min-h-0 min-w-0 flex-col bg-[#0b0a08]/[0.7] backdrop-blur-lg xl:flex",
              mobilePanel === "canvas" ? "flex" : "hidden",
            )}
          >
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0b0a08]/[0.96] px-5">
              <span className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-white/82">
                {selectedCanvas.kind === "asset" &&
                selectedAsset?.content_type.startsWith("video/") ? (
                  <Video className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                ) : selectedCanvas.kind === "asset" ? (
                  <Image className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                ) : selectedCanvas.kind === "shot" ? (
                  <Clapperboard className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                ) : selectedCanvas.kind === "character" ? (
                  <Image className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                )}
                <span className="truncate">{canvasTitle}</span>
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <div
                  className="hidden w-48 shrink-0 sm:block"
                  title={
                    projectProgress
                      ? `${projectProgress.completed_shots}/${projectProgress.total_shots} Shots complete`
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-white/42">
                      {locale.startsWith("zh") ? "制作进度" : "Production progress"}
                    </span>
                    <span className="text-[#8fdcff]">
                      {projectProgress?.percent ?? 0}%
                    </span>
                  </div>
                  <div
                    aria-label={
                      locale.startsWith("zh") ? "制作进度" : "Production progress"
                    }
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={projectProgress?.percent ?? 0}
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
                    role="progressbar"
                  >
                    <div
                      className="h-full rounded-full bg-[#1677ff] transition-[width] duration-500"
                      style={{ width: `${projectProgress?.percent ?? 0}%` }}
                    />
                  </div>
                </div>
                <button
                  className="flex items-center gap-1.5 rounded-lg bg-[#1677ff] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-35"
                  disabled={!canExport || isExporting || isSharing}
                  onClick={() => void shareProject()}
                  type="button"
                >
                  <Share2 className="h-4 w-4" />
                  {isExporting || isSharing ? copy.sharing : copy.share}
                </button>
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
                  <p className="mt-7 whitespace-pre-wrap text-[16px] leading-8 text-white/52">
                    {creativeBrief(project.brief)}
                  </p>
                  <section className="mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                    <h3 className="text-[15px] font-semibold text-white/76">
                      {copy.settingAttributes}
                    </h3>
                    <div className="mt-4 divide-y divide-white/[0.06]">
                      {settingPairs.map((pair) => (
                        <div
                          className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 py-2.5 text-[13px]"
                          key={`${pair.label}-${pair.value}`}
                        >
                          <span className="text-white/32">{pair.label}</span>
                          <span className="text-white/68">{pair.value}</span>
                        </div>
                      ))}
                      {settingAnswers.map((pair, index) => (
                        <div
                          className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 py-3 text-[13px]"
                          key={`${pair.question}-${index}`}
                        >
                          <span className="whitespace-pre-wrap leading-7 text-white/38">
                            {pair.question}
                          </span>
                          <span className="whitespace-pre-wrap leading-7 text-white/68">
                            {pair.answer}
                          </span>
                        </div>
                      ))}
                    </div>
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
                        <button
                          className="group w-full rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5 text-left transition hover:border-[#1677ff]/25 hover:bg-[#1677ff]/[0.025]"
                          key={shot.id}
                          onClick={() => selectShot(shot)}
                          type="button"
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
                            </span>
                          </div>
                          <h3 className="mt-3 text-[17px] font-medium leading-8 text-white/82">
                            {shot.description}
                          </h3>
                          {activeDocumentMode !== "outline" ? (
                            <p className="mt-3 line-clamp-3 text-[14px] leading-7 text-white/38">
                              {locale.startsWith("zh") && shot.prompt_zh
                                ? shot.prompt_zh
                                : shot.prompt_en}
                            </p>
                          ) : null}
                        </button>
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
                  <div className="border-b border-white/[0.07] pb-6">
                    <p className="text-[12px] font-semibold text-[#6eb8ff]">
                      {copy.character}
                    </p>
                    <h2 className="mt-3 font-display text-3xl leading-tight text-white/90">
                      {selectedCharacter.name}
                    </h2>
                  </div>
                  <div
                    className={cn(
                      "mt-5 grid gap-5",
                      characterCanvasSection === "generation" &&
                        "2xl:grid-cols-[minmax(0,1fr)_300px]",
                    )}
                  >
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-white/[0.07] p-5">
                        <p className="text-[12px] font-semibold text-white/28">
                          {copy.description}
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-8 text-white/58">
                          {selectedCharacter.description}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/[0.07] p-5">
                        <p className="text-[12px] font-semibold text-white/28">
                          Prompt
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-8 text-white/52">
                          {locale.startsWith("zh") &&
                          selectedCharacter.prompt_zh
                            ? selectedCharacter.prompt_zh
                            : selectedCharacter.prompt_en}
                        </p>
                      </div>
                      {generatedCharacterAsset ? (
                        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30">
                          <img
                            alt={selectedCharacter.name}
                            className="max-h-[56vh] w-full object-contain"
                            src={mediaUrl(generatedCharacterAsset.content_url)}
                          />
                        </div>
                      ) : null}
                    </div>

                    {characterCanvasSection === "generation" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/[0.09] px-2 py-2 text-center text-[12px] text-white/55 hover:border-[#1677ff]/35 hover:text-white">
                            <Upload className="h-3.5 w-3.5 text-[#4facff]" />
                            {copy.upload}
                            <input
                              accept="image/*"
                              aria-label={`${copy.upload} ${selectedCharacter.name}`}
                              className="sr-only"
                              disabled={isWorking}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.currentTarget.value = "";
                                if (file) {
                                  void uploadCharacterAsset(
                                    selectedCharacter,
                                    file,
                                  );
                                }
                              }}
                              type="file"
                            />
                          </label>
                          <button
                            className={cn(
                              "rounded-xl border px-2 py-2 text-[12px] transition",
                              characterGenerationMode === "reference"
                                ? "border-[#1677ff]/35 bg-[#1677ff]/[0.1] text-[#8fdcff]"
                                : "border-white/[0.09] text-white/55 hover:text-white",
                            )}
                            disabled={referenceAssets.length === 0}
                            onClick={() =>
                              setCharacterGenerationMode("reference")
                            }
                            type="button"
                          >
                            {copy.reference}
                          </button>
                          <button
                            className={cn(
                              "rounded-xl border px-2 py-2 text-[12px] transition",
                              characterGenerationMode === "direct"
                                ? "border-[#1677ff]/35 bg-[#1677ff]/[0.1] text-[#8fdcff]"
                                : "border-white/[0.09] text-white/55 hover:text-white",
                            )}
                            onClick={() => setCharacterGenerationMode("direct")}
                            type="button"
                          >
                            {copy.direct}
                          </button>
                        </div>
                        {characterGenerationMode === "reference" ? (
                          <label className="block text-[12px] text-white/36">
                            <span>{copy.referenceImage}</span>
                            <select
                              className="mt-2 w-full rounded-xl border border-white/[0.09] bg-[#11100d] px-3 py-2 text-white/72 outline-none"
                              onChange={(event) =>
                                setCharacterReferenceAssetId(
                                  event.target.value || null,
                                )
                              }
                              value={
                                characterReferenceAssetId ??
                                referenceAssets[0]?.id ??
                                ""
                              }
                            >
                              {referenceAssets.map((asset) => (
                                <option key={asset.id} value={asset.id}>
                                  {asset.filename}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        {characterEstimate ? (
                          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#1677ff]/[0.08] px-3 py-2 text-[11px] text-[#a8ddff]">
                            <span>
                              {t("estimatedCredits")}: {characterEstimate.credits}
                            </span>
                            <span className="rounded-md border border-[#4facff]/25 px-2 py-0.5">
                              {characterEstimate.provider}
                            </span>
                          </div>
                        ) : null}
                        {generatedCharacterAsset ? (
                          <a
                            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.055] px-4 py-2.5 text-[12px] text-emerald-200/78 hover:border-emerald-300/40"
                            download={generatedCharacterAsset.filename}
                            href={mediaUrl(generatedCharacterAsset.content_url)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            {copy.downloadResult}
                          </a>
                        ) : null}
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-4 py-2.5 text-[12px] text-white/58 hover:border-white/20 hover:text-white disabled:opacity-35"
                          disabled={isWorking}
                          onClick={() =>
                            void estimateCharacter(selectedCharacter)
                          }
                          type="button"
                        >
                          <Gem className="h-3.5 w-3.5" />
                          {copy.estimate}
                        </button>
                        {workflow?.status !== "approved" ? (
                          <p className="rounded-xl border border-[#1677ff]/20 bg-[#1677ff]/[0.055] px-3 py-2 text-[12px] leading-6 text-[#a8ddff]">
                            {copy.approvalRequired}
                          </p>
                        ) : null}
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1677ff] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-35"
                          disabled={
                            isWorking ||
                            workflow?.status !== "approved" ||
                            (characterGenerationMode === "reference" &&
                              referenceAssets.length === 0)
                          }
                          onClick={() =>
                            void generateCharacter(selectedCharacter)
                          }
                          type="button"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {isWorking
                            ? copy.generating
                            : characterGenerationMode === "reference"
                              ? copy.generateWithReference
                              : copy.generateDirect}
                        </button>
                      </div>
                    ) : null}
                  </div>
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
                          {canvasShot.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-md border border-white/[0.1] bg-black/20 px-2.5 py-1 text-[12px] text-white/52">
                            {canvasShot.duration_seconds}s
                          </span>
                          <span className="rounded-md border border-white/[0.1] bg-black/20 px-2.5 py-1 text-[12px] text-white/52">
                            {canvasShot.aspect_ratio}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/[0.07] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[12px] font-semibold text-[#6eb8ff]">
                          {copy.description}
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-[16px] leading-8 text-white/72">
                          {canvasShot.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <span className="rounded-md border border-white/[0.08] px-2.5 py-1 text-[12px] text-white/40">
                          {canvasShot.duration_seconds}s
                        </span>
                        <span className="rounded-md border border-white/[0.08] px-2.5 py-1 text-[12px] text-white/40">
                          {canvasShot.aspect_ratio}
                        </span>
                      </div>
                    </div>
                    <div className="mt-5 border-t border-white/[0.06] pt-5">
                      <p className="text-[12px] font-semibold text-white/28">
                        Prompt
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-8 text-white/52">
                        {locale.startsWith("zh") && canvasShot.prompt_zh
                          ? canvasShot.prompt_zh
                          : canvasShot.prompt_en}
                      </p>
                    </div>
                    <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-5">
                      <div className="grid grid-cols-3 gap-2">
                        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/[0.09] px-2 py-2 text-center text-[12px] text-white/55 hover:border-[#1677ff]/35 hover:text-white">
                          <Upload className="h-3.5 w-3.5 text-[#4facff]" />
                          {copy.upload}
                          <input
                            accept="image/*"
                            aria-label={copy.upload}
                            className="sr-only"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.currentTarget.value = "";
                              if (!file) return;
                              void uploadVisionAsset(file).then((asset) => {
                                if (!asset) return;
                                setReferenceAssetId(asset.id);
                                setShotGenerationMode("reference");
                              });
                            }}
                            type="file"
                          />
                        </label>
                        <button
                          className={cn(
                            "rounded-xl border px-2 py-2 text-[12px] transition",
                            shotGenerationMode === "reference"
                              ? "border-[#1677ff]/35 bg-[#1677ff]/[0.1] text-[#8fdcff]"
                              : "border-white/[0.09] text-white/55 hover:text-white",
                          )}
                          disabled={referenceAssets.length === 0}
                          onClick={() => setShotGenerationMode("reference")}
                          type="button"
                        >
                          {copy.reference}
                        </button>
                        <button
                          className={cn(
                            "rounded-xl border px-2 py-2 text-[12px] transition",
                            shotGenerationMode === "direct"
                              ? "border-[#1677ff]/35 bg-[#1677ff]/[0.1] text-[#8fdcff]"
                              : "border-white/[0.09] text-white/55 hover:text-white",
                          )}
                          onClick={() => setShotGenerationMode("direct")}
                          type="button"
                        >
                          {copy.direct}
                        </button>
                      </div>
                      {shotGenerationMode === "reference" ? (
                        <label className="block text-[12px] text-white/36">
                          <span>{copy.chooseReference}</span>
                          <select
                            className="mt-2 w-full rounded-xl border border-white/[0.09] bg-[#11100d] px-3 py-2 text-white/72 outline-none"
                            onChange={(event) =>
                              setReferenceAssetId(event.target.value || null)
                            }
                            value={
                              referenceAssetId ?? referenceAssets[0]?.id ?? ""
                            }
                          >
                            {referenceAssets.map((asset) => (
                              <option key={asset.id} value={asset.id}>
                                {asset.filename}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-white/[0.07] p-3">
                          <p className="text-[10px] text-white/24">{copy.ratio}</p>
                          <p className="mt-1 text-[12px] text-white/65">
                            {canvasShot.aspect_ratio}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/[0.07] p-3">
                          <p className="text-[10px] text-white/24">{copy.duration}</p>
                          <p className="mt-1 text-[12px] text-white/65">
                            {canvasShot.duration_seconds}s
                          </p>
                        </div>
                      </div>
                      {estimate ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#1677ff]/[0.08] px-3 py-2 text-[11px] text-[#a8ddff]">
                          <span>
                            {t("estimatedCredits")}: {estimate.credits}
                          </span>
                          <span className="rounded-md border border-[#4facff]/25 px-2 py-0.5">
                            {estimate.provider}
                          </span>
                        </div>
                      ) : null}
                      {generatedShotAsset ? (
                        <a
                          className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.055] px-4 py-2.5 text-[12px] text-emerald-200/78 hover:border-emerald-300/40"
                          download={generatedShotAsset.filename}
                          href={mediaUrl(generatedShotAsset.content_url)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          {copy.downloadResult}
                        </a>
                      ) : null}
                      <button
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-4 py-2.5 text-[12px] text-white/58 hover:border-white/20 hover:text-white disabled:opacity-35"
                        disabled={isWorking}
                        onClick={() => void estimateShot()}
                        type="button"
                      >
                        <Gem className="h-3.5 w-3.5" />
                        {copy.estimate}
                      </button>
                      {workflow?.status !== "approved" ? (
                        <p className="rounded-xl border border-[#1677ff]/20 bg-[#1677ff]/[0.055] px-3 py-2 text-[12px] leading-6 text-[#a8ddff]">
                          {copy.approvalRequired}
                        </p>
                      ) : null}
                      <button
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1677ff] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-35"
                        disabled={
                          isWorking ||
                          canvasShot.status === "completed" ||
                          workflow?.status !== "approved" ||
                          (shotGenerationMode === "reference" &&
                            referenceAssets.length === 0)
                        }
                        onClick={() => void generateShot()}
                        type="button"
                      >
                        <Clapperboard className="h-3.5 w-3.5" />
                        {isWorking
                          ? copy.generating
                          : canvasShot.status === "completed"
                            ? t("completed")
                            : shotGenerationMode === "reference"
                              ? copy.generateWithReference
                              : copy.generateDirect}
                      </button>
                    </div>
                  </div>
                  {generatedShotAsset ? (
                    <a
                      className="mt-5 flex w-fit items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.055] px-4 py-2.5 text-[13px] text-emerald-200/78"
                      download={generatedShotAsset.filename}
                      href={mediaUrl(generatedShotAsset.content_url)}
                    >
                      <Download className="h-4 w-4" />
                      {copy.downloadResult}
                    </a>
                  ) : null}
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
                      <h2 className="text-[15px] font-medium">{selectedAsset.filename}</h2>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[12px] text-white/38">
                          {selectedAsset.content_type}
                        </span>
                        <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[12px] text-white/38">
                          {(selectedAsset.byte_size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                    </div>
                    <a
                      className="flex items-center gap-2 rounded-lg border border-white/[0.09] px-3 py-2 text-[11px] text-white/55 hover:text-white"
                      download={selectedAsset.filename}
                      href={mediaUrl(selectedAsset.content_url)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {copy.download}
                    </a>
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
              "min-h-0 flex-col border-l border-white/[0.07] bg-[#0d0c0a]/[0.76] backdrop-blur-lg xl:flex",
              mobilePanel === "agent" ? "flex" : "hidden",
            )}
          >
            {agentPanelCollapsed ? (
              <>
                <div className="grid h-14 shrink-0 place-items-center border-b border-white/[0.07] bg-[#0d0c0a]/[0.96]">
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
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0d0c0a]/[0.96] px-4">
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
            {workflow?.status === "awaiting_approval" && workflow.stage !== "ready" ? (
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
                  onChange={(event) => setMessageDraft(event.target.value)}
                  placeholder={copy.chatPlaceholder}
                  value={messageDraft}
                />
                <span className="flex items-center justify-end">
                  <button
                    aria-label={copy.send}
                    className="grid size-8 place-items-center rounded-xl bg-[#1677ff] text-white disabled:opacity-35"
                    disabled={!messageDraft.trim() || isWorking}
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
            { id: "agent" as const, label: t("agent"), icon: MessageCircleMore },
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
            <p className="text-[12px] text-[#5cc8ff]">
              VideoAgent
            </p>
            <h2 id="generation-error-title" className="mt-3 text-xl font-semibold">
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

    </main>
  );
}
