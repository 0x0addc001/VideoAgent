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

DOCUMENTS = {
    "software-design.md": ("Software Design", "软件设计说明书"),
    "software-implementation.md": ("Implementation Guide", "软件实现说明"),
    "software-test-plan.md": ("Testing & TDD", "软件测试与 TDD 规范"),
    "api-reference.md": ("API Reference", "API 接口文档"),
}


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


def markdown_to_html(markdown: str) -> str:
    lines = markdown.replace("\r\n", "\n").split("\n")
    output: list[str] = []
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
            output.append(f"<h{level}>{inline_text(heading.group(2))}</h{level}>")
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
    return "\n".join(output)


def document_page(filename: str, title_en: str, title_zh: str, body: str) -> str:
    document_title = f"{title_en} · VideoAgent"
    return f"""<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="VideoAgent {html.escape(title_en)}" />
    <title>{document_title}</title>
    <link rel="icon" href="../brand-mark.svg?v=10" type="image/svg+xml" />
    <link rel="stylesheet" href="../docs.css" />
  </head>
  <body>
    <header class="doc-header">
      <a class="doc-brand" href="../">VideoAgent</a>
      <span>/</span>
      <span>{html.escape(title_en)}</span>
      <div class="doc-actions">
        <button class="theme-toggle" id="theme-toggle" type="button" aria-label="Switch theme">
          <span class="theme-icon" aria-hidden="true">◐</span>
          <span class="theme-label">Dark</span>
        </button>
      </div>
    </header>
    <main class="document-shell">
      <aside class="document-meta">
        <span>PROJECT DOCUMENT</span>
        <strong>{html.escape(title_en)}</strong>
        <small>{html.escape(title_zh)}</small>
      </aside>
      <article class="document">{body}</article>
    </main>
    <script src="../docs.js"></script>
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

    for filename, (title_en, title_zh) in DOCUMENTS.items():
        source = DOCS / filename
        if not source.exists():
            raise FileNotFoundError(f"Missing documentation source: {source}")
        body = markdown_to_html(source.read_text(encoding="utf-8"))
        (docs_output / filename.replace(".md", ".html")).write_text(
            document_page(filename, title_en, title_zh, body),
            encoding="utf-8",
        )

    web_docs = WEB_PUBLIC / "docs"
    if web_docs.exists():
        shutil.rmtree(web_docs)
    shutil.copytree(docs_output, web_docs)
    shutil.copy2(ROOT / "site" / "docs.css", WEB_PUBLIC / "docs.css")
    shutil.copy2(ROOT / "site" / "docs.js", WEB_PUBLIC / "docs.js")

    print(f"Built GitHub Pages artifact at {OUTPUT}")


if __name__ == "__main__":
    main()

