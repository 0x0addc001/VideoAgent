from __future__ import annotations

import html
import json
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / ".pages-build"
WEB_PUBLIC = ROOT / "apps" / "web" / "public"
DOCS = ROOT / "docs"
DOCS_ASSET_VERSION = "34"

DOCUMENTS = {
    "product-requirements": {
        "title": "PRD",
        "en": "product/product-requirements.en.md",
        "zh-CN": "product/product-requirements.md",
    },
    "operations": {
        "title": "Ops",
        "en": "product/operations.en.md",
        "zh-CN": "product/operations.md",
    },
    "architecture": {
        "title": "Arch",
        "en": "tech/architecture.en.md",
        "zh-CN": "tech/architecture.md",
    },
    "api-reference": {
        "title": "API",
        "en": "tech/api-reference.en.md",
        "zh-CN": "tech/api-reference.md",
    },
    "models": {
        "title": "Model",
        "en": "tech/models.en.md",
        "zh-CN": "tech/models.md",
    },
    "implementation": {
        "title": "Dev",
        "en": "tech/implementation.en.md",
        "zh-CN": "tech/implementation.md",
    },
    "test-plan": {
        "title": "Test",
        "en": "tech/test-plan.en.md",
        "zh-CN": "tech/test-plan.md",
    },
    "devops": {
        "title": "DevOps",
        "en": "tech/devops.en.md",
        "zh-CN": "tech/devops.md",
    },
}

TocEntry = tuple[int, str, str]


def plain_heading(text: str) -> str:
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    return re.sub(r"[*_~]", "", text).strip()


def heading_slug(text: str, used: set[str]) -> str:
    base = re.sub(r"[^\w\u3400-\u9fff]+", "-", plain_heading(text).lower())
    base = base.strip("-") or "section"
    candidate = base
    suffix = 2
    while candidate in used:
        candidate = f"{base}-{suffix}"
        suffix += 1
    used.add(candidate)
    return candidate


def plain_markdown_text(markdown: str) -> str:
    text = re.sub(r"```[^\n]*", " ", markdown)
    text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"[#>*_~`|]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def inline_text(text: str) -> str:
    placeholders: list[str] = []

    def protect_code(match: re.Match[str]) -> str:
        placeholders.append(f"<code>{html.escape(match.group(1))}</code>")
        return f"\x00{len(placeholders) - 1}\x00"

    text = re.sub(r"`([^`]+)`", protect_code, text)
    value = html.escape(text, quote=False)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", value)

    def replace_link(match: re.Match[str]) -> str:
        label, target = match.group(1), match.group(2)
        if target.startswith("docs/"):
            target = target.removeprefix("docs/")
        target = re.sub(r"\.md(?=($|#))", ".html", target)
        return f'<a href="{target}">{label}</a>'

    value = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", replace_link, value)
    for index, snippet in enumerate(placeholders):
        value = value.replace(f"\x00{index}\x00", snippet)
    return value


def table_cells(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def is_table_separator(line: str) -> bool:
    cells = table_cells(line)
    return bool(cells) and all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells)


def markdown_to_html(markdown: str) -> tuple[str, list[TocEntry]]:
    lines = markdown.replace("\r\n", "\n").split("\n")
    output: list[str] = []
    toc: list[TocEntry] = []
    used_anchors: set[str] = set()
    paragraph: list[str] = []
    list_type: str | None = None
    index = 0

    def flush_paragraph() -> None:
        nonlocal paragraph
        if paragraph:
            output.append(f"<p>{inline_text(' '.join(paragraph))}</p>")
            paragraph = []

    def close_list() -> None:
        nonlocal list_type
        if list_type:
            output.append(f"</{list_type}>")
            list_type = None

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()

        if stripped.startswith("```"):
            flush_paragraph()
            close_list()
            language = stripped.removeprefix("```").strip()
            code: list[str] = []
            index += 1
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code.append(lines[index])
                index += 1
            class_name = f' class="language-{html.escape(language)}"' if language else ""
            output.append(
                f"<pre><code{class_name}>{html.escape(chr(10).join(code))}</code></pre>"
            )
            index += 1
            continue

        if not stripped:
            flush_paragraph()
            close_list()
            index += 1
            continue

        heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading:
            flush_paragraph()
            close_list()
            level = len(heading.group(1))
            anchor = heading_slug(heading.group(2), used_anchors)
            toc.append((level, anchor, plain_heading(heading.group(2))))
            output.append(
                f'<h{level} id="{anchor}">{inline_text(heading.group(2))}</h{level}>'
            )
            index += 1
            continue

        if stripped in {"---", "***", "___"}:
            flush_paragraph()
            close_list()
            output.append("<hr />")
            index += 1
            continue

        if "|" in stripped and index + 1 < len(lines) and is_table_separator(lines[index + 1]):
            flush_paragraph()
            close_list()
            headers = table_cells(stripped)
            rows: list[list[str]] = []
            index += 2
            while index < len(lines) and "|" in lines[index] and lines[index].strip():
                rows.append(table_cells(lines[index]))
                index += 1
            output.append("<div class=\"table-wrap\"><table><thead><tr>")
            output.extend(f"<th>{inline_text(cell)}</th>" for cell in headers)
            output.append("</tr></thead><tbody>")
            for row in rows:
                output.append("<tr>")
                output.extend(f"<td>{inline_text(cell)}</td>" for cell in row)
                output.append("</tr>")
            output.append("</tbody></table></div>")
            continue

        quote = re.match(r"^>\s?(.*)$", stripped)
        if quote:
            flush_paragraph()
            close_list()
            blockquote: list[str] = [quote.group(1)]
            index += 1
            while index < len(lines):
                continuation = re.match(r"^>\s?(.*)$", lines[index].strip())
                if not continuation:
                    break
                blockquote.append(continuation.group(1))
                index += 1
            output.append(f"<blockquote>{inline_text(' '.join(blockquote))}</blockquote>")
            continue

        unordered = re.match(r"^[-*]\s+(.+)$", stripped)
        ordered = re.match(r"^\d+\.\s+(.+)$", stripped)
        if unordered or ordered:
            flush_paragraph()
            desired = "ul" if unordered else "ol"
            if list_type != desired:
                close_list()
                output.append(f"<{desired}>")
                list_type = desired
            item = unordered.group(1) if unordered else ordered.group(1)
            output.append(f"<li>{inline_text(item)}</li>")
            index += 1
            continue

        paragraph.append(stripped)
        index += 1

    flush_paragraph()
    close_list()
    return "\n".join(output), toc


def render_toc(entries: list[TocEntry]) -> str:
    return "\n".join(
        (
            f'<a class="toc-link toc-level-{level}" href="#{html.escape(anchor, quote=True)}">'
            f"{inline_text(label)}</a>"
        )
        for level, anchor, label in entries
    )


def document_page(
    filename: str,
    title: str,
    body: str,
    toc: list[TocEntry],
    lang: str,
) -> str:
    document_title = f"{title} · VideoAgent"
    contents_label = "目录" if lang == "zh-CN" else "Contents"
    contents_kicker = "目录" if lang == "zh-CN" else "CONTENTS"
    return f"""<!doctype html>
<html lang="{html.escape(lang, quote=True)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="VideoAgent {html.escape(title)}" />
    <title>{document_title}</title>
    <link rel="icon" href="../brand-mark.svg?v=13" type="image/svg+xml" />
    <link rel="stylesheet" href="../docs.css?v={DOCS_ASSET_VERSION}" />
  </head>
  <body data-document="{html.escape(filename, quote=True)}">
    <main class="document-shell" id="document-shell">
      <aside class="document-toc" id="document-toc">
        <button
          class="toc-toggle"
          id="toc-toggle"
          type="button"
          aria-controls="toc-panel"
          aria-expanded="true"
          aria-label="{contents_label}"
        >
          <span class="toc-toggle-icon" aria-hidden="true">☰</span>
          <span class="toc-toggle-label">{contents_label}</span>
          <span class="toc-toggle-chevron" aria-hidden="true">‹</span>
        </button>
        <nav class="toc-panel" id="toc-panel" aria-label="{contents_label}">
          <p class="toc-kicker">{contents_kicker}</p>
          {render_toc(toc)}
        </nav>
      </aside>
      <article class="document">{body}</article>
    </main>
    <script src="../docs.js?v={DOCS_ASSET_VERSION}"></script>
  </body>
</html>
"""



def build_static_demo() -> None:
    """Render the public read-only demo snapshot as the Pages homepage."""
    demo_source = DOCS / "demo"
    snapshot_path = demo_source / "snapshot.json"
    if not snapshot_path.exists():
        return
    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
    shutil.copytree(demo_source, OUTPUT / "demo", dirs_exist_ok=True)

    project = snapshot["project"]
    storyboard = snapshot.get("storyboard") or {}
    assets = snapshot.get("assets") or []
    versions = snapshot.get("versions") or []
    title = html.escape(str(project.get("title", "VideoAgent demo")))
    brief = html.escape(str(project.get("brief", "")))

    def thumb(asset_id: str) -> str:
        return f"demo/media/{html.escape(asset_id)}.jpg"

    def asset_matching(prefix: str) -> dict[str, object] | None:
        return next(
            (
                asset
                for asset in assets
                if str(asset.get("filename", "")).startswith(prefix)
            ),
            None,
        )

    characters = []
    for character in storyboard.get("characters", []):
        image = asset_matching(f"character-{character['id']}-")
        image_html = (
            f'<img src="{thumb(str(image["id"]))}" alt="" loading="lazy">'
            if image
            else ""
        )
        characters.append(
            f'<article class="object">{image_html}<div><h3>{html.escape(character["name"])}</h3>'
            f'<p>{html.escape(character.get("description", ""))}</p></div></article>'
        )

    scenes = []
    for scene in storyboard.get("scenes", []):
        image = asset_matching(f"scene-{scene['id']}-")
        image_html = (
            f'<img src="{thumb(str(image["id"]))}" alt="" loading="lazy">'
            if image
            else ""
        )
        scenes.append(
            f'<article class="object">{image_html}<div><h3>{html.escape(scene["name"])}</h3>'
            f'<p>{html.escape(scene.get("location", ""))}</p></div></article>'
        )

    shots = []
    for shot in storyboard.get("shots", []):
        takes = [
            asset
            for asset in assets
            if asset.get("shot_id") == shot["id"]
            and asset.get("kind") not in {"export", "cover"}
        ]
        takes_html = "".join(
            f'<figure class="take"><img src="{thumb(str(take["id"]))}" alt="" loading="lazy">'
            f'<figcaption>{index + 1}</figcaption></figure>'
            for index, take in enumerate(takes)
        )
        shot_name = html.escape(str(shot.get("name") or shot.get("description", "")))
        shots.append(
            f'<article class="shot"><header><h3>{shot_name}</h3>'
            f'<span>{len(takes)} take{"s" if len(takes) != 1 else ""}</span></header>'
            f'<p>{html.escape(shot.get("description", ""))}</p>'
            f'<div class="takes">{takes_html}</div></article>'
        )

    versions_html = "".join(
        f'<li><strong>v{version["revision"]}</strong> {html.escape(version.get("label", ""))}'
        f'<span>{html.escape(str(version.get("created_at", ""))[:10])}</span></li>'
        for version in versions
    )
    final_cut = next(
        (asset for asset in assets if asset.get("kind") == "export"), None
    )
    final_cut_html = ""
    if final_cut:
        final_cut_html = (
            '<section class="section"><h2>Final cut</h2>'
            '<video controls playsinline poster="' + thumb(str(final_cut["id"])) + '" '
            'src="demo/final-cut.mp4"></video>'
            '<p class="note">Static snapshot: the interactive app keeps every take, '
            'version and provider setting.</p></section>'
        )

    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VideoAgent — read-only demo</title>
<style>
:root {{ color-scheme: dark; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: #080807; color: #f4f4f5; font: 14px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }}
main {{ max-width: 1080px; margin: 0 auto; padding: 48px 24px 72px; }}
.badge {{ display: inline-flex; gap: 8px; align-items: center; border: 1px solid rgba(52,211,153,.35); background: rgba(52,211,153,.1); color: #6ee7b7; border-radius: 999px; padding: 4px 12px; font-size: 11px; font-weight: 600; letter-spacing: .04em; }}
.badge span {{ color: #9ca3af; font-weight: 400; letter-spacing: 0; }}
h1 {{ font-size: clamp(24px, 4vw, 36px); line-height: 1.25; margin: 18px 0 10px; }}
h2 {{ font-size: 18px; margin: 0 0 12px; }}
h3 {{ font-size: 14px; margin: 0 0 4px; }}
p {{ margin: 0; color: #a1a1aa; }}
.brief {{ max-width: 760px; color: #a1a1aa; }}
.section {{ margin-top: 40px; border-top: 1px solid rgba(255,255,255,.08); padding-top: 28px; }}
.grid {{ display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }}
.card {{ border: 1px solid rgba(255,255,255,.1); border-radius: 14px; padding: 16px; background: rgba(255,255,255,.02); }}
.card b {{ color: #7bc6ff; font-size: 12px; }}
.object {{ display: flex; gap: 12px; border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 12px; }}
.object img {{ width: 84px; height: 84px; border-radius: 8px; object-fit: cover; }}
.object p {{ font-size: 12px; }}
.shot {{ border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 16px; margin-top: 12px; }}
.shot header {{ display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }}
.shot header span {{ color: #71717a; font-size: 11px; }}
.shot > p {{ font-size: 12px; margin-top: 6px; }}
.takes {{ display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }}
.take {{ position: relative; margin: 0; width: 96px; }}
.take img {{ width: 96px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255,255,255,.12); }}
.take figcaption {{ position: absolute; left: 4px; bottom: 4px; background: rgba(0,0,0,.7); border-radius: 4px; padding: 0 4px; font-size: 10px; }}
video {{ width: 100%; max-width: 420px; border-radius: 16px; border: 1px solid rgba(255,255,255,.12); display: block; }}
.note {{ margin-top: 10px; font-size: 12px; color: #71717a; }}
ul {{ list-style: none; padding: 0; margin: 0; }}
li {{ display: flex; gap: 10px; border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 10px 12px; margin-top: 8px; font-size: 12px; }}
li span {{ margin-left: auto; color: #71717a; }}
footer {{ margin-top: 48px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,.08); text-align: center; color: #52525b; font-size: 11px; }}
a {{ color: #7bc6ff; }}
</style>
</head>
<body>
<main>
<div class="badge">READ-ONLY DEMO <span>demo@videoagent.local</span></div>
<h1>{title}</h1>
<p class="brief">{brief}</p>
<section class="section"><h2>Procedures</h2><div class="grid">
<div class="card"><b>Configs</b><p>Project settings: aspect, duration, model and style.</p></div>
<div class="card"><b>Interfaces</b><p>{len(shots)} shot contracts, approved before rendering.</p></div>
<div class="card"><b>Implementations</b><p>{len(versions)} storyboard version snapshots.</p></div>
</div></section>
<section class="section"><h2>Objects</h2><div class="grid">
<div><h3>Characters</h3>{''.join(characters) or '<p>None yet.</p>'}</div>
<div><h3>Scenes</h3>{''.join(scenes) or '<p>None yet.</p>'}</div>
</div></section>
<section class="section"><h2>Shots and takes</h2>{''.join(shots)}</section>
{final_cut_html}
<section class="section"><h2>Versions</h2><ul>{versions_html}</ul></section>
<footer>Generated By VideoAgent · <a href="docs/">Documentation</a></footer>
</main>
</body>
</html>
"""
    (OUTPUT / "index.html").write_text(page, encoding="utf-8")


def main() -> None:
    node = shutil.which("node")
    vite = ROOT / "apps" / "landing" / "node_modules" / "vite" / "bin" / "vite.js"
    if node is None or not vite.exists():
        raise RuntimeError("Node.js and the workspace Vite dependency are required")

    subprocess.run(
        [node, str(vite), "build"],
        cwd=ROOT / "apps" / "landing",
        check=True,
    )
    build_static_demo()
    docs_output = OUTPUT / "docs"
    docs_output.mkdir(parents=True, exist_ok=True)
    search_index: list[dict[str, str]] = []

    for document_id, document in DOCUMENTS.items():
        title = str(document["title"])
        for lang, suffix in (("en", ""), ("zh-CN", ".zh")):
            source_name = str(document[lang])
            source = DOCS / source_name
            if not source.exists():
                raise FileNotFoundError(f"Missing documentation source: {source}")
            markdown = source.read_text(encoding="utf-8")
            body, toc = markdown_to_html(markdown)
            output_name = f"{document_id}{suffix}.html"
            (docs_output / output_name).write_text(
                document_page(output_name, title, body, toc, lang),
                encoding="utf-8",
            )
            search_index.append(
                {
                    "document": output_name,
                    "documentId": document_id,
                    "lang": lang,
                    "title": title,
                    "text": plain_markdown_text(markdown),
                }
            )

    (docs_output / "docs-search.json").write_text(
        json.dumps(search_index, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    web_docs = WEB_PUBLIC / "docs"
    if web_docs.exists():
        shutil.rmtree(web_docs)
    shutil.copytree(docs_output, web_docs)
    shutil.copy2(WEB_PUBLIC / "docs.css", OUTPUT / "docs.css")
    shutil.copy2(WEB_PUBLIC / "docs.js", OUTPUT / "docs.js")

    print(f"Built GitHub Pages artifact at {OUTPUT}")


if __name__ == "__main__":
    main()

