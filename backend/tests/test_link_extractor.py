"""Tests for link extractor module - TDD Red phase."""
import pytest
from crawler.link_extractor import LinkExtractor


BASE_URL = "https://example.com/docs/intro"


class TestLinkExtraction:
    """Test basic link extraction from HTML."""

    def setup_method(self):
        self.extractor = LinkExtractor()

    def test_extracts_absolute_links(self):
        html = '<a href="https://example.com/docs/page1">Page 1</a>'
        links = self.extractor.extract(html, BASE_URL)
        assert "https://example.com/docs/page1" in links

    def test_extracts_relative_links(self):
        # BASE_URL = "https://example.com/docs/intro"
        # ../advanced goes up from /docs/intro to /docs/, then up one more to /
        # so result is https://example.com/advanced
        html = '<a href="../advanced">Advanced</a>'
        links = self.extractor.extract(html, BASE_URL)
        assert "https://example.com/advanced" in links

    def test_extracts_root_relative_links(self):
        html = '<a href="/docs/getting-started">Getting Started</a>'
        links = self.extractor.extract(html, BASE_URL)
        assert "https://example.com/docs/getting-started" in links

    def test_extracts_multiple_links(self):
        html = """
        <a href="/docs/page1">Page 1</a>
        <a href="/docs/page2">Page 2</a>
        <a href="/docs/page3">Page 3</a>
        """
        links = self.extractor.extract(html, BASE_URL)
        assert len(links) == 3

    def test_ignores_links_without_href(self):
        html = '<a name="anchor">Anchor</a><a href="/docs/page">Link</a>'
        links = self.extractor.extract(html, BASE_URL)
        assert len(links) == 1
        assert "https://example.com/docs/page" in links

    def test_ignores_empty_href(self):
        html = '<a href="">Empty</a><a href="/docs/page">Link</a>'
        links = self.extractor.extract(html, BASE_URL)
        assert "https://example.com/docs/page" in links
        # Empty href should not appear as a full URL
        assert BASE_URL not in links or len([l for l in links if not l]) == 0

    def test_empty_html_returns_empty_list(self):
        links = self.extractor.extract("", BASE_URL)
        assert links == []

    def test_html_with_no_links_returns_empty_list(self):
        html = "<p>No links here</p>"
        links = self.extractor.extract(html, BASE_URL)
        assert links == []

    def test_strips_fragments_from_extracted_links(self):
        html = '<a href="/docs/page#section">Page</a>'
        links = self.extractor.extract(html, BASE_URL)
        assert "https://example.com/docs/page" in links
        assert "https://example.com/docs/page#section" not in links

    def test_deduplicates_links(self):
        html = """
        <a href="/docs/page">Link 1</a>
        <a href="/docs/page">Link 2</a>
        <a href="/docs/page#section">Link 3</a>
        """
        links = self.extractor.extract(html, BASE_URL)
        assert links.count("https://example.com/docs/page") == 1


class TestRelativeLinkResolution:
    """Test relative link → absolute URL resolution."""

    def setup_method(self):
        self.extractor = LinkExtractor()

    def test_resolves_same_directory_relative(self):
        html = '<a href="page2">Page 2</a>'
        links = self.extractor.extract(html, "https://example.com/docs/intro")
        assert "https://example.com/docs/page2" in links

    def test_resolves_parent_directory_relative(self):
        html = '<a href="../other/page">Other</a>'
        links = self.extractor.extract(html, "https://example.com/docs/section/intro")
        assert "https://example.com/docs/other/page" in links

    def test_resolves_dot_slash_relative(self):
        html = '<a href="./sibling">Sibling</a>'
        links = self.extractor.extract(html, "https://example.com/docs/intro")
        assert "https://example.com/docs/sibling" in links


class TestLinkContainerExclusion:
    """Test that links inside excluded containers (header, footer) are skipped."""

    def setup_method(self):
        self.extractor = LinkExtractor()

    def test_excludes_footer_links(self):
        html = """
        <main><a href="/docs/page1">Doc</a></main>
        <footer><a href="/blog/post1">Blog</a></footer>
        """
        links = self.extractor.extract(html, BASE_URL)
        assert "https://example.com/docs/page1" in links
        assert "https://example.com/blog/post1" not in links

    def test_excludes_header_links(self):
        html = """
        <header><a href="/pricing">Pricing</a></header>
        <main><a href="/docs/page1">Doc</a></main>
        """
        links = self.extractor.extract(html, BASE_URL)
        assert "https://example.com/docs/page1" in links
        assert "https://example.com/pricing" not in links

    def test_keeps_standalone_nav_links(self):
        html = """
        <nav><a href="/docs/page1">Page 1</a></nav>
        <main><a href="/docs/page2">Page 2</a></main>
        """
        links = self.extractor.extract(html, BASE_URL)
        assert "https://example.com/docs/page1" in links
        assert "https://example.com/docs/page2" in links

    def test_excludes_nav_inside_header(self):
        html = """
        <header><nav><a href="/products">Products</a></nav></header>
        <main><a href="/docs/page1">Doc</a></main>
        """
        links = self.extractor.extract(html, BASE_URL)
        assert "https://example.com/products" not in links
        assert "https://example.com/docs/page1" in links

    def test_excludes_nav_inside_footer(self):
        html = """
        <main><a href="/docs/page1">Doc</a></main>
        <footer><nav><a href="/about">About</a></nav></footer>
        """
        links = self.extractor.extract(html, BASE_URL)
        assert "https://example.com/about" not in links
        assert "https://example.com/docs/page1" in links

    def test_excludes_both_header_and_footer(self):
        html = """
        <header><a href="/home">Home</a></header>
        <main><a href="/docs/page1">Doc</a></main>
        <footer><a href="/blog">Blog</a><a href="/changelog">Changelog</a></footer>
        """
        links = self.extractor.extract(html, BASE_URL)
        assert "https://example.com/docs/page1" in links
        assert "https://example.com/home" not in links
        assert "https://example.com/blog" not in links
        assert "https://example.com/changelog" not in links

    def test_custom_exclude_containers(self):
        extractor = LinkExtractor(exclude_containers={"aside"})
        html = """
        <main><a href="/docs/page1">Doc</a></main>
        <aside><a href="/ads/promo">Ad</a></aside>
        <footer><a href="/blog">Blog</a></footer>
        """
        links = extractor.extract(html, BASE_URL)
        assert "https://example.com/docs/page1" in links
        assert "https://example.com/ads/promo" not in links
        # Footer NOT excluded with custom set
        assert "https://example.com/blog" in links


class TestLinkDeduplication:
    """Test that links are deduplicated correctly."""

    def setup_method(self):
        self.extractor = LinkExtractor()

    def test_deduplicates_trailing_slash_variants(self):
        html = """
        <a href="/docs/page/">With slash</a>
        <a href="/docs/page">Without slash</a>
        """
        links = self.extractor.extract(html, BASE_URL)
        # Should contain exactly one version
        page_links = [l for l in links if "page" in l]
        assert len(page_links) == 1

    def test_deduplicates_scheme_and_host_case(self):
        html = """
        <a href="HTTPS://EXAMPLE.COM/docs/page">Upper</a>
        <a href="https://example.com/docs/page">Lower</a>
        """
        links = self.extractor.extract(html, BASE_URL)
        page_links = [l for l in links if "page" in l]
        assert len(page_links) == 1
