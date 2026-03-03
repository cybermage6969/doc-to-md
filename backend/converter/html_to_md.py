"""Convert HTML content to Markdown using markdownify."""
import re
from markdownify import MarkdownConverter


def _get_code_language(el) -> str:
    """Extract language from <pre><code class='language-xxx'> pattern."""
    # el is the <pre> tag; look for a child <code> tag with language class
    code_child = el.find("code")
    if code_child:
        classes = code_child.get("class") or []
        for cls in classes:
            if cls.startswith("language-"):
                return cls[len("language-"):]
    # Also check classes directly on the <pre> tag
    classes = el.get("class") or []
    for cls in classes:
        if cls.startswith("language-"):
            return cls[len("language-"):]
    return ""


class _DocMarkdownConverter(MarkdownConverter):
    """Custom markdownify converter that preserves code block language identifiers."""

    def convert_pre(self, el, text, parent_tags):
        """Override to inject language identifier from child <code> tag."""
        if not text:
            return ""
        language = _get_code_language(el)
        # Clean up text: remove leading/trailing blank lines inside code block
        text = text.strip("\n")
        return f"\n\n```{language}\n{text}\n```\n\n"


class HtmlToMarkdown:
    """Convert HTML strings to clean Markdown."""

    def convert(self, html: str) -> str:
        """
        Convert HTML to Markdown.

        Features:
        - Preserves code block language identifiers (language-xxx CSS class)
        - Converts tables to Markdown table syntax
        - Cleans up excessive blank lines

        Args:
            html: HTML string to convert.

        Returns:
            Clean Markdown string, or empty string if input is empty.
        """
        if not html or not html.strip():
            return ""

        result = _DocMarkdownConverter(
            heading_style="ATX",
            bullets="-",
        ).convert(html)

        # Clean up excessive blank lines (max 2 consecutive newlines)
        result = re.sub(r"\n{3,}", "\n\n", result)

        return result.strip()
