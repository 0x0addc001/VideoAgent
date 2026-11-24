"use client";

import { useEffect, useState } from "react";

type DemoAsset = {
  id: string;
  filename: string;
  content_type: string;
  kind: string;
  shot_id: string | null;
};
type DemoCharacter = { id: string; name: string; description: string };
type DemoScene = { id: string; name: string; location: string; description: string };
type DemoShot = {
  id: string;
  index: number;
  name?: string | null;
  description: string;
  prompt_en: string;
};
type DemoVersion = {
  revision: number;
  label: string;
  created_at: string;
};
type DemoPayload = {
  project: { id: string; title: string; brief: string };
  storyboard: {
    shots: DemoShot[];
    characters: DemoCharacter[];
    scenes: DemoScene[];
  } | null;
  assets: DemoAsset[];
  versions: DemoVersion[];
};

export function DemoShowcase({ locale }: { locale: string }) {
  const zh = locale.startsWith("zh");
  const [data, setData] = useState<DemoPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/demo/project", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as DemoPayload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "demo-failed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080807] p-8 text-white/60">
        {zh ? "示例项目暂不可用：" : "Demo unavailable: "} {error}
      </main>
    );
  }
  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080807] p-8 text-white/40">
        {zh ? "正在加载示例项目…" : "Loading the demo project…"}
      </main>
    );
  }

  const assets = data.assets;
  const takesFor = (shotId: string) =>
    assets.filter(
      (asset) =>
        asset.shot_id === shotId && !["export", "cover"].includes(asset.kind),
    );
  const characterImage = (id: string) =>
    assets.find(
      (asset) =>
        asset.filename.startsWith(`character-${id}-`) &&
        asset.content_type.startsWith("image/"),
    );
  const sceneImage = (id: string) =>
    assets.find(
      (asset) =>
        asset.filename.startsWith(`scene-${id}-`) &&
        asset.content_type.startsWith("image/"),
    );
  const finalCut = assets.find(
    (asset) => asset.kind === "export" && asset.content_type.startsWith("video/"),
  );
  const fullContent = (id: string) => `/api/account/demo/assets/${id}/content`;
  const thumb = (id: string) => `/api/account/demo/assets/${id}/thumbnail`;

  return (
    <main className="min-h-screen bg-[#080807] px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-3 border-b border-white/10 pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
              {zh ? "只读示例" : "Read-only demo"}
            </span>
            <span className="text-[11px] text-white/35">
              {zh ? "从脚本到成片的完整过程" : "From script to final cut"}
            </span>
          </div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{data.project.title}</h1>
          <p className="max-w-3xl whitespace-pre-wrap text-[13px] leading-6 text-white/50">
            {data.project.brief}
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{zh ? "过程" : "Procedures"}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: zh ? "配置" : "Configs", body: zh ? "项目设定：画幅、时长、模型与风格。" : "Project settings: aspect, duration, model and style." },
              { label: zh ? "接口" : "Interfaces", body: `${data.storyboard?.shots.length ?? 0} ${zh ? "个镜头契约" : "shot contracts"}` },
              { label: zh ? "实现" : "Implementations", body: `${data.versions.length} ${zh ? "个版本快照" : "version snapshots"}` },
            ].map((item) => (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4" key={item.label}>
                <p className="text-[12px] font-semibold text-[#7bc6ff]">{item.label}</p>
                <p className="mt-2 text-[12px] leading-5 text-white/45">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">{zh ? "角色" : "Characters"}</h2>
            {data.storyboard?.characters.map((character) => {
              const image = characterImage(character.id);
              return (
                <article className="flex gap-3 rounded-xl border border-white/10 p-3" key={character.id}>
                  {image ? (
                    <img alt={character.name} className="h-20 w-16 rounded-lg object-cover" src={thumb(image.id)} />
                  ) : null}
                  <div>
                    <p className="text-[13px] font-medium text-white/85">{character.name}</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/40">{character.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">{zh ? "场景" : "Scenes"}</h2>
            {data.storyboard?.scenes.map((scene) => {
              const image = sceneImage(scene.id);
              return (
                <article className="flex gap-3 rounded-xl border border-white/10 p-3" key={scene.id}>
                  {image ? (
                    <img alt={scene.name} className="h-20 w-16 rounded-lg object-cover" src={thumb(image.id)} />
                  ) : null}
                  <div>
                    <p className="text-[13px] font-medium text-white/85">{scene.name}</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/40">{scene.location}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{zh ? "镜头与镜头条" : "Shots and takes"}</h2>
          {data.storyboard?.shots.map((shot) => {
            const takes = takesFor(shot.id);
            return (
              <article className="rounded-xl border border-white/10 p-4" key={shot.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold text-white/85">{shot.name || shot.description}</p>
                  <span className="text-[11px] text-white/30">
                    {takes.length} {zh ? "条" : takes.length === 1 ? "take" : "takes"}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-5 text-white/45">{shot.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {takes.map((take, index) => (
                    <a
                      className="relative block h-16 w-24 overflow-hidden rounded-lg border border-white/10"
                      href={fullContent(take.id)}
                      key={take.id}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img alt={take.filename} className="h-full w-full object-cover" src={thumb(take.id)} />
                      <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 text-[10px] text-white/80">
                        {index + 1}
                      </span>
                    </a>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        {finalCut ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{zh ? "成片" : "Final cut"}</h2>
            <video className="w-full rounded-xl border border-white/10" controls src={fullContent(finalCut.id)} />
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{zh ? "版本" : "Versions"}</h2>
          <div className="space-y-2">
            {data.versions.map((version) => (
              <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-[12px]" key={`${version.revision}-${version.label}`}>
                <span className="text-white/70">
                  v{version.revision} · {version.label}
                </span>
                <span className="text-white/30">{new Date(version.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-white/10 pt-6 text-center text-[11px] text-white/25">
          Generated By VideoAgent
        </footer>
      </div>
    </main>
  );
}
