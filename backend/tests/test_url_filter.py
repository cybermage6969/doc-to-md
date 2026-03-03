"""Tests for URL filter module - written BEFORE implementation (TDD Red phase)."""
import pytest
from crawler.url_filter import UrlFilter


class TestUrlFilterInferPrefix:
    """Test base path prefix inference from starting URL."""

    def test_infer_docs_prefix(self):
        """Should detect /docs/ as base prefix."""
        f = UrlFilter("https://example.com/docs/intro")
        assert f.base_prefix == "https://example.com/docs"

    def test_infer_documentation_prefix(self):
        """Should detect /documentation/ as base prefix."""
        f = UrlFilter("https://example.com/documentation/start")
        assert f.base_prefix == "https://example.com/documentation"

    def test_infer_guide_prefix(self):
        """Should detect /guide/ as base prefix."""
        f = UrlFilter("https://example.com/guide/overview")
        assert f.base_prefix == "https://example.com/guide"

    def test_infer_api_prefix(self):
        """Should detect /api-reference/ as base prefix."""
        f = UrlFilter("https://example.com/api-reference/endpoints")
        assert f.base_prefix == "https://example.com/api-reference"

    def test_infer_root_when_no_known_segment(self):
        """Should use domain root when no known doc segment found."""
        f = UrlFilter("https://example.com/some/page")
        assert f.base_prefix == "https://example.com"

    def test_infer_root_for_homepage(self):
        """Should use domain root for homepage."""
        f = UrlFilter("https://example.com/")
        assert f.base_prefix == "https://example.com"

    def test_preserves_subdomain(self):
        """Should preserve subdomain in base prefix."""
        f = UrlFilter("https://docs.example.com/reference/v2")
        assert f.base_prefix == "https://docs.example.com"

    def test_infer_manual_prefix(self):
        """Should detect /manual/ as base prefix."""
        f = UrlFilter("https://example.com/manual/chapter1")
        assert f.base_prefix == "https://example.com/manual"


class TestUrlFilterTighterPrefix:
    """Test tighter prefix when 2+ segments follow the DOC_SEGMENT."""

    def test_tighter_prefix_with_subsection(self):
        """2 segments after 'docs' → use /docs/claude-code as prefix."""
        f = UrlFilter("https://example.com/docs/claude-code/overview")
        assert f.base_prefix == "https://example.com/docs/claude-code"

    def test_tighter_prefix_deep_path(self):
        """3 segments after 'docs' → still use /docs/claude-code."""
        f = UrlFilter("https://example.com/docs/claude-code/getting-started/install")
        assert f.base_prefix == "https://example.com/docs/claude-code"

    def test_keeps_docs_for_single_child(self):
        """1 segment after 'docs' → keep /docs."""
        f = UrlFilter("https://example.com/docs/intro")
        assert f.base_prefix == "https://example.com/docs"

    def test_keeps_docs_for_no_child(self):
        """0 segments after 'docs' → keep /docs."""
        f = UrlFilter("https://example.com/docs")
        assert f.base_prefix == "https://example.com/docs"

    def test_tighter_prefix_with_guide_segment(self):
        """Works with other DOC_SEGMENTS like /guide."""
        f = UrlFilter("https://example.com/guide/react/hooks/use-state")
        assert f.base_prefix == "https://example.com/guide/react"

    def test_tighter_prefix_with_learn_segment(self):
        """Works with /learn segment."""
        f = UrlFilter("https://example.com/learn/python/basics")
        assert f.base_prefix == "https://example.com/learn/python"

    def test_rejects_sibling_docs_with_tighter_prefix(self):
        """Sibling doc sections should be rejected by tighter prefix."""
        f = UrlFilter("https://example.com/docs/claude-code/overview")
        assert f.is_allowed("https://example.com/docs/claude-code/api") is True
        assert f.is_allowed("https://example.com/docs/other-product/intro") is False


class TestUrlFilterScopePath:
    """Test user-provided scope_path override."""

    def test_scope_path_overrides_auto_detection(self):
        f = UrlFilter("https://example.com/docs/claude-code/overview", scope_path="/docs/claude-code")
        assert f.base_prefix == "https://example.com/docs/claude-code"

    def test_scope_path_allows_matching_urls(self):
        f = UrlFilter("https://example.com/docs/intro", scope_path="/docs/claude-code")
        assert f.is_allowed("https://example.com/docs/claude-code/api") is True

    def test_scope_path_rejects_non_matching_urls(self):
        f = UrlFilter("https://example.com/docs/intro", scope_path="/docs/claude-code")
        assert f.is_allowed("https://example.com/docs/other/page") is False

    def test_scope_path_strips_trailing_slash(self):
        f = UrlFilter("https://example.com/docs/intro", scope_path="/docs/claude-code/")
        assert f.base_prefix == "https://example.com/docs/claude-code"

    def test_none_scope_path_uses_auto_detection(self):
        f = UrlFilter("https://example.com/docs/intro", scope_path=None)
        assert f.base_prefix == "https://example.com/docs"

    def test_scope_path_broader_than_auto(self):
        """User can set a broader scope than auto-detection."""
        f = UrlFilter("https://example.com/docs/claude-code/overview", scope_path="/docs")
        assert f.base_prefix == "https://example.com/docs"
        assert f.is_allowed("https://example.com/docs/other-product/page") is True


class TestUrlFilterAllowReject:
    """Test URL allow/reject logic."""

    def setup_method(self):
        self.filter = UrlFilter("https://example.com/docs/intro")

    def test_allows_same_prefix_url(self):
        assert self.filter.is_allowed("https://example.com/docs/advanced") is True

    def test_allows_nested_url(self):
        assert self.filter.is_allowed("https://example.com/docs/section/page") is True

    def test_rejects_different_domain(self):
        assert self.filter.is_allowed("https://other.com/docs/intro") is False

    def test_rejects_outside_prefix(self):
        assert self.filter.is_allowed("https://example.com/blog/post") is False

    def test_rejects_pdf_extension(self):
        assert self.filter.is_allowed("https://example.com/docs/file.pdf") is False

    def test_rejects_image_extensions(self):
        assert self.filter.is_allowed("https://example.com/docs/img.png") is False
        assert self.filter.is_allowed("https://example.com/docs/img.jpg") is False
        assert self.filter.is_allowed("https://example.com/docs/img.svg") is False

    def test_rejects_css_and_js(self):
        assert self.filter.is_allowed("https://example.com/docs/style.css") is False
        assert self.filter.is_allowed("https://example.com/docs/app.js") is False

    def test_rejects_login_page(self):
        assert self.filter.is_allowed("https://example.com/docs/../login") is False
        assert self.filter.is_allowed("https://example.com/login") is False

    def test_rejects_signup_page(self):
        assert self.filter.is_allowed("https://example.com/signup") is False

    def test_rejects_auth_page(self):
        assert self.filter.is_allowed("https://example.com/auth/callback") is False

    def test_rejects_empty_string(self):
        assert self.filter.is_allowed("") is False

    def test_rejects_mailto(self):
        assert self.filter.is_allowed("mailto:user@example.com") is False

    def test_rejects_javascript_url(self):
        assert self.filter.is_allowed("javascript:void(0)") is False

    def test_rejects_anchor_only(self):
        assert self.filter.is_allowed("#section") is False

    def test_rejects_xml_extension(self):
        assert self.filter.is_allowed("https://example.com/docs/feed.xml") is False


class TestUrlNormalization:
    """Test URL normalization."""

    def setup_method(self):
        self.filter = UrlFilter("https://example.com/docs/intro")

    def test_removes_fragment(self):
        normalized = self.filter.normalize("https://example.com/docs/page#section")
        assert normalized == "https://example.com/docs/page"

    def test_removes_trailing_slash(self):
        normalized = self.filter.normalize("https://example.com/docs/page/")
        assert normalized == "https://example.com/docs/page"

    def test_preserves_query_params(self):
        normalized = self.filter.normalize("https://example.com/docs/page?v=2")
        assert normalized == "https://example.com/docs/page?v=2"

    def test_lowercases_scheme_and_host(self):
        normalized = self.filter.normalize("HTTPS://Example.COM/docs/page")
        assert normalized == "https://example.com/docs/page"

    def test_empty_string_returns_empty(self):
        normalized = self.filter.normalize("")
        assert normalized == ""

    def test_root_url_normalization(self):
        normalized = self.filter.normalize("https://example.com/")
        assert normalized == "https://example.com"


class TestUrlFilterVisited:
    """Test visited URL tracking."""

    def test_tracks_visited_urls(self):
        f = UrlFilter("https://example.com/docs/")
        f.mark_visited("https://example.com/docs/page1")
        assert f.is_visited("https://example.com/docs/page1") is True

    def test_unvisited_url_returns_false(self):
        f = UrlFilter("https://example.com/docs/")
        assert f.is_visited("https://example.com/docs/page1") is False

    def test_visited_count(self):
        f = UrlFilter("https://example.com/docs/")
        f.mark_visited("https://example.com/docs/page1")
        f.mark_visited("https://example.com/docs/page2")
        assert f.visited_count == 2
