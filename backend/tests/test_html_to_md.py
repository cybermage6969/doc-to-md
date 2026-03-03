"""Tests for HTML to Markdown converter - TDD Red phase."""
import pytest
from converter.html_to_md import HtmlToMarkdown


class TestBasicConversion:
    """Test basic HTML element conversion."""

    def setup_method(self):
        self.converter = HtmlToMarkdown()

    def test_converts_heading_h1(self):
        result = self.converter.convert("<h1>Hello World</h1>")
        assert "# Hello World" in result

    def test_converts_heading_h2(self):
        result = self.converter.convert("<h2>Section</h2>")
        assert "## Section" in result

    def test_converts_heading_h3(self):
        result = self.converter.convert("<h3>Subsection</h3>")
        assert "### Subsection" in result

    def test_converts_paragraph(self):
        result = self.converter.convert("<p>Simple paragraph text</p>")
        assert "Simple paragraph text" in result

    def test_converts_bold(self):
        result = self.converter.convert("<p><strong>bold text</strong></p>")
        assert "**bold text**" in result

    def test_converts_italic(self):
        result = self.converter.convert("<p><em>italic text</em></p>")
        assert "*italic text*" in result

    def test_converts_unordered_list(self):
        html = "<ul><li>Item 1</li><li>Item 2</li></ul>"
        result = self.converter.convert(html)
        assert "* Item 1" in result or "- Item 1" in result
        assert "* Item 2" in result or "- Item 2" in result

    def test_converts_ordered_list(self):
        html = "<ol><li>First</li><li>Second</li></ol>"
        result = self.converter.convert(html)
        assert "1. First" in result
        assert "2. Second" in result

    def test_converts_link(self):
        html = '<a href="https://example.com">Example</a>'
        result = self.converter.convert(html)
        assert "[Example](https://example.com)" in result

    def test_converts_image(self):
        html = '<img src="image.png" alt="Alt text">'
        result = self.converter.convert(html)
        assert "![Alt text](image.png)" in result

    def test_empty_input_returns_empty_string(self):
        result = self.converter.convert("")
        assert result == ""

    def test_plain_text_preserved(self):
        result = self.converter.convert("<p>Just text</p>")
        assert "Just text" in result


class TestCodeBlockConversion:
    """Test code block conversion with language identifiers."""

    def setup_method(self):
        self.converter = HtmlToMarkdown()

    def test_converts_inline_code(self):
        html = "<p>Use <code>print()</code> function</p>"
        result = self.converter.convert(html)
        assert "`print()`" in result

    def test_converts_code_block_with_language(self):
        html = '<pre><code class="language-python">def hello():\n    pass</code></pre>'
        result = self.converter.convert(html)
        assert "```python" in result
        assert "def hello():" in result

    def test_converts_code_block_without_language(self):
        html = "<pre><code>plain code block</code></pre>"
        result = self.converter.convert(html)
        assert "```" in result
        assert "plain code block" in result

    def test_preserves_code_block_language_js(self):
        html = '<pre><code class="language-javascript">const x = 1;</code></pre>'
        result = self.converter.convert(html)
        assert "```javascript" in result or "```js" in result

    def test_preserves_code_block_language_bash(self):
        html = '<pre><code class="language-bash">echo hello</code></pre>'
        result = self.converter.convert(html)
        assert "```bash" in result

    def test_preserves_newlines_in_code_block(self):
        html = "<pre><code>line1\nline2\nline3</code></pre>"
        result = self.converter.convert(html)
        assert "line1" in result
        assert "line2" in result
        assert "line3" in result


class TestTableConversion:
    """Test HTML table to Markdown table conversion."""

    def setup_method(self):
        self.converter = HtmlToMarkdown()

    def test_converts_simple_table(self):
        html = """
        <table>
          <thead><tr><th>Name</th><th>Age</th></tr></thead>
          <tbody><tr><td>Alice</td><td>30</td></tr></tbody>
        </table>
        """
        result = self.converter.convert(html)
        assert "Name" in result
        assert "Age" in result
        assert "Alice" in result
        assert "30" in result
        # Should have pipe characters for table formatting
        assert "|" in result

    def test_table_has_separator_row(self):
        html = """
        <table>
          <thead><tr><th>Col1</th><th>Col2</th></tr></thead>
          <tbody><tr><td>A</td><td>B</td></tr></tbody>
        </table>
        """
        result = self.converter.convert(html)
        # Should have a separator row with dashes
        assert "---" in result or "---|---" in result

    def test_converts_table_without_thead(self):
        html = """
        <table>
          <tr><td>A</td><td>B</td></tr>
          <tr><td>C</td><td>D</td></tr>
        </table>
        """
        result = self.converter.convert(html)
        assert "A" in result
        assert "B" in result


class TestMarkdownCleaning:
    """Test that output is clean and well-formatted."""

    def setup_method(self):
        self.converter = HtmlToMarkdown()

    def test_strips_excessive_blank_lines(self):
        html = "<h1>Title</h1><p>Para</p>"
        result = self.converter.convert(html)
        # Should not have more than 2 consecutive newlines
        assert "\n\n\n" not in result

    def test_returns_stripped_result(self):
        html = "<p>Content</p>"
        result = self.converter.convert(html)
        assert result == result.strip()
