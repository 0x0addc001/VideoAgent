import { useEffect, useMemo, useState } from "react";
import "./demo.css";

type Asset = {
  id: string;
  kind: string;
  content_type: string;
  filename: string;
  shot_id: string | null;
  thumb: string;
};
type Character = { id: string; name: string; description: string; prompt_en: string };
type Scene = {
  id: string;
  name: string;
  location: string;
  description: string;
  prompt_en: string;
};
type Shot = {
  id: string;
  index: number;
  name?: string | null;
  description: string;
  prompt_en: string;
  duration_seconds: number;
  aspect_ratio: string;
};
type Version = { revision: number; label: string; created_at: string };
type Snapshot = {
  project: { title: string; brief: string };
  storyboard: { characters: Character[]; scenes: Scene[]; shots: Shot[] } | null;
  assets: Asset[];
  versions: Version[];
};

type Selection =
  | { kind: "configs" }
  | { kind: "interfaces" }
  | { kind: "implementations" }
  | { kind: "versions" }
  | { kind: "finalcut" }
  | { kind: "character"; id: string }
  | { kind: "scene"; id: string }
  | { kind: "shot"; id: string };

const sections = [
  { id: "procedures", label: "Procedures", children: [
    { id: "configs", label: "Configs" },
    { id: "interfaces", label: "Interfaces" },
    { id: "implementations", label: "Implementations" },
  ]},
] as const;

export function DemoWorkspace() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selection>({ kind: "configs" });
  const [preview, setPreview] = useState<Asset | null>(null);

  useEffect(() => {
    fetch("./demo/snapshot.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Snapshot>;
      })
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "demo failed"),
      );
  }, []);

  const storyboard = data?.storyboard;
  const assets = data?.assets ?? [];
  const takesFor = (shotId: string) =>
    assets.filter((asset) => asset.shot_id === shotId && asset.kind !== "export" && asset.kind !== "cover");
  const assetFor = (prefix: string) =>
    assets.find((asset) => asset.filename.startsWith(prefix));
  const finalCut = assets.find((asset) => asset.kind === "export");

  const selectedCharacter = useMemo(
    () => storyboard?.characters.find((item) => selected.kind === "character" && item.id === selected.id),
    [selected, storyboard],
  );
  const selectedScene = useMemo(
    () => storyboard?.scenes.find((item) => selected.kind === "scene" && item.id === selected.id),
    [selected, storyboard],
  );
  const selectedShot = useMemo(
    () => storyboard?.shots.find((item) => selected.kind === "shot" && item.id === selected.id),
    [selected, storyboard],
  );

  if (error) {
    return <main className="demo-fallback">Demo unavailable: {error}</main>;
  }
  if (!data) {
    return <main className="demo-fallback">Loading VideoAgent demo…</main>;
  }

  const shots = storyboard?.shots ?? [];
  const characters = storyboard?.characters ?? [];
  const scenes = storyboard?.scenes ?? [];

  function sectionButton(id: string, label: string, active: boolean) {
    return (
      <button
        className={`demo-tree-button ${active ? "active" : ""}`}
        key={id}
        onClick={() => setSelected({ kind: id as Selection["kind"] } as Selection)}
        type="button"
      >
        {label}
      </button>
    );
  }

  return (
    <main className="demo-shell">
      <header className="demo-topbar">
        <div className="demo-brand">
          <span className="demo-mark">V</span>
          <strong>VideoAgent</strong>
          <span className="demo-badge">READ-ONLY DEMO</span>
          <span className="demo-user">demo@videoagent.local</span>
        </div>
        <nav className="demo-topnav">
          <a href="./docs/">Docs</a>
          <a href="https://github.com/0x0addc001/VideoAgent">GitHub</a>
        </nav>
      </header>

      <div className="demo-body">
        <aside className="demo-tree">
          <p className="demo-tree-heading">Procedures</p>
          {sections[0].children.map((entry) =>
            sectionButton(entry.id, entry.label, selected.kind === entry.id),
          )}

          <p className="demo-tree-heading">Objects</p>
          <p className="demo-tree-group">Characters</p>
          {characters.map((character) => (
            <button
              className={`demo-tree-button ${selected.kind === "character" && selected.id === character.id ? "active" : ""}`}
              key={character.id}
              onClick={() => setSelected({ kind: "character", id: character.id })}
              type="button"
            >
              {character.name}
            </button>
          ))}
          <p className="demo-tree-group">Scenes</p>
          {scenes.map((scene) => (
            <button
              className={`demo-tree-button ${selected.kind === "scene" && selected.id === scene.id ? "active" : ""}`}
              key={scene.id}
              onClick={() => setSelected({ kind: "scene", id: scene.id })}
              type="button"
            >
              {scene.name}
            </button>
          ))}
          <p className="demo-tree-group">Shots</p>
          {shots.map((shot) => (
            <button
              className={`demo-tree-button ${selected.kind === "shot" && selected.id === shot.id ? "active" : ""}`}
              key={shot.id}
              onClick={() => setSelected({ kind: "shot", id: shot.id })}
              type="button"
            >
              {shot.name || shot.description}
              <span>{takesFor(shot.id).length}</span>
            </button>
          ))}
          <p className="demo-tree-group">Final Cut</p>
          <button
            className={`demo-tree-button ${selected.kind === "finalcut" ? "active" : ""}`}
            onClick={() => setSelected({ kind: "finalcut" })}
            type="button"
          >
            Final cut
          </button>

          <p className="demo-tree-heading">Versions</p>
          {data.versions.map((version) => (
            <button
              className={`demo-tree-button ${selected.kind === "versions" ? "active" : ""}`}
              key={`${version.revision}-${version.label}`}
              onClick={() => setSelected({ kind: "versions" })}
              type="button"
            >
              v{version.revision} · {version.label}
            </button>
          ))}
        </aside>

        <section className="demo-canvas">
          {selected.kind === "configs" ? (
            <article className="demo-document">
              <span className="demo-eyebrow">Configs</span>
              <h1>{data.project.title}</h1>
              <p className="demo-lead">{data.project.brief}</p>
              <div className="demo-grid">
                <Card label="Aspect / duration" value={`${shots[0]?.aspect_ratio ?? "—"} · ${shots[0]?.duration_seconds ?? "—"}s`} />
                <Card label="Shots" value={`${shots.length} contracts`} />
                <Card label="Versions" value={`${data.versions.length} snapshots`} />
              </div>
            </article>
          ) : null}

          {selected.kind === "interfaces" ? (
            <article className="demo-document">
              <span className="demo-eyebrow">Interfaces</span>
              <h1>Shot contracts</h1>
              <div className="demo-list">
                {shots.map((shot) => (
                  <button
                    className="demo-contract"
                    key={shot.id}
                    onClick={() => setSelected({ kind: "shot", id: shot.id })}
                    type="button"
                  >
                    <strong>{shot.name || shot.description}</strong>
                    <span>{shot.duration_seconds}s · {shot.aspect_ratio}</span>
                  </button>
                ))}
              </div>
            </article>
          ) : null}

          {selected.kind === "implementations" || selected.kind === "versions" ? (
            <article className="demo-document">
              <span className="demo-eyebrow">Implementations</span>
              <h1>Version history</h1>
              <div className="demo-list">
                {data.versions.map((version) => (
                  <div className="demo-contract" key={`${version.revision}-${version.label}`}>
                    <strong>v{version.revision} · {version.label}</strong>
                    <span>{new Date(version.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          {selectedCharacter ? (
            <article className="demo-document">
              <span className="demo-eyebrow">Character</span>
              <h1>{selectedCharacter.name}</h1>
              <div className="demo-hero">
                <Thumb asset={assetFor(`character-${selectedCharacter.id}-`)} onOpen={setPreview} />
                <div>
                  <p className="demo-lead">{selectedCharacter.description}</p>
                  <pre>{selectedCharacter.prompt_en}</pre>
                </div>
              </div>
            </article>
          ) : null}

          {selectedScene ? (
            <article className="demo-document">
              <span className="demo-eyebrow">Scene</span>
              <h1>{selectedScene.name}</h1>
              <div className="demo-hero">
                <Thumb asset={assetFor(`scene-${selectedScene.id}-`)} onOpen={setPreview} />
                <div>
                  <p className="demo-lead">{selectedScene.location}</p>
                  <p>{selectedScene.description}</p>
                  <pre>{selectedScene.prompt_en}</pre>
                </div>
              </div>
            </article>
          ) : null}

          {selectedShot ? (
            <article className="demo-document">
              <span className="demo-eyebrow">Shot · {selectedShot.index + 1}</span>
              <h1>{selectedShot.name || selectedShot.description}</h1>
              <p className="demo-lead">{selectedShot.description}</p>
              <pre>{selectedShot.prompt_en}</pre>
              <div className="demo-takes">
                {takesFor(selectedShot.id).map((take, index) => (
                  <button
                    className="demo-take"
                    key={take.id}
                    onClick={() => setPreview(take)}
                    type="button"
                  >
                    <img alt="" src={`./demo/${take.thumb}`} />
                    <span>Take {index + 1}</span>
                  </button>
                ))}
              </div>
            </article>
          ) : null}

          {selected.kind === "finalcut" ? (
            <article className="demo-document">
              <span className="demo-eyebrow">Final cut</span>
              <h1>Delivery</h1>
              {finalCut ? (
                <video
                  className="demo-video"
                  controls
                  playsInline
                  poster={`./demo/${finalCut.thumb}`}
                  src="./demo/final-cut.mp4"
                />
              ) : null}
              <p className="demo-lead">
                The interactive product keeps every take, version and provider setting; this
                page is a read-only snapshot of the same project.
              </p>
            </article>
          ) : null}
        </section>

        <aside className="demo-inspector">
          <p className="demo-tree-heading">Inspector</p>
          <p className="demo-inspector-label">Mode</p>
          <p>Read-only demo</p>
          <p className="demo-inspector-label">Account</p>
          <p>demo@videoagent.local</p>
          <p className="demo-inspector-label">Project</p>
          <p>{data.project.title}</p>
          <p className="demo-inspector-label">Objects</p>
          <p>
            {characters.length} characters · {scenes.length} scenes · {shots.length} shots
          </p>
          <p className="demo-inspector-label">Takes</p>
          <p>{assets.filter((asset) => asset.shot_id && asset.kind !== "export").length}</p>
          <p className="demo-inspector-note">
            Click any item in the tree. Videos and images are the real generated assets;
            editing is disabled.
          </p>
        </aside>
      </div>

      {preview ? (
        <div className="demo-lightbox" onClick={() => setPreview(null)} role="presentation">
          <figure onClick={(event) => event.stopPropagation()}>
            <img alt="" src={`./demo/${preview.thumb}`} />
            <figcaption>
              {preview.filename}
              <span>@{preview.id.slice(0, 8)}</span>
            </figcaption>
            <button onClick={() => setPreview(null)} type="button">Close</button>
          </figure>
        </div>
      ) : null}
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="demo-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Thumb({ asset, onOpen }: { asset?: Asset; onOpen: (asset: Asset) => void }) {
  if (!asset) return <div className="demo-hero-placeholder" />;
  return (
    <button className="demo-hero-image" onClick={() => onOpen(asset)} type="button">
      <img alt="" src={`./demo/${asset.thumb}`} />
    </button>
  );
}
