"""HTML content cleaner - extract main body and page title."""
from bs4 import BeautifulSoup, Tag

# Tags to remove unconditionally from extracted content
NOISE_TAGS = {"script", "style", "nav", "header", "footer", "aside", "noscript", "iframe"}

# CSS selectors tried in priority order for main content
MAIN_CONTENT_SELECTORS = [
    "main",
    "article",
    '[role="main"]',
    ".content",
    ".documentation",
    ".doc-content",
    ".docs-content",
    "#content",
    "#main",
    ".markdown-body",
    ".page-content",
]


class ContentCleaner:
    """Extract and clean main documentation content from an HTML page."""

    def extract_main_content(self, html: str) -> str:
        """
        Extract the main content area from an HTML page and return its cleaned HTML.

        Tries known content selectors in priority order, falls back to <body>.
        Removes noise tags (script, style, nav, header, footer, aside).

        Args:
            html: Raw HTML string.

        Returns:
            Cleaned inner HTML string of the main content element.
        """
        if not html or not html.strip():
            return ""

        soup = BeautifulSoup(html, "lxml")

        # Find main content node
        content_node: Tag | None = None
        for selector in MAIN_CONTENT_SELECTORS:
            content_node = soup.select_one(selector)
            if content_node:
                break

        if content_node is None:
            content_node = soup.find("body")

        if content_node is None:
            return ""

        # Remove noise tags from the extracted content
        for tag_name in NOISE_TAGS:
            for tag in content_node.find_all(tag_name):
                tag.decompose()

        return str(content_node)

    def extract_title(self, html: str) -> str:
        """
        Extract the page title, in priority order:
          1. First <h1> in the document
          2. <meta property="og:title">
          3. <title> tag
          4. "Untitled"

        Args:
            html: Raw HTML string.

        Returns:
            Page title string.
        """
        if not html or not html.strip():
            return "Untitled"

        soup = BeautifulSoup(html, "lxml")

        # Priority 1: first <h1>
        h1 = soup.find("h1")
        if h1 and h1.get_text(strip=True):
            return h1.get_text(strip=True)

        # Priority 2: og:title
        og_title = soup.find("meta", attrs={"property": "og:title"})
        if og_title and og_title.get("content", "").strip():
            return og_title["content"].strip()

        # Priority 3: <title> tag
        title_tag = soup.find("title")
        if title_tag and title_tag.get_text(strip=True):
            return title_tag.get_text(strip=True)

        return "Untitled"
