"""Tests for content cleaner module - TDD Red phase."""
import pytest
from converter.content_cleaner import ContentCleaner


class TestMainContentExtraction:
    """Test extraction of main body content."""

    def setup_method(self):
        self.cleaner = ContentCleaner()

    def test_extracts_main_tag(self):
        html = """
        <html><body>
          <nav>Navigation</nav>
          <main><p>Main content here</p></main>
          <footer>Footer</footer>
        </body></html>
        """
        result = self.cleaner.extract_main_content(html)
        assert "Main content here" in result
        assert "Navigation" not in result
        assert "Footer" not in result

    def test_extracts_article_tag(self):
        html = """
        <html><body>
          <header>Header</header>
          <article><p>Article content</p></article>
          <aside>Sidebar</aside>
        </body></html>
        """
        result = self.cleaner.extract_main_content(html)
        assert "Article content" in result
        assert "Sidebar" not in result

    def test_extracts_role_main(self):
        html = """
        <html><body>
          <div role="main"><p>Role main content</p></div>
          <div>Other content</div>
        </body></html>
        """
        result = self.cleaner.extract_main_content(html)
        assert "Role main content" in result

    def test_extracts_content_class(self):
        html = """
        <html><body>
          <div class="content"><p>Content class div</p></div>
          <div class="sidebar">Sidebar</div>
        </body></html>
        """
        result = self.cleaner.extract_main_content(html)
        assert "Content class div" in result
        assert "Sidebar" not in result

    def test_extracts_doc_content_class(self):
        html = """
        <html><body>
          <div class="doc-content"><p>Doc content</p></div>
        </body></html>
        """
        result = self.cleaner.extract_main_content(html)
        assert "Doc content" in result

    def test_falls_back_to_body_when_no_main(self):
        html = """
        <html><body>
          <p>Only body content</p>
        </body></html>
        """
        result = self.cleaner.extract_main_content(html)
        assert "Only body content" in result

    def test_removes_script_tags(self):
        html = """
        <html><body>
          <main>
            <script>var x = 1;</script>
            <p>Real content</p>
          </main>
        </body></html>
        """
        result = self.cleaner.extract_main_content(html)
        assert "var x = 1" not in result
        assert "Real content" in result

    def test_removes_style_tags(self):
        html = """
        <html><body>
          <main>
            <style>.foo { color: red; }</style>
            <p>Styled content</p>
          </main>
        </body></html>
        """
        result = self.cleaner.extract_main_content(html)
        assert ".foo" not in result
        assert "Styled content" in result

    def test_removes_nav_inside_main(self):
        html = """
        <html><body>
          <main>
            <nav>In-page nav</nav>
            <p>Content paragraph</p>
          </main>
        </body></html>
        """
        result = self.cleaner.extract_main_content(html)
        assert "In-page nav" not in result
        assert "Content paragraph" in result

    def test_empty_html_returns_empty_string(self):
        result = self.cleaner.extract_main_content("")
        assert result == ""

    def test_preserves_code_blocks(self):
        html = """
        <html><body>
          <main>
            <pre><code class="language-python">def hello(): pass</code></pre>
          </main>
        </body></html>
        """
        result = self.cleaner.extract_main_content(html)
        assert "def hello(): pass" in result


class TestTitleExtraction:
    """Test page title extraction."""

    def setup_method(self):
        self.cleaner = ContentCleaner()

    def test_extracts_h1_as_title(self):
        html = "<html><body><main><h1>Page Title</h1></main></body></html>"
        title = self.cleaner.extract_title(html)
        assert title == "Page Title"

    def test_extracts_title_tag_when_no_h1(self):
        html = "<html><head><title>Tab Title</title></head><body><p>Content</p></body></html>"
        title = self.cleaner.extract_title(html)
        assert title == "Tab Title"

    def test_h1_takes_priority_over_title_tag(self):
        html = """
        <html>
          <head><title>Tab Title</title></head>
          <body><h1>Page H1</h1><p>Content</p></body>
        </html>
        """
        title = self.cleaner.extract_title(html)
        assert title == "Page H1"

    def test_returns_untitled_when_no_title_found(self):
        html = "<html><body><p>Content only</p></body></html>"
        title = self.cleaner.extract_title(html)
        assert title == "Untitled"

    def test_strips_whitespace_from_title(self):
        html = "<html><body><h1>  Padded Title  </h1></body></html>"
        title = self.cleaner.extract_title(html)
        assert title == "Padded Title"

    def test_empty_html_returns_untitled(self):
        title = self.cleaner.extract_title("")
        assert title == "Untitled"

    def test_title_from_og_title_meta(self):
        html = """
        <html>
          <head><meta property="og:title" content="OG Title"></head>
          <body><p>Content</p></body>
        </html>
        """
        title = self.cleaner.extract_title(html)
        assert title == "OG Title"

    def test_h1_takes_priority_over_og_title(self):
        html = """
        <html>
          <head><meta property="og:title" content="OG Title"></head>
          <body><h1>H1 Title</h1></body>
        </html>
        """
        title = self.cleaner.extract_title(html)
        assert title == "H1 Title"
