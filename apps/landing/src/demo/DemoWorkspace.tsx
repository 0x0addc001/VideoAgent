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

type View = "home" | "workspace" | "assets" | "videos" | "skills" | "docs";
type Selection =
  | { kind: "configs" }
  | { kind: "interfaces" }
  | { kind: "implementations" }
  | { kind: "finalcut" }
  | { kind: "character"; id: string }
  | { kind: "scene"; id: string }
  | { kind: "shot"; id: string };

const skills = [
  {
    id: "creator-vlog",
    name: "creator_vlog",
    description: "Handheld morning Vlog with restrained movement and natural sound.",
    stage: "Planning · Storyboard · Generation",
  },
  {
    id: "product-launch",
    name: "product_launch_30s",
    description: "30-second product launch with a hook, proof points and a clean end card.",
    stage: "Storyboard · Final cut",
  },
  {
    id: "character-consistency",
    name: "character_consistency",
    description: "Keeps a character identity stable across shots with reference images.",
    stage: "Objects · Review",
  },
];

export function DemoWorkspace() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("workspace");
  const [selected, setSelected] = useState<Selection>({ kind: "configs" });
  const [preview, setPreview] = useState<Asset | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeSkill, setActiveSkill] = useState<(typeof skills)[number] | null>(null);
  const [agentOpen, setAgentOpen] = useState(true);

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
    assets.filter(
      (asset) =>
        asset.shot_id === shotId && asset.kind !== "export" && asset.kind !== "cover",
    );
  const assetFor = (prefix: string) =>
    assets.find((asset) => asset.filename.startsWith(prefix));
  const finalCut = assets.find((asset) => asset.kind === "export");

  const selectedCharacter = useMemo(
    () =>
      storyboard?.characters.find(
        (item) => selected.kind === "character" && item.id === selected.id,
      ),
    [selected, storyboard],
  );
  const selectedScene = useMemo(
    () =>
      storyboard?.scenes.find(
        (item) => selected.kind === "scene" && item.id === selected.id,
      ),
    [selected, storyboard],
  );
  const selectedShot = useMemo(
    () =>
      storyboard?.shots.find(
        (item) => selected.kind === "shot" && item.id === selected.id,
      ),
    [selected, storyboard],
  );

  if (error) return <main className="demo-fallback">Demo unavailable: {error}</main>;
  if (!data) return <main className="demo-fallback">Loading VideoAgent demo…</main>;

  const shots = storyboard?.shots ?? [];
  const characters = storyboard?.characters ?? [];
  const scenes = storyboard?.scenes ?? [];
  const takeCount = assets.filter(
    (asset) => asset.shot_id && asset.kind !== "export",
  ).length;

  function openWorkspace(selection: Selection = { kind: "configs" }) {
    setSelected(selection);
    setView("workspace");
  }

  return (
    <main className="demo-client">
      <aside className="demo-rail">
        <div className="demo-rail-brand">
          <span className="demo-mark">V</span>
          <div>
            <strong>VideoAgent</strong>
            <span>demo workspace</span>
          </div>
        </div>

        <nav className="demo-rail-nav">
          <RailButton active={view === "home"} label="Home" onClick={() => setView("home")} />
          <RailButton
            active={view === "workspace"}
            label="Projects"
            onClick={() => openWorkspace()}
          />
          <RailButton active={view === "assets"} label="Assets" onClick={() => setView("assets")} />
          <RailButton active={view === "videos"} label="Videos" onClick={() => setView("videos")} />
          <RailButton active={view === "skills"} label="Skills" onClick={() => setView("skills")} />
          <RailButton active={view === "docs"} label="Docs" onClick={() => setView("docs")} />
        </nav>

        <p className="demo-rail-heading">Recent</p>
        <button className="demo-rail-recent active" onClick={() => openWorkspace()} type="button">
          <span>{data.project.title}</span>
          <small>3 shots · 3 takes</small>
        </button>
        <button className="demo-rail-recent" onClick={() => setView("home")} type="button">
          <span>Morning Vlog — draft</span>
          <small>yesterday</small>
        </button>

        <div className="demo-rail-footer">
          <span className="demo-rail-credit">Credits · 500</span>
          <span className="demo-rail-account">demo@videoagent.local</span>
        </div>
      </aside>

      <div className="demo-main">
        <header className="demo-topbar">
          <div className="demo-breadcrumb">
            <strong>{view === "workspace" ? data.project.title : titleFor(view)}</strong>
            <span>demo@videoagent.local</span>
            <span className="demo-badge">READ-ONLY DEMO</span>
          </div>
          <div className="demo-top-actions">
            <button className="demo-top-button" onClick={() => setAgentOpen((value) => !value)} type="button">
              Agent
            </button>
            <a className="demo-top-button" href="./docs/">Docs</a>
            <div className="demo-account-wrap">
              <button
                aria-expanded={accountOpen}
                className="demo-avatar"
                onClick={() => setAccountOpen((value) => !value)}
                type="button"
              >
                D
              </button>
              {accountOpen ? (
                <div className="demo-account-menu">
                  <p className="demo-account-name">demo@videoagent.local</p>
                  <p className="demo-account-meta">Read-only demo account</p>
                  <p className="demo-account-meta">500 credits</p>
                  <span className="demo-account-signout">Sign out disabled in demo</span>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {view === "home" ? (
          <section className="demo-page">
            <header className="demo-page-head">
              <span className="demo-eyebrow">Home</span>
              <h1>Welcome back, demo.</h1>
              <p className="demo-lead">
                This is the sample project built by VideoAgent. Open it to inspect the
                storyboard, objects, takes and final cut.
              </p>
            </header>
            <div className="demo-home-grid">
              <button className="demo-project-card" onClick={() => openWorkspace()} type="button">
                {finalCut ? <img alt="" src={`./demo/${finalCut.thumb}`} /> : null}
                <div>
                  <strong>{data.project.title}</strong>
                  <span>3 shots · 3 takes · 1 version</span>
                </div>
              </button>
              <div className="demo-home-panel">
                <h2>Recent activity</h2>
                <p>Storyboard saved · v1</p>
                <p>Shot 3 rendered · 清晨公园</p>
                <p>Final cut exported · 9:16</p>
              </div>
            </div>
          </section>
        ) : null}

        {view === "workspace" ? (
          <div className="demo-workspace">
            <aside className="demo-tree">
              <p className="demo-tree-heading">Procedures</p>
              <TreeButton active={selected.kind === "configs"} label="Configs" onClick={() => setSelected({ kind: "configs" })} />
              <TreeButton active={selected.kind === "interfaces"} label="Interfaces" onClick={() => setSelected({ kind: "interfaces" })} />
              <TreeButton
                active={selected.kind === "implementations"}
                label="Implementations"
                onClick={() => setSelected({ kind: "implementations" })}
              />
              <p className="demo-tree-heading">Objects</p>
              <p className="demo-tree-group">Characters</p>
              {characters.map((character) => (
                <TreeButton
                  active={selected.kind === "character" && selected.id === character.id}
                  key={character.id}
                  label={character.name}
                  onClick={() => setSelected({ kind: "character", id: character.id })}
                />
              ))}
              <p className="demo-tree-group">Scenes</p>
              {scenes.map((scene) => (
                <TreeButton
                  active={selected.kind === "scene" && selected.id === scene.id}
                  key={scene.id}
                  label={scene.name}
                  onClick={() => setSelected({ kind: "scene", id: scene.id })}
                />
              ))}
              <p className="demo-tree-group">Shots</p>
              {shots.map((shot) => (
                <TreeButton
                  active={selected.kind === "shot" && selected.id === shot.id}
                  count={takesFor(shot.id).length}
                  key={shot.id}
                  label={shot.name || shot.description}
                  onClick={() => setSelected({ kind: "shot", id: shot.id })}
                />
              ))}
              <p className="demo-tree-group">Final Cut</p>
              <TreeButton active={selected.kind === "finalcut"} label="Final cut" onClick={() => setSelected({ kind: "finalcut" })} />
              <p className="demo-tree-heading">Versions</p>
              {data.versions.map((version) => (
                <TreeButton
                  active={false}
                  key={`${version.revision}-${version.label}`}
                  label={`v${version.revision} · ${version.label}`}
                  onClick={() => setSelected({ kind: "implementations" })}
                />
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
                      <button className="demo-contract" key={shot.id} onClick={() => setSelected({ kind: "shot", id: shot.id })} type="button">
                        <strong>{shot.name || shot.description}</strong>
                        <span>{shot.duration_seconds}s · {shot.aspect_ratio}</span>
                      </button>
                    ))}
                  </div>
                </article>
              ) : null}
              {selected.kind === "implementations" ? (
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
                      <p className="demo-lead">{selectedScene.description}</p>
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
                      <button className="demo-take" key={take.id} onClick={() => setPreview(take)} type="button">
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
                    <video className="demo-video" controls playsInline poster={`./demo/${finalCut.thumb}`} src="./demo/final-cut.mp4" />
                  ) : null}
                  <p className="demo-lead">
                    The interactive product keeps every take, version and provider setting;
                    this page is a read-only demo of the same project.
                  </p>
                </article>
              ) : null}
            </section>

            <aside className="demo-inspector">
              <p className="demo-tree-heading">Inspector</p>
              <Inspector label="Mode" value="Read-only demo" />
              <Inspector label="Account" value="demo@videoagent.local" />
              <Inspector label="Objects" value={`${characters.length} characters · ${scenes.length} scenes`} />
              <Inspector label="Takes" value={String(takeCount)} />
              <p className="demo-inspector-note">
                Click any item. Images, takes and the final cut are real generated assets;
                editing is disabled.
              </p>
            </aside>

            {agentOpen ? (
              <aside className="demo-agent">
                <p className="demo-tree-heading">Agent</p>
                <div className="demo-message user">Create a morning Vlog about slow city life.</div>
                <div className="demo-message">
                  I drafted 3 shots and 1 character, then generated takes for each shot.
                </div>
                <div className="demo-approval">
                  <strong>Storyboard approved</strong>
                  <span>v1 · 3 shots · 3 takes</span>
                  <button disabled type="button">Approve</button>
                </div>
                <div className="demo-agent-input">
                  <input disabled placeholder="Read-only demo" />
                  <button disabled type="button">Send</button>
                </div>
              </aside>
            ) : null}
          </div>
        ) : null}

        {view === "assets" ? (
          <section className="demo-page">
            <header className="demo-page-head">
              <span className="demo-eyebrow">Assets</span>
              <h1>All project assets</h1>
              <p className="demo-lead">Images, takes and the final cut generated for this project.</p>
            </header>
            <div className="demo-asset-grid">
              {assets.map((asset) => (
                <button className="demo-asset-card" key={asset.id} onClick={() => setPreview(asset)} type="button">
                  <img alt="" src={`./demo/${asset.thumb}`} />
                  <div>
                    <strong>{asset.kind}</strong>
                    <span>{asset.content_type}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {view === "videos" ? (
          <section className="demo-page">
            <header className="demo-page-head">
              <span className="demo-eyebrow">Videos</span>
              <h1>Published videos</h1>
              <p className="demo-lead">The demo account has one completed delivery.</p>
            </header>
            <div className="demo-video-grid">
              {finalCut ? (
                <article className="demo-video-card">
                  <video controls playsInline poster={`./demo/${finalCut.thumb}`} src="./demo/final-cut.mp4" />
                  <div>
                    <strong>{data.project.title}</strong>
                    <span>9:16 · 30s · private</span>
                  </div>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        {view === "skills" ? (
          <section className="demo-page">
            <header className="demo-page-head">
              <span className="demo-eyebrow">Skills</span>
              <h1>Reusable skills</h1>
              <p className="demo-lead">The demo account ships three example skills.</p>
            </header>
            <div className="demo-skill-grid">
              {skills.map((skill) => (
                <button className="demo-skill-card" key={skill.id} onClick={() => setActiveSkill(skill)} type="button">
                  <strong>{skill.name}</strong>
                  <span>{skill.description}</span>
                  <small>{skill.stage}</small>
                </button>
              ))}
            </div>
            {activeSkill ? (
              <div className="demo-skill-detail">
                <h2>{activeSkill.name}</h2>
                <p>{activeSkill.description}</p>
                <span>{activeSkill.stage}</span>
                <button onClick={() => setActiveSkill(null)} type="button">Close</button>
              </div>
            ) : null}
          </section>
        ) : null}

        {view === "docs" ? (
          <section className="demo-page">
            <header className="demo-page-head">
              <span className="demo-eyebrow">Docs</span>
              <h1>Documentation</h1>
              <p className="demo-lead">Architecture, product requirements, API and model references.</p>
            </header>
            <div className="demo-doc-grid">
              <a href="./docs/architecture.html">Architecture</a>
              <a href="./docs/product-requirements.html">Product requirements</a>
              <a href="./docs/api-reference.html">API reference</a>
              <a href="./docs/models.html">Models</a>
              <a href="./docs/test-plan.html">Test plan</a>
            </div>
          </section>
        ) : null}
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

function titleFor(view: View) {
  return view.charAt(0).toUpperCase() + view.slice(1);
}

function RailButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`demo-rail-button ${active ? "active" : ""}`} onClick={onClick} type="button">
      {label}
    </button>
  );
}

function TreeButton({ active, label, count, onClick }: { active: boolean; label: string; count?: number; onClick: () => void }) {
  return (
    <button className={`demo-tree-button ${active ? "active" : ""}`} onClick={onClick} type="button">
      <span>{label}</span>
      {count ? <small>{count}</small> : null}
    </button>
  );
}

function Inspector({ label, value }: { label: string; value: string }) {
  return (
    <>
      <p className="demo-inspector-label">{label}</p>
      <p>{value}</p>
    </>
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
