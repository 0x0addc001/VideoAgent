from __future__ import annotations

import html
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / ".pages-build"
WEB_PUBLIC = ROOT / "apps" / "web" / "public"
DOCS = ROOT / "docs"
DOCS_ASSET_VERSION = "14"

DOCUMENTS = {
    "software-design": {
        "title": "Design",
        "en": "software-design.en.md",
        "zh-CN": "software-design.md",
    },
    "software-implementation": {
        "title": "Impl",
        "en": "software-implementation.en.md",
        "zh-CN": "software-implementation.md",
    },
    "software-test-plan": {
        "title": "Test",
        "en": "software-test-plan.en.md",
        "zh-CN": "software-test-plan.md",
    },
    "api-reference": {
        "title": "API",
        "en": "api-reference.md",
        "zh-CN": "api-reference.zh.md",
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
    docs_output = OUTPUT / "docs"
    docs_output.mkdir(parents=True, exist_ok=True)

    for document_id, document in DOCUMENTS.items():
        title = str(document["title"])
        for lang, suffix in (("en", ""), ("zh-CN", ".zh")):
            source_name = str(document[lang])
            source = DOCS / source_name
            if not source.exists():
                raise FileNotFoundError(f"Missing documentation source: {source}")
            body, toc = markdown_to_html(source.read_text(encoding="utf-8"))
            output_name = f"{document_id}{suffix}.html"
            (docs_output / output_name).write_text(
                document_page(output_name, title, body, toc, lang),
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

