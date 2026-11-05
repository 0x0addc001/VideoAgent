"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clapperboard,
  Download,
  FileText,
  Film,
  Flame,
  Folder,
  FolderOpen,
  Gem,
  GripVertical,
  Image,
  Layers3,
  MessageCircleMore,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  ScanSearch,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  Video,
  WandSparkles,
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

type Storyboard = {
  id: string;
  project_id: string;
  version: number;
  shots: Shot[];
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
  | { kind: "brief" }
  | { kind: "storyboard" }
  | { kind: "document"; document: "outline" | "script" }
  | { kind: "shot"; shotId: string }
  | { kind: "asset"; assetId: string };

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

type EvaluationMetric = {
  key: "consistency" | "coverage" | "clarity" | "pacing";
  score: number;
};

type EvaluationSuggestion = {
  code:
    | "ADD_SHOTS"
    | "UNIFY_ASPECT_RATIO"
    | "IMPROVE_PROMPTS"
    | "BALANCE_PACING"
    | "READY";
  severity: "high" | "medium" | "low";
};

type Evaluation = {
  overall_score: number;
  metrics: EvaluationMetric[];
  suggestions: EvaluationSuggestion[];
};

const API_BASE_URL = resolveApiBaseUrl();
const PRODUCTION_SETTINGS_MARKER = /\n+\s*Production settings:/i;

function creativeBrief(brief: string) {
  return brief.split(PRODUCTION_SETTINGS_MARKER, 1)[0]?.trim() || brief.trim();
}

function workspaceCopy(locale: string) {
  const chinese = locale.startsWith("zh");
  return chinese
    ? {
        projects: "Projects",
        recent: "Recents",
        conversations: "全部对话",
        newFolder: "新建项目",
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
        docs: "文档",
        assets: "资产",
        noAssets: "当前对话还没有资产。",
        brief: "整体设定",
        storyboard: "故事板",
        script: "剧本",
        outline: "分集与分镜大纲",
        media: "媒体",
        uploads: "上传素材",
        generated: "生成素材",
        exported: "成片与导出",
        stage: "审批阶段",
        stageConcept: "整体设定",
        stageOutline: "分集/分镜大纲",
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
        review: "即时评估",
        export: "导出成片",
        exportReady: "成片已就绪",
        download: "下载",
        share: "分享",
        shot: "镜头",
        duration: "时长",
        ratio: "画面比例",
        estimate: "估算积分",
        generate: "生成镜头",
        generating: "生成中……",
        upload: "上传素材",
        uploading: "上传中……",
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
        docs: "Docs",
        assets: "Assets",
        noAssets: "No assets in this conversation yet.",
        brief: "Creative direction",
        storyboard: "Storyboard",
        script: "Script",
        outline: "Episode & shot outline",
        media: "Media",
        uploads: "Uploads",
        generated: "Generated",
        exported: "Exports",
        stage: "Approval stage",
        stageConcept: "Overall direction",
        stageOutline: "Episode outline",
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
        review: "Review",
        export: "Export film",
        exportReady: "Export ready",
        download: "Download",
        share: "Share",
        shot: "Shot",
        duration: "Duration",
        ratio: "Aspect ratio",
        estimate: "Estimate credits",
        generate: "Generate shot",
        generating: "Generating…",
        upload: "Upload asset",
        uploading: "Uploading…",
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
        <div className="mt-4 grid gap-2 border-t border-white/10 pt-4">
          <span
            className="grid size-10 place-items-center rounded-xl text-white/35"
            title={copy.projects}
          >
            <Folder className="h-[18px] w-[18px]" />
          </span>
          <span
            className="grid size-10 place-items-center rounded-xl text-white/35"
            title={copy.recent}
          >
            <MessageSquareText className="h-[18px] w-[18px]" />
          </span>
        </div>
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

  const recentThreads = workspace.recents;
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
        href={`/${locale}/?start=1#conversation/${thread.id}`}
        key={thread.id}
        onDragStart={(event) => onBeginDrag(event, thread.id)}
      >
        <span className="flex items-start gap-2.5">
          <GripVertical
            className={cn(
              "mt-0.5 h-3.5 w-3.5 shrink-0",
              thread.id === activeProjectId
                ? "text-[#4facff]"
                : "text-white/15 group-hover:text-white/35",
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <strong
                className={cn(
                  "truncate text-[18px] font-medium",
                  thread.id === activeProjectId
                    ? "text-[#8fdcff]"
                    : "text-white/78",
                )}
              >
                {thread.title}
              </strong>
            </span>
            <span className="mt-1 line-clamp-1 text-[12px] leading-5 text-white/32">
              {thread.preview || thread.brief}
            </span>
          </span>
        </span>
      </a>
    );
  }

  return (
    <aside className="flex w-[208px] min-h-0 shrink-0 flex-col border-white/[0.07] bg-[#0d0c0a] xl:my-5 xl:ml-5 xl:rounded-[26px] xl:border">
      <div className="flex h-14 items-center px-4">
        <Link className="flex items-center gap-2.5 text-[18px] font-semibold" href="/">
          <span className="grid size-8 place-items-center rounded-lg bg-[#1677ff] text-white">
            <PlayIcon />
          </span>
          VideoAgent
        </Link>
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

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-3 py-3">
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
            className="grid size-7 place-items-center rounded-lg text-white/35 hover:bg-white/[0.06] hover:text-white"
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
                    {open ? (
                      <FolderOpen className="h-4 w-4 text-[#6eb8ff]" />
                    ) : (
                      <Folder className="h-4 w-4 text-[#6eb8ff]" />
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
          </div>
          {historySections.recents ? (
            <div className="mt-2 space-y-1">
              {recentThreads.map(threadRow)}
            </div>
          ) : null}
        </div>
      </div>
      <div className="border-t border-white/10 p-3">
        <button
          aria-label={copy.collapse}
          className="grid h-10 w-full place-items-center rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"
          onClick={onToggleCollapsed}
          type="button"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
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
  copy: ReturnType<typeof workspaceCopy>;
  isWorking: boolean;
  selected: CanvasSelection;
  storyboard: Storyboard | null;
  workflow: WorkflowState | null;
  onSelect: (selection: CanvasSelection) => void;
  onUpload: (file: File) => void;
};

function AssetsTree({
  assets,
  copy,
  isWorking,
  selected,
  storyboard,
  workflow,
  onSelect,
  onUpload,
}: AssetsTreeProps) {
  const [sections, setSections] = useState({
    story: true,
    shots: true,
    media: true,
    exports: true,
  });
  const selectedClass =
    "border-[#1677ff]/30 bg-[#1677ff]/[0.08] text-white";
  const idleClass =
    "border-transparent text-white/50 hover:border-white/[0.07] hover:bg-white/[0.03] hover:text-white/75";

  function sectionButton(
    key: keyof typeof sections,
    label: string,
    icon: ReactNode,
  ) {
    return (
      <button
        className="flex w-full items-center gap-2 px-2 py-2 text-left text-[12px] font-semibold text-white/30 hover:text-white/55"
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
        {icon}
        {label}
      </button>
    );
  }

  return (
    <aside className="flex w-[232px] min-h-0 shrink-0 flex-col border-r border-white/[0.07] bg-[#0b0a08]">
      <div className="flex h-14 items-center justify-between border-b border-white/[0.07] px-4">
        <span className="flex items-center gap-2 text-[12px] font-medium text-white/62">
          <Layers3 className="h-4 w-4 text-[#6eb8ff]" />
          {copy.assets}
        </span>
        <label className="grid size-7 cursor-pointer place-items-center rounded-lg text-white/35 hover:bg-white/[0.06] hover:text-white">
          <Upload className="h-3.5 w-3.5" />
          <input
            accept="image/*,video/*,audio/*"
            aria-label={copy.upload}
            className="sr-only"
            disabled={isWorking}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (file) onUpload(file);
            }}
            type="file"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition",
            selected.kind === "brief" ? selectedClass : idleClass,
          )}
          onClick={() => onSelect({ kind: "brief" })}
          type="button"
        >
          <FileText className="h-3.5 w-3.5" />
          {copy.brief}
        </button>
        <button
          className={cn(
            "mt-1 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition",
            selected.kind === "storyboard" ? selectedClass : idleClass,
          )}
          onClick={() => onSelect({ kind: "storyboard" })}
          type="button"
        >
          <Clapperboard className="h-3.5 w-3.5" />
          {copy.storyboard}
        </button>

        <div className="mt-3">
          {sectionButton("story", copy.script, <FileText className="h-3 w-3" />)}
          {sections.story ? (
            <div className="space-y-1 pl-3">
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
                <CircleCheck
                  className={cn(
                    "h-3.5 w-3.5",
                    workflow &&
                      ["outline", "script", "ready"].includes(workflow.stage)
                      ? "text-emerald-300"
                      : "text-white/20",
                  )}
                />
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
                <CircleCheck
                  className={cn(
                    "h-3.5 w-3.5",
                    workflow && ["script", "ready"].includes(workflow.stage)
                      ? "text-emerald-300"
                      : "text-white/20",
                  )}
                />
                {copy.script}
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-3">
          {sectionButton("shots", copy.shot, <Film className="h-3 w-3" />)}
          {sections.shots ? (
            <div className="space-y-1 pl-3">
              {storyboard?.shots.map((shot) => (
                <button
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-[12px] transition",
                    selected.kind === "shot" && selected.shotId === shot.id
                      ? selectedClass
                      : idleClass,
                  )}
                  key={shot.id}
                  onClick={() => onSelect({ kind: "shot", shotId: shot.id })}
                  type="button"
                >
                  <span className="mt-0.5 text-[10px] text-[#6eb8ff]">
                    {String(shot.index + 1).padStart(2, "0")}
                  </span>
                  <span className="line-clamp-2">{shot.description}</span>
                </button>
              ))}
              {!storyboard ? (
                <p className="px-3 py-2 text-[11px] text-white/20">{copy.noAssets}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-3">
          {sectionButton("media", copy.media, <Image className="h-3 w-3" />)}
          {sections.media ? (
            <div className="space-y-1 pl-3">
              {assets
                .filter((asset) => !["export", "cover"].includes(asset.kind))
                .map((asset) => (
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
                    {asset.content_type.startsWith("video/") ? (
                      <Video className="h-3.5 w-3.5" />
                    ) : (
                      <Image className="h-3.5 w-3.5" />
                    )}
                    <span className="truncate">{asset.filename}</span>
                  </button>
                ))}
            </div>
          ) : null}
        </div>

        <div className="mt-3">
          {sectionButton("exports", copy.exported, <Download className="h-3 w-3" />)}
          {sections.exports ? (
            <div className="space-y-1 pl-3">
              {assets
                .filter((asset) => ["export", "cover"].includes(asset.kind))
                .map((asset) => (
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
                    <Film className="h-3.5 w-3.5" />
                    <span className="truncate">{asset.filename}</span>
                  </button>
                ))}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const t = useTranslations("workspace");
  const locale = useLocale();
  const [project, setProject] = useState<Project | null>(null);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generationErrorOpen, setGenerationErrorOpen] = useState(false);
  const [generationErrorMessage, setGenerationErrorMessage] = useState<string | null>(
    null,
  );
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [exportedAssets, setExportedAssets] = useState<Asset[]>([]);
  const [exportCover, setExportCover] = useState<Asset | null>(null);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
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
    kind: "brief",
  });
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<WorkspaceFolder | null>(null);
  const [draggingThreadId, setDraggingThreadId] = useState<string | null>(null);
  const [customDecisionOpen, setCustomDecisionOpen] = useState(false);
  const [customDecision, setCustomDecision] = useState("");
  const [pendingDecision, setPendingDecision] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          setSelectedCanvas({ kind: "storyboard" });
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
        const shouldStart =
          new URLSearchParams(window.location.search).get("start") === "1" &&
          nextMessages.length === 0 &&
          Boolean(creativeBrief(nextProject.brief));
        if (shouldStart) {
          const turnResponse = await fetch(
            `${API_BASE_URL}/projects/${projectId}/messages`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: creativeBrief(nextProject.brief) }),
            },
          );
          if (turnResponse.ok) {
            const turn = (await turnResponse.json()) as AgentTurn;
            setMessages([turn.user_message, turn.assistant_message]);
            setStoryboard(turn.storyboard);
            setSelectedShotId(turn.storyboard.shots[0]?.id ?? null);
            setSelectedCanvas({ kind: "storyboard" });
            if (turn.workflow) setWorkflow(turn.workflow);
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
  }, [messages]);

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

  async function refreshWorkspace() {
    const response = await fetch(`${API_BASE_URL}/workspace`, {
      credentials: "include",
    }).catch(() => null);
    if (response?.ok) {
      setWorkspace((await response.json()) as WorkspaceData);
    }
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
          body: JSON.stringify({ choice, instruction }),
        },
      );
      if (!response.ok) throw new Error("workflow-decision-failed");
      const decision = (await response.json()) as WorkflowDecisionResponse;
      setMessages((current) => [
        ...current,
        decision.user_message,
        decision.assistant_message,
      ]);
      setStoryboard(decision.storyboard);
      setSelectedShotId(decision.storyboard.shots[0]?.id ?? null);
      setWorkflow(decision.workflow);
      setSelectedCanvas({ kind: "storyboard" });
      setCustomDecision("");
      setCustomDecisionOpen(false);
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
    setIsWorking(true);
    setActionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("agent-message-failed");
      const turn = (await response.json()) as AgentTurn;
      setMessages((current) => [...current, turn.user_message, turn.assistant_message]);
      setStoryboard(turn.storyboard);
      if (turn.workflow) setWorkflow(turn.workflow);
      setSelectedShotId(turn.storyboard.shots[0]?.id ?? null);
      setSelectedCanvas({ kind: "storyboard" });
      setEstimate(null);
      setMessageDraft("");
      setMobilePanel("canvas");
      await refreshWorkspace();
    } catch {
      setActionError(t("agentIntro"));
    } finally {
      setIsWorking(false);
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

  async function moveSelectedShot(direction: -1 | 1) {
    if (!project || !storyboard || !selectedShot || isReordering) return;
    const currentIndex = storyboard.shots.findIndex((shot) => shot.id === selectedShot.id);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= storyboard.shots.length) return;
    const reordered = [...storyboard.shots];
    [reordered[currentIndex], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[currentIndex],
    ];

    setIsReordering(true);
    setActionError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${project.id}/storyboard/order`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shot_ids: reordered.map((shot) => shot.id) }),
        },
      );
      if (!response.ok) throw new Error("reorder-failed");
      setStoryboard((await response.json()) as Storyboard);
      setSelectedShotId(selectedShot.id);
    } catch {
      setActionError(t("reorderError"));
    } finally {
      setIsReordering(false);
    }
  }

  async function submitGeneration(shot: Shot) {
    const response = await fetch(`${API_BASE_URL}/shots/${shot.id}/generate`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ approved: true }),
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
      await submitGeneration(selectedShot);
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
      setMessages((current) => [
        ...current,
        {
          id: `generation-${crypto.randomUUID()}`,
          role: "assistant",
          content: t("agentGenerationStarted", {
            shot: selectedShot.description,
          }),
          created_at: new Date().toISOString(),
        },
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

  async function evaluateProject() {
    if (!project || isReviewing) return;
    setReviewOpen(true);
    setEvaluation(null);
    setIsReviewing(true);
    setActionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}/evaluate`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("evaluation-failed");
      setEvaluation((await response.json()) as Evaluation);
    } catch {
      setActionError(t("reviewError"));
      setReviewOpen(false);
    } finally {
      setIsReviewing(false);
    }
  }

  function mediaUrl(path: string) {
    return new URL(path, API_BASE_URL).toString();
  }

  async function uploadReference(file: File) {
    if (!project || isWorking) return;
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
    } catch {
      setActionError(t("uploadError"));
    } finally {
      setIsWorking(false);
    }
  }

  async function exportProject() {
    if (!project || isExporting) return;
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
    } catch {
      setActionError(t("exportError"));
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

  const metricLabels = {
    consistency: t("metricConsistency"),
    coverage: t("metricCoverage"),
    clarity: t("metricClarity"),
    pacing: t("metricPacing"),
  };

  const suggestionLabels = {
    ADD_SHOTS: t("suggestionAddShots"),
    UNIFY_ASPECT_RATIO: t("suggestionUnifyRatio"),
    IMPROVE_PROMPTS: t("suggestionImprovePrompts"),
    BALANCE_PACING: t("suggestionBalancePacing"),
    READY: t("suggestionReady"),
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
  const stageLabels: Record<WorkflowStage, string> = {
    concept: copy.stageConcept,
    outline: copy.stageOutline,
    script: copy.stageScript,
    ready: copy.stageReady,
  };
  const stageIndex = workflow
    ? ["concept", "outline", "script", "ready"].indexOf(workflow.stage)
    : 0;
  const canvasTitle =
    selectedCanvas.kind === "brief"
      ? copy.brief
      : selectedCanvas.kind === "storyboard"
        ? copy.storyboard
        : selectedCanvas.kind === "document"
          ? copy[selectedCanvas.document]
          : selectedCanvas.kind === "shot"
            ? canvasShot?.description ?? copy.shot
            : selectedAsset?.filename ?? copy.media;

  function selectShot(shot: Shot) {
    setSelectedShotId(shot.id);
    setSelectedCanvas({ kind: "shot", shotId: shot.id });
    setEstimate(null);
    setMobilePanel("canvas");
  }

  return (
    <main className="project-workspace-shell flex h-screen min-h-[680px] overflow-hidden bg-[#080807] text-white">
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

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0b0a08] px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              aria-label={copy.expand}
              className="grid size-8 place-items-center rounded-lg text-white/45 hover:bg-white/[0.06] hover:text-white xl:hidden"
              onClick={() => setMobilePanel("history")}
              type="button"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div
                aria-level={1}
                className="truncate text-[14px] font-semibold"
                role="heading"
              >
                {project.title}
              </div>
              <p className="mt-0.5 text-[11px] text-white/25">
                {storyboard ? t("shotCount", { count: storyboard.shots.length }) : t("planFirst")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="hidden items-center gap-1.5 rounded-lg border border-white/[0.09] px-3 py-2 text-[11px] text-white/48 hover:border-white/20 hover:text-white sm:flex"
              disabled={!storyboard || isReviewing}
              onClick={() => void evaluateProject()}
              type="button"
            >
              <ScanSearch className="h-3.5 w-3.5" />
              {copy.review}
              {evaluation ? ` ${evaluation.overall_score}` : ""}
            </button>
            <button
              className="flex items-center gap-1.5 rounded-lg bg-[#1677ff] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-35"
              disabled={!canExport || isExporting}
              onClick={() => void exportProject()}
              type="button"
            >
              <Download className="h-3.5 w-3.5" />
              {copy.export}
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[232px_minmax(0,1fr)_390px]">
          <div
            className={cn(
              "min-h-0 lg:flex",
              mobilePanel === "assets" ? "flex" : "hidden",
            )}
          >
            <AssetsTree
              assets={assets}
              copy={copy}
              isWorking={isWorking}
              onSelect={(selection) => {
                setSelectedCanvas(selection);
                if (selection.kind === "shot") setSelectedShotId(selection.shotId);
                setMobilePanel("canvas");
              }}
              onUpload={(file) => void uploadReference(file)}
              selected={selectedCanvas}
              storyboard={storyboard}
              workflow={workflow}
            />
          </div>

          <section
            className={cn(
              "min-h-0 min-w-0 flex-col bg-[#0b0a08] lg:flex",
              mobilePanel === "canvas" ? "flex" : "hidden",
            )}
          >
            <div className="flex h-14 shrink-0 items-center border-b border-white/[0.07] px-5">
              <span className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-white/58">
                {selectedCanvas.kind === "asset" &&
                selectedAsset?.content_type.startsWith("video/") ? (
                  <Video className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                ) : selectedCanvas.kind === "asset" ? (
                  <Image className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                ) : selectedCanvas.kind === "storyboard" ||
                  selectedCanvas.kind === "shot" ? (
                  <Clapperboard className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-[#6eb8ff]" />
                )}
                <span className="truncate">{canvasTitle}</span>
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {selectedCanvas.kind === "brief" ? (
                <article className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
                  <p className="text-[12px] font-semibold text-[#6eb8ff]">
                    {copy.brief}
                  </p>
                  <h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-white/90">
                    {project.title}
                  </h2>
                  <p className="mt-7 whitespace-pre-wrap text-[16px] leading-8 text-white/52">
                    {creativeBrief(project.brief)}
                  </p>
                  <div className="mt-10 grid gap-3 sm:grid-cols-3">
                    {(["concept", "outline", "script"] as WorkflowStage[]).map(
                      (stage, index) => (
                        <div
                          className={cn(
                            "rounded-2xl border p-4",
                            index <= stageIndex
                              ? "border-[#1677ff]/22 bg-[#1677ff]/[0.045]"
                              : "border-white/[0.07] bg-white/[0.015]",
                          )}
                          key={stage}
                        >
                          <span className="text-[12px] text-white/25">
                            0{index + 1}
                          </span>
                          <p className="mt-2 text-[13px] text-white/65">{stageLabels[stage]}</p>
                        </div>
                      ),
                    )}
                  </div>
                </article>
              ) : null}

              {selectedCanvas.kind === "storyboard" ||
              selectedCanvas.kind === "document" ? (
                <article className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
                  <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] pb-6">
                    <div>
                      <p className="text-[12px] font-semibold text-[#6eb8ff]">
                        {selectedCanvas.kind === "document"
                          ? copy[selectedCanvas.document]
                          : copy.storyboard}
                      </p>
                      <h2 className="mt-3 line-clamp-2 font-display text-2xl leading-tight text-white/88">
                        {selectedCanvas.kind === "document"
                          ? selectedCanvas.document === "outline"
                            ? copy.stageOutline
                            : copy.stageScript
                          : project.title}
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
                            <span className="text-[10px] font-semibold tracking-[0.16em] text-[#6eb8ff]">
                              {copy.shot} {String(shot.index + 1).padStart(2, "0")}
                            </span>
                            <span className="text-[10px] text-white/22">
                              {shot.duration_seconds}s · {shot.aspect_ratio}
                            </span>
                          </div>
                          <h3 className="mt-3 text-[17px] font-medium leading-8 text-white/82">
                            {shot.description}
                          </h3>
                          <p className="mt-3 line-clamp-3 text-[14px] leading-7 text-white/38">
                            {locale.startsWith("zh") && shot.prompt_zh
                              ? shot.prompt_zh
                              : shot.prompt_en}
                          </p>
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

              {selectedCanvas.kind === "shot" && canvasShot ? (
                <article className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
                  <div className="aspect-video overflow-hidden rounded-2xl border border-white/[0.08] bg-[radial-gradient(circle_at_72%_20%,rgba(22,119,255,0.26),transparent_28%),linear-gradient(145deg,#13213d,#080c13)] p-6">
                    <div className="flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-black/25 px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] backdrop-blur">
                          {copy.shot} {String(canvasShot.index + 1).padStart(2, "0")}
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
                        <p className="mt-3 text-[11px] text-white/35">
                          {canvasShot.duration_seconds}s · {canvasShot.aspect_ratio}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="rounded-2xl border border-white/[0.07] p-5">
                      <p className="text-[12px] font-semibold text-white/28">
                        Prompt
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-8 text-white/52">
                        {locale.startsWith("zh") && canvasShot.prompt_zh
                          ? canvasShot.prompt_zh
                          : canvasShot.prompt_en}
                      </p>
                    </div>
                    <div className="space-y-3">
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
                        <p className="rounded-xl bg-[#1677ff]/[0.08] px-3 py-2 text-[11px] text-[#a8ddff]">
                          {t("estimatedCredits")}: {estimate.credits}
                        </p>
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
                      <button
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1677ff] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-35"
                        disabled={
                          isWorking ||
                          canvasShot.status === "completed" ||
                          workflow?.status !== "approved"
                        }
                        onClick={() => void generateShot()}
                        type="button"
                      >
                        <Clapperboard className="h-3.5 w-3.5" />
                        {isWorking
                          ? copy.generating
                          : canvasShot.status === "completed"
                            ? t("completed")
                            : copy.generate}
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-2">
                    <button
                      aria-label={t("moveEarlier")}
                      className="grid size-9 place-items-center rounded-lg border border-white/[0.08] text-white/40 disabled:opacity-20"
                      disabled={isReordering || canvasShot.index === 0}
                      onClick={() => void moveSelectedShot(-1)}
                      type="button"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      aria-label={t("moveLater")}
                      className="grid size-9 place-items-center rounded-lg border border-white/[0.08] text-white/40 disabled:opacity-20"
                      disabled={
                        isReordering ||
                        canvasShot.index === (storyboard?.shots.length ?? 1) - 1
                      }
                      onClick={() => void moveSelectedShot(1)}
                      type="button"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/[0.1] px-3 py-2 text-[11px] text-white/42 hover:border-[#1677ff]/35 hover:text-white">
                      <Upload className="h-3.5 w-3.5" />
                      {isWorking ? copy.uploading : copy.upload}
                      <input
                        accept="image/*,video/*,audio/*"
                        aria-label={t("uploadReference")}
                        className="sr-only"
                        disabled={isWorking}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.currentTarget.value = "";
                          if (file) void uploadReference(file);
                        }}
                        type="file"
                      />
                    </label>
                    <span className="text-[10px] text-white/24">
                      {assets.filter((asset) => asset.kind === "upload").length}{" "}
                      {t("referenceCount")}
                    </span>
                  </div>
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
                      <p className="mt-1 text-[11px] text-white/28">
                        {selectedAsset.content_type} ·{" "}
                        {(selectedAsset.byte_size / 1024 / 1024).toFixed(1)} MB
                      </p>
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
              "min-h-0 flex-col border-l border-white/[0.07] bg-[#0d0c0a] lg:flex",
              mobilePanel === "agent" ? "flex" : "hidden",
            )}
          >
            <div className="flex h-14 shrink-0 items-center border-b border-white/[0.07] px-4">
              <span className="flex items-center gap-2 text-[12px] font-medium text-white/65">
                <span className="grid size-6 place-items-center rounded-lg bg-[#1677ff]/15 text-[#7bc6ff]">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                VideoAgent
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-[12px] leading-6 text-white/45">
                  <StreamingText text={t("agentIntro")} />
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-[12px] leading-6",
                      message.role === "user"
                        ? "ml-8 border border-[#1677ff]/20 bg-[#1677ff]/[0.075] text-white/78"
                        : "mr-3 border border-white/[0.07] bg-white/[0.02] text-white/52",
                    )}
                    key={message.id}
                  >
                    {message.role === "user" ? (
                      message.content
                    ) : (
                      <div className="max-h-64 overflow-y-auto pr-1">
                        <StreamingText text={message.content} />
                      </div>
                    )}
                  </div>
                ))
              )}
              {workflow?.stage === "ready" ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.045] px-4 py-3 text-[12px] leading-6 text-emerald-200/75">
                  {copy.readyMessage}
                </div>
              ) : null}
              {pendingDecision ? (
                <div className="mr-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[12px] text-white/45">
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
                  className="min-h-16 w-full resize-none bg-transparent text-[12px] leading-6 text-white outline-none placeholder:text-white/24"
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
          </aside>
        </div>

        <nav className="grid grid-cols-4 border-t border-white/[0.07] bg-[#0d0c0a] lg:hidden">
          {[
            { id: "history" as const, label: copy.recent, icon: MessageSquareText },
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

      {reviewOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setReviewOpen(false);
          }}
        >
          <section
            aria-labelledby="review-title"
            aria-modal="true"
            className="w-full max-w-xl rounded-2xl border border-white/[0.12] bg-[#15120e] p-6"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] text-[#5cc8ff]">
                  VideoAgent
                </p>
                <h2 id="review-title" className="mt-2 text-xl font-semibold">
                  {t("reviewTitle")}
                </h2>
              </div>
              <button
                aria-label={t("close")}
                className="grid size-8 place-items-center rounded-lg bg-white/[0.04] text-white/45 hover:text-white"
                onClick={() => setReviewOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {isReviewing || !evaluation ? (
              <p className="py-16 text-center text-[12px] text-white/40">{t("reviewing")}</p>
            ) : (
              <div className="mt-5">
                <div className="flex items-end gap-3">
                  <strong className="font-display text-5xl font-medium leading-none">
                    {evaluation.overall_score}
                  </strong>
                  <span className="pb-1 text-[12px] text-white/35">
                    {t("overallScore")}
                  </span>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {evaluation.metrics.map((metric) => (
                    <div
                      className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                      key={metric.key}
                    >
                      <div className="flex items-center justify-between text-[12px]">
                        <span>{metricLabels[metric.key]}</span>
                        <span className="text-white/35">{metric.score}</span>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-[#1677ff]"
                          style={{ width: `${metric.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 space-y-2">
                  {evaluation.suggestions.map((suggestion) => (
                    <p
                      className="rounded-xl border border-white/[0.07] px-3 py-2.5 text-[12px] text-white/52"
                      key={suggestion.code}
                    >
                      {suggestionLabels[suggestion.code]}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
