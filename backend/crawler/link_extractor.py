"""Extract and resolve links from HTML pages."""
from urllib.parse import urlparse, urlunparse, urljoin
from bs4 import BeautifulSoup


# HTML elements whose links are typically site-chrome, not documentation content.
# <nav> inside <header>/<footer> is removed by parent decomposition.
# Standalone <nav> is kept because documentation sidebars use it for ToC links.
EXCLUDED_LINK_CONTAINERS: frozenset[str] = frozenset({"header", "footer"})


class LinkExtractor:
    """Extract all hyperlinks from HTML content, resolved to absolute URLs."""

    def __init__(
        self, exclude_containers: set[str] | None = None
    ) -> None:
        self._exclude_containers = (
            exclude_containers
            if exclude_containers is not None
            else EXCLUDED_LINK_CONTAINERS
        )

    def extract(self, html: str, base_url: str) -> list[str]:
        """
        Extract links from HTML, resolve relative links against base_url,
        strip fragments, and deduplicate.

        Links inside excluded container elements (header, footer by default)
        are skipped to avoid following site-chrome navigation.

        Args:
            html: Raw HTML string.
            base_url: The URL of the page being parsed (for resolving relative links).

        Returns:
            Deduplicated list of absolute URLs found in the page.
        """
        if not html:
            return []

        soup = BeautifulSoup(html, "lxml")

        # Remove site-chrome containers before extracting links
        for tag_name in self._exclude_containers:
            for tag in soup.find_all(tag_name):
                tag.decompose()
        seen: set[str] = set()
        result: list[str] = []

        for tag in soup.find_all("a", href=True):
            href = tag["href"].strip()
            if not href:
                continue

            # Resolve to absolute URL
            absolute = urljoin(base_url, href)

            # Normalize: lowercase scheme+host, remove fragment, strip trailing slash
            normalized = self._normalize(absolute)
            if not normalized:
                continue

            if normalized not in seen:
                seen.add(normalized)
                result.append(normalized)

        return result

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _normalize(self, url: str) -> str:
        """Normalize URL for deduplication."""
        if not url:
            return ""
        parsed = urlparse(url)
        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()
        path = parsed.path
        # Remove trailing slash (but keep root)
        if path != "/" and path.endswith("/"):
            path = path.rstrip("/")
        if path == "/":
            path = ""
        return urlunparse((scheme, netloc, path, parsed.params, parsed.query, ""))
