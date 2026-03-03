"""Tests for document merger module - TDD Red phase."""
import pytest
from datetime import date
from merger.doc_merger import DocMerger, PageData


class TestPageDataModel:
    """Test the PageData data class."""

    def test_creates_page_data(self):
        page = PageData(url="https://example.com/docs/page", title="Page Title", content="# Content")
        assert page.url == "https://example.com/docs/page"
        assert page.title == "Page Title"
        assert page.content == "# Content"

    def test_page_data_order_field(self):
        page = PageData(url="https://example.com/docs/page", title="Page", content="Content", order=5)
        assert page.order == 5

    def test_page_data_default_order(self):
        page = PageData(url="https://example.com/docs/page", title="Page", content="Content")
        assert page.order == 0


class TestDocMergerMerge:
    """Test multi-page merge functionality."""

    def setup_method(self):
        self.merger = DocMerger()

    def test_merges_multiple_pages(self):
        pages = [
            PageData(url="https://example.com/docs/page1", title="Page 1", content="Content 1", order=0),
            PageData(url="https://example.com/docs/page2", title="Page 2", content="Content 2", order=1),
        ]
        result = self.merger.merge(
            pages=pages,
            doc_title="Documentation",
            source_url="https://example.com/docs",
        )
        assert "Page 1" in result
        assert "Page 2" in result
        assert "Content 1" in result
        assert "Content 2" in result

    def test_includes_doc_title_as_h1(self):
        pages = [PageData(url="u", title="T", content="C")]
        result = self.merger.merge(pages=pages, doc_title="My Docs", source_url="https://example.com")
        assert "# My Docs" in result

    def test_includes_source_url(self):
        pages = [PageData(url="u", title="T", content="C")]
        result = self.merger.merge(pages=pages, doc_title="Docs", source_url="https://example.com/docs")
        assert "https://example.com/docs" in result

    def test_includes_generated_date(self):
        pages = [PageData(url="u", title="T", content="C")]
        result = self.merger.merge(pages=pages, doc_title="Docs", source_url="https://example.com")
        today = date.today().isoformat()
        assert today in result

    def test_includes_total_pages_count(self):
        pages = [
            PageData(url="u1", title="T1", content="C1"),
            PageData(url="u2", title="T2", content="C2"),
            PageData(url="u3", title="T3", content="C3"),
        ]
        result = self.merger.merge(pages=pages, doc_title="Docs", source_url="https://example.com")
        assert "3" in result

    def test_pages_separated_by_horizontal_rule(self):
        pages = [
            PageData(url="u1", title="T1", content="C1"),
            PageData(url="u2", title="T2", content="C2"),
        ]
        result = self.merger.merge(pages=pages, doc_title="Docs", source_url="https://example.com")
        assert "---" in result

    def test_empty_pages_list(self):
        result = self.merger.merge(pages=[], doc_title="Docs", source_url="https://example.com")
        # Should return a minimal document with just the header
        assert "# Docs" in result

    def test_page_order_respected(self):
        pages = [
            PageData(url="u2", title="Page B", content="Content B", order=1),
            PageData(url="u1", title="Page A", content="Content A", order=0),
        ]
        result = self.merger.merge(pages=pages, doc_title="Docs", source_url="https://example.com")
        pos_a = result.index("Page A")
        pos_b = result.index("Page B")
        assert pos_a < pos_b


class TestTableOfContents:
    """Test table of contents generation."""

    def setup_method(self):
        self.merger = DocMerger()

    def test_includes_table_of_contents_section(self):
        pages = [
            PageData(url="u1", title="Introduction", content="Content", order=0),
            PageData(url="u2", title="Advanced Topics", content="Content", order=1),
        ]
        result = self.merger.merge(pages=pages, doc_title="Docs", source_url="https://example.com")
        assert "Table of Contents" in result

    def test_toc_contains_page_titles(self):
        pages = [
            PageData(url="u1", title="Introduction", content="Content", order=0),
            PageData(url="u2", title="Advanced Topics", content="Content", order=1),
        ]
        result = self.merger.merge(pages=pages, doc_title="Docs", source_url="https://example.com")
        assert "Introduction" in result
        assert "Advanced Topics" in result

    def test_toc_before_content(self):
        pages = [
            PageData(url="u1", title="First Page", content="First content"),
        ]
        result = self.merger.merge(pages=pages, doc_title="Docs", source_url="https://example.com")
        toc_pos = result.index("Table of Contents")
        content_pos = result.index("First content")
        assert toc_pos < content_pos

    def test_no_toc_for_empty_pages(self):
        result = self.merger.merge(pages=[], doc_title="Docs", source_url="https://example.com")
        # Empty pages still show header but no TOC entries required
        assert "# Docs" in result


class TestHeadingLevelAdjustment:
    """Test that page h1 headings are demoted to h2 in merged output."""

    def setup_method(self):
        self.merger = DocMerger()

    def test_page_h1_becomes_h2_in_output(self):
        pages = [
            PageData(url="u1", title="Page Title", content="# Page Title\n\nContent here"),
        ]
        result = self.merger.merge(pages=pages, doc_title="Full Docs", source_url="https://example.com")
        # The doc title is h1, so page sections should be h2
        assert "## Page Title" in result

    def test_page_h2_becomes_h3_in_output(self):
        pages = [
            PageData(url="u1", title="Page Title", content="# Page Title\n\n## Section\n\nContent"),
        ]
        result = self.merger.merge(pages=pages, doc_title="Full Docs", source_url="https://example.com")
        assert "### Section" in result
