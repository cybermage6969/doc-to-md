"""Build a split ZIP archive with token-based chunking."""
import io
import zipfile
from datetime import date
from typing import List

from merger.doc_merger import DocMerger, PageData
from utils.token_estimator import estimate_tokens

TOKENS_PER_PART = 80_000



def _chunk_pages(
    pages: List[PageData], tokens_per_part: int = TOKENS_PER_PART
) -> List[List[PageData]]:
    """
    Greedily group sorted pages into chunks that fit within a token budget.

    Each page is placed into the current chunk if it fits; otherwise a new
    chunk is started.  A single page that exceeds the budget gets its own chunk.
    """
    if not pages:
        return [[]]

    chunks: list[list] = [[]]
    current_tokens = 0

    for page in pages:
        page_tokens = estimate_tokens(page.content)
        if current_tokens > 0 and current_tokens + page_tokens > tokens_per_part:
            chunks.append([])
            current_tokens = 0
        chunks[-1].append(page)
        current_tokens += page_tokens

    return chunks


def compute_zip_parts(pages: List[PageData]) -> list[dict]:
    """Compute the ZIP chunk metadata for a set of pages.

    Returns a list of dicts with filename, page_count, estimated_tokens
    for each chunk.  Used by both the SSE event and the ZIP builder
    to ensure a single source of truth.
    """
    sorted_pages = sorted(pages, key=lambda p: p.order)
    chunks = _chunk_pages(sorted_pages)
    is_multi = len(chunks) > 1
    parts: list[dict] = []
    for idx, chunk in enumerate(chunks):
        chunk_tokens = sum(estimate_tokens(p.content) for p in chunk)
        filename = f"part-{idx + 1:03d}.md" if is_multi else "full.md"
        parts.append({
            "filename": filename,
            "page_count": len(chunk),
            "estimated_tokens": chunk_tokens,
        })
    return parts


def _render_part(pages: List[PageData]) -> str:
    """Render a list of pages into a single Markdown part file."""
    sections: list[str] = []
    for page in pages:
        demoted = DocMerger._demote_headings(page.content)
        page_section = demoted.strip()
        if not page_section.startswith("## "):
            page_section = f"## {page.title}\n\n{page_section}"
        sections.append(page_section)
    return "\n\n---\n\n".join(sections) + "\n"


def build_split_zip(pages: List[PageData], doc_title: str, source_url: str) -> bytes:
    """
    Build a ZIP archive with token-based chunking.

    Single chunk  → index.md + full.md
    Multi chunk   → index.md + part-001.md, part-002.md, ...

    Args:
        pages: List of objects with url, title, content, order attributes.
        doc_title: Title for the documentation.
        source_url: Original source URL.

    Returns:
        ZIP file content as bytes.
    """
    buf = io.BytesIO()
    today = date.today().isoformat()
    sorted_pages = sorted(pages, key=lambda p: p.order)
    chunks = _chunk_pages(sorted_pages)
    is_multi = len(chunks) > 1

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Write part files
        chunk_meta: list[tuple[str, list, int]] = []  # (filename, pages, tokens)
        for idx, chunk in enumerate(chunks):
            chunk_tokens = sum(estimate_tokens(p.content) for p in chunk)
            if is_multi:
                filename = f"part-{idx + 1:03d}.md"
            else:
                filename = "full.md"
            chunk_meta.append((filename, chunk, chunk_tokens))
            zf.writestr(filename, _render_part(chunk))

        # Build index.md
        index_lines = [
            f"# {doc_title}\n",
            f"> Source: {source_url}  ",
            f"> Generated: {today}  ",
            f"> Total Pages: {len(sorted_pages)}",
        ]
        if is_multi:
            index_lines.append(
                f"> Split into {len(chunks)} parts"
            )
        index_lines.append("")

        page_number = 1
        for part_idx, (filename, chunk_pages, chunk_tokens) in enumerate(
            chunk_meta, start=1
        ):
            if is_multi:
                index_lines.append(
                    f"## Part {part_idx} (~{chunk_tokens // 1000}K tokens)\n"
                )
            for page in chunk_pages:
                index_lines.append(f"{page_number}. [{page.title}](./{filename})")
                page_number += 1
            index_lines.append("")

        zf.writestr("index.md", "\n".join(index_lines))

    return buf.getvalue()
