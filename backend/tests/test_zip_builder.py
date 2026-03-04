"""Tests for ZIP builder with token-based chunking."""
import io
import zipfile

from merger.zip_builder import (
    TOKENS_PER_PART,
    build_split_zip,
    compute_zip_parts,
    _chunk_pages,
)
from merger.doc_merger import PageData



def _make_page(title: str, content: str, order: int = 0) -> PageData:
    return PageData(
        url=f"https://example.com/{title.lower().replace(' ', '-')}",
        title=title,
        content=content,
        order=order,
    )


class TestChunkPages:
    """Test the greedy token-based chunking algorithm."""

    def test_single_small_page_one_chunk(self):
        pages = [_make_page("Intro", "Hello world", 0)]
        chunks = _chunk_pages(pages)
        assert len(chunks) == 1
        assert len(chunks[0]) == 1

    def test_multiple_small_pages_single_chunk(self):
        pages = [_make_page(f"Page {i}", "short", i) for i in range(5)]
        chunks = _chunk_pages(pages)
        assert len(chunks) == 1
        assert len(chunks[0]) == 5

    def test_pages_split_when_exceeding_budget(self):
        # Each page ~20K tokens → 4 chars/token → 80K chars
        big_content = "x" * (20_000 * 4)
        pages = [_make_page(f"Page {i}", big_content, i) for i in range(5)]
        chunks = _chunk_pages(pages)
        # 80K budget: each page ~20K tokens, so 4 pages fit, 5th starts new chunk
        assert len(chunks) == 2
        assert len(chunks[0]) == 4
        assert len(chunks[1]) == 1

    def test_single_oversized_page_gets_own_chunk(self):
        # One page exceeding the budget should still be in its own chunk
        huge_content = "x" * (TOKENS_PER_PART * 4 + 100)
        pages = [
            _make_page("Small", "tiny", 0),
            _make_page("Huge", huge_content, 1),
            _make_page("After", "tiny", 2),
        ]
        chunks = _chunk_pages(pages)
        assert len(chunks) == 3
        assert chunks[0][0].title == "Small"
        assert chunks[1][0].title == "Huge"
        assert chunks[2][0].title == "After"

    def test_preserves_page_order(self):
        pages = [_make_page(f"P{i}", "content", i) for i in range(10)]
        chunks = _chunk_pages(pages)
        flat = [p for chunk in chunks for p in chunk]
        assert [p.order for p in flat] == list(range(10))

    def test_custom_budget(self):
        # 100 tokens budget, each page ~25 tokens (100 chars / 4)
        content = "a" * 100
        pages = [_make_page(f"P{i}", content, i) for i in range(5)]
        chunks = _chunk_pages(pages, tokens_per_part=100)
        # Each ~25 tokens → 4 fit in 100, 5th starts new chunk
        assert len(chunks) == 2


class TestBuildSplitZipSingleChunk:
    """When all pages fit in one chunk → full.md (no part numbering)."""

    def _make_pages(self) -> list[PageData]:
        return [
            _make_page("Introduction", "Intro content", 0),
            _make_page("Setup Guide", "Setup content", 1),
        ]

    def test_zip_is_valid(self):
        zip_bytes = build_split_zip(
            self._make_pages(), "My Docs", "https://example.com"
        )
        assert zipfile.is_zipfile(io.BytesIO(zip_bytes))

    def test_contains_index_and_full_md(self):
        zip_bytes = build_split_zip(
            self._make_pages(), "My Docs", "https://example.com"
        )
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            names = zf.namelist()
            assert "index.md" in names
            assert "full.md" in names
            assert len(names) == 2

    def test_full_md_contains_all_pages(self):
        zip_bytes = build_split_zip(
            self._make_pages(), "My Docs", "https://example.com"
        )
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            content = zf.read("full.md").decode()
            assert "## Introduction" in content
            assert "Intro content" in content
            assert "## Setup Guide" in content
            assert "Setup content" in content

    def test_full_md_has_separator_between_pages(self):
        zip_bytes = build_split_zip(
            self._make_pages(), "My Docs", "https://example.com"
        )
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            content = zf.read("full.md").decode()
            assert "---" in content

    def test_index_links_to_full_md(self):
        zip_bytes = build_split_zip(
            self._make_pages(), "My Docs", "https://example.com"
        )
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            index = zf.read("index.md").decode()
            assert "[Introduction](./full.md)" in index
            assert "[Setup Guide](./full.md)" in index

    def test_index_has_header_info(self):
        zip_bytes = build_split_zip(
            self._make_pages(), "My Docs", "https://example.com"
        )
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            index = zf.read("index.md").decode()
            assert "# My Docs" in index
            assert "https://example.com" in index
            assert "Total Pages: 2" in index

    def test_headings_demoted_in_full_md(self):
        pages = [_make_page("Test", "# Top Level\n\nSome text\n\n## Sub", 0)]
        zip_bytes = build_split_zip(pages, "Docs", "https://example.com")
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            content = zf.read("full.md").decode()
            # h1 should become h2, h2 should become h3
            assert "## Top Level" in content
            assert "### Sub" in content
            # Should not have original h1 (check line-start)
            lines = content.split("\n")
            assert not any(line == "# Top Level" for line in lines)


class TestBuildSplitZipMultiChunk:
    """When pages exceed budget → part-001.md, part-002.md, etc."""

    def _make_big_pages(self, count: int = 5) -> list[PageData]:
        # Each page ~20K tokens
        big_content = "x" * (20_000 * 4)
        return [_make_page(f"Page {i}", big_content, i) for i in range(count)]

    def test_produces_multiple_parts(self):
        zip_bytes = build_split_zip(
            self._make_big_pages(), "Big Docs", "https://example.com"
        )
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            names = zf.namelist()
            assert "part-001.md" in names
            assert "part-002.md" in names
            assert "full.md" not in names

    def test_index_groups_by_part(self):
        zip_bytes = build_split_zip(
            self._make_big_pages(), "Big Docs", "https://example.com"
        )
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            index = zf.read("index.md").decode()
            assert "## Part 1" in index
            assert "## Part 2" in index
            assert "part-001.md" in index
            assert "part-002.md" in index

    def test_index_shows_token_estimate(self):
        zip_bytes = build_split_zip(
            self._make_big_pages(), "Big Docs", "https://example.com"
        )
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            index = zf.read("index.md").decode()
            assert "tokens)" in index

    def test_index_shows_split_count(self):
        zip_bytes = build_split_zip(
            self._make_big_pages(), "Big Docs", "https://example.com"
        )
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            index = zf.read("index.md").decode()
            assert "Split into" in index

    def test_part_files_contain_correct_pages(self):
        zip_bytes = build_split_zip(
            self._make_big_pages(5), "Big Docs", "https://example.com"
        )
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            part1 = zf.read("part-001.md").decode()
            part2 = zf.read("part-002.md").decode()
            # First 4 pages in part 1, 5th in part 2
            assert "## Page 0" in part1
            assert "## Page 3" in part1
            assert "## Page 4" in part2

    def test_part_files_have_separators(self):
        zip_bytes = build_split_zip(
            self._make_big_pages(5), "Big Docs", "https://example.com"
        )
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            part1 = zf.read("part-001.md").decode()
            assert "---" in part1

    def test_total_file_count(self):
        zip_bytes = build_split_zip(
            self._make_big_pages(5), "Big Docs", "https://example.com"
        )
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            # index.md + 2 part files = 3
            assert len(zf.namelist()) == 3


class TestBuildSplitZipEdgeCases:
    def test_empty_pages(self):
        zip_bytes = build_split_zip([], "Empty", "https://example.com")
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            names = zf.namelist()
            assert "index.md" in names
            assert "full.md" in names

    def test_single_page(self):
        pages = [_make_page("Only Page", "content", 0)]
        zip_bytes = build_split_zip(pages, "Solo", "https://example.com")
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            names = zf.namelist()
            assert "full.md" in names
            assert len(names) == 2

    def test_pages_sorted_by_order(self):
        pages = [
            _make_page("Second", "b", 1),
            _make_page("First", "a", 0),
        ]
        zip_bytes = build_split_zip(pages, "Sorted", "https://example.com")
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            content = zf.read("full.md").decode()
            first_pos = content.index("## First")
            second_pos = content.index("## Second")
            assert first_pos < second_pos


class TestComputeZipParts:
    """Test the public compute_zip_parts helper."""

    def test_single_chunk_returns_full_md(self):
        pages = [_make_page("Intro", "Hello world", 0)]
        parts = compute_zip_parts(pages)
        assert len(parts) == 1
        assert parts[0]["filename"] == "full.md"
        assert parts[0]["page_count"] == 1
        assert parts[0]["estimated_tokens"] > 0

    def test_multi_chunk_returns_parts(self):
        big_content = "x" * (20_000 * 4)
        pages = [_make_page(f"Page {i}", big_content, i) for i in range(5)]
        parts = compute_zip_parts(pages)
        assert len(parts) == 2
        assert parts[0]["filename"] == "part-001.md"
        assert parts[1]["filename"] == "part-002.md"
        assert parts[0]["page_count"] == 4
        assert parts[1]["page_count"] == 1

    def test_matches_actual_zip_structure(self):
        big_content = "x" * (20_000 * 4)
        pages = [_make_page(f"Page {i}", big_content, i) for i in range(5)]
        parts = compute_zip_parts(pages)
        zip_bytes = build_split_zip(pages, "Docs", "https://example.com")
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            zip_files = [n for n in zf.namelist() if n != "index.md"]
            assert [p["filename"] for p in parts] == sorted(zip_files)

    def test_empty_pages(self):
        parts = compute_zip_parts([])
        assert len(parts) == 1
        assert parts[0]["filename"] == "full.md"
        assert parts[0]["page_count"] == 0
