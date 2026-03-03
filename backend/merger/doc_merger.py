"""Merge multiple crawled pages into a single Markdown document."""
import re
from dataclasses import dataclass, field
from datetime import date


@dataclass
class PageData:
    """Data for a single crawled and converted page."""
    url: str
    title: str
    content: str
    order: int = 0


class DocMerger:
    """Merge multiple PageData objects into a unified Markdown document."""

    def merge(
        self,
        pages: list[PageData],
        doc_title: str,
        source_url: str,
    ) -> str:
        """
        Merge pages into a single Markdown document with:
        - Document header (title, source URL, date, page count)
        - Table of contents
        - Each page as a section (h1 → h2, h2 → h3, etc.)

        Args:
            pages: List of PageData objects to merge.
            doc_title: Title for the full document.
            source_url: Original starting URL.

        Returns:
            Complete Markdown document as a string.
        """
        sorted_pages = sorted(pages, key=lambda p: p.order)
        today = date.today().isoformat()
        total = len(sorted_pages)

        sections: list[str] = []

        # --- Document header ---
        header = (
            f"# {doc_title}\n\n"
            f"> Source: {source_url}  \n"
            f"> Generated: {today}  \n"
            f"> Total Pages: {total}\n"
        )
        sections.append(header)
        sections.append("---")

        # --- Table of contents ---
        if sorted_pages:
            toc_lines = ["## Table of Contents\n"]
            for i, page in enumerate(sorted_pages, start=1):
                slug = self._title_to_slug(page.title)
                toc_lines.append(f"{i}. [{page.title}](#{slug})")
            sections.append("\n".join(toc_lines))
            sections.append("---")

        # --- Page sections ---
        for page in sorted_pages:
            demoted = self._demote_headings(page.content)
            page_section = demoted.strip()
            # Ensure section starts with h2 for the page title
            if not page_section.startswith("## "):
                page_section = f"## {page.title}\n\n{page_section}"
            sections.append(page_section)
            sections.append("---")

        return "\n\n".join(sections)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _demote_headings(content: str) -> str:
        """Shift all ATX headings down by one level (h1→h2, h2→h3, etc.)."""
        lines = content.split("\n")
        result = []
        for line in lines:
            # Match ATX headings: one or more # followed by space
            m = re.match(r"^(#{1,5})\s+(.*)", line)
            if m:
                hashes = m.group(1)
                text = m.group(2)
                # Add one more # (max 6 levels)
                new_level = min(len(hashes) + 1, 6)
                result.append("#" * new_level + " " + text)
            else:
                result.append(line)
        return "\n".join(result)

    @staticmethod
    def _title_to_slug(title: str) -> str:
        """Convert a page title to a GitHub-style anchor slug."""
        slug = title.lower()
        slug = re.sub(r"[^\w\s-]", "", slug)
        slug = re.sub(r"[\s_]+", "-", slug)
        slug = slug.strip("-")
        return slug
