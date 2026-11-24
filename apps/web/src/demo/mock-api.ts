/* Static demo backend: answers the product's /api/account calls from a snapshot. */
import snapshot from "./snapshot.json";

type Json = Record<string, unknown>;

const DEMO_PROJECT = "demo-project";
const BASE_PATH =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEMO_BASE) || "";
const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
const BASE = `${ORIGIN}${BASE_PATH}`;

function assetUrl(id: string, filename: string, contentType: string) {
  return contentType.startsWith("video/")
    ? `${BASE}/demo/final-cut.mp4`
    : `${BASE}/demo/media/${id}.jpg`;
}

function project() {
  const now = new Date().toISOString();
  return {
    id: DEMO_PROJECT,
    title: snapshot.project.title,
    brief: snapshot.project.brief,
    state: "active",
    access_permission: "view",
    created_at: now,
    updated_at: now,
  };
}

function storyboard() {
  const now = new Date().toISOString();
  return {
    id: "demo-storyboard",
    project_id: DEMO_PROJECT,
    version: 1,
    created_at: now,
    updated_at: now,
    shots: (snapshot.storyboard?.shots ?? []).map((shot) => ({
      ...shot,
      prompt_zh: null,
      generation_mode: "text_to_video",
      status: "completed",
    })),
    characters: (snapshot.storyboard?.characters ?? []).map((character, index) => ({
      ...character,
      index,
      prompt_zh: null,
    })),
    scenes: (snapshot.storyboard?.scenes ?? []).map((scene, index) => ({
      ...scene,
      index,
      prompt_zh: null,
    })),
  };
}

const SHOT_NAMES: Record<string, string> = {
  "Morning platform": "morning-platform",
  "Morning alley": "morning-alley",
  "Morning park": "morning-park",
};

function englishFilename(asset: (typeof snapshot.assets)[number]) {
  if (asset.kind === "export") return "morning-vlog-final-cut-9x16.mp4";
  if (asset.kind === "cover") return "morning-vlog-cover.jpg";
  if (asset.filename.startsWith("character-")) return asset.filename;
  if (asset.filename.startsWith("scene-")) return asset.filename;
  if (asset.shot_id) {
    const shot = snapshot.storyboard?.shots.find((item) => item.id === asset.shot_id);
    const slug = SHOT_NAMES[shot?.name ?? ""] ?? "shot";
    return `${slug}-take-1.mp4`;
  }
  return asset.filename;
}

function assets() {
  return snapshot.assets.map((asset) => ({
    id: asset.id,
    project_id: DEMO_PROJECT,
    shot_id: asset.shot_id,
    kind: asset.kind,
    filename: englishFilename(asset),
    content_type: asset.content_type,
    byte_size: 1024,
    checksum: "demo",
    permission: "private",
    content_url: assetUrl(asset.id, asset.filename, asset.content_type),
    thumbnail_url: `${BASE}/demo/media/${asset.id}.jpg`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

function versions() {
  return snapshot.versions.map((version, index) => ({
    id: `demo-version-${version.revision}`,
    project_id: DEMO_PROJECT,
    revision: version.revision,
    label: version.label,
    storyboard_version: 1,
    shot_count: snapshot.storyboard?.shots.length ?? 0,
    character_count: snapshot.storyboard?.characters.length ?? 0,
    scene_count: snapshot.storyboard?.scenes.length ?? 0,
    created_at: version.created_at ?? new Date().toISOString(),
    index,
  }));
}

const messages = {
  items: [
    {
      id: "demo-message-1",
      role: "user",
      content: snapshot.project.brief,
      created_at: new Date().toISOString(),
    },
    {
      id: "demo-message-2",
      role: "assistant",
      content:
        "I turned the brief into a procedure, defined the Vlogger and the morning locations, and generated one take for each shot. The final cut is ready to review.",
      created_at: new Date().toISOString(),
    },
  ],
};

function respond(path: string, method: string): Json {
  if (path === "auth/me") return { email: "demo@videoagent.local" };
  if (path === "credits") return { credits: 500 };
  if (path === "skills") return { items: [] };
  if (path === "hots") return { items: [] };
  if (path === "assets") return { items: assets() };
  if (path === "workspace")
    return {
      folders: [],
      recents: [
        {
          id: DEMO_PROJECT,
          title: snapshot.project.title,
          preview: snapshot.project.brief,
          stage: "storyboard",
          updated_at: new Date().toISOString(),
          folder_id: null,
        },
      ],
    };
  if (path.endsWith("/asset-selections")) return { items: [] };
  if (path.endsWith("/visual-review/models")) return { items: [] };
  if (path === "providers/models") return { items: [] };
  if (path.endsWith("/messages")) return messages;
  if (path.endsWith("/storyboard")) return storyboard();
  if (path.endsWith("/workflow"))
    return { status: "approved", stage: "approved", updated_at: new Date().toISOString() };
  if (path.endsWith("/versions")) return { items: versions() };
  if (path.endsWith("/assets")) return { items: assets() };
  if (path.includes("/assets/")) {
    return assets().find((asset) => path.includes(asset.id)) ?? {};
  }
  if (path === `projects/${DEMO_PROJECT}`) return project();
  if (method === "GET") return {};
  return {};
}

export function installDemoApi() {
  if (typeof window === "undefined") return;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  if (!apiBase.startsWith("https://mock.videoagent.local")) return;
  const original = window.fetch.bind(window);
  if ((window as unknown as { __demoFetch?: boolean }).__demoFetch) return;
  (window as unknown as { __demoFetch?: boolean }).__demoFetch = true;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (!url.startsWith(apiBase)) return original(input, init);
    const path = url.slice(apiBase.length).replace(/^\/+/, "").split("?")[0];
    const method = (init?.method ?? "GET").toUpperCase();
    const body = JSON.stringify(respond(path, method));
    return Promise.resolve(
      new Response(body, {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  };
}

installDemoApi();
