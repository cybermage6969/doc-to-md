"""URL filter for crawl scope control."""
import ipaddress
import re
import socket
from urllib.parse import urlparse, urlunparse, urljoin

# Private/loopback/link-local networks that must never be crawled (SSRF prevention)
_BLOCKED_NETWORKS: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),  # Shared address space (RFC 6598)
    ipaddress.ip_network("::1/128"),         # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),        # IPv6 unique local
    ipaddress.ip_network("fe80::/10"),       # IPv6 link-local
]


def _is_private_host(hostname: str) -> bool:
    """Return True if hostname resolves to a private/loopback/reserved IP."""
    # Strip port if present
    host = hostname.split(":")[0]

    # Try parsing as a literal IP address first (fast path)
    try:
        addr = ipaddress.ip_address(host)
        return any(addr in net for net in _BLOCKED_NETWORKS)
    except ValueError:
        pass

    # Resolve hostname via DNS
    try:
        ip_str = socket.gethostbyname(host)
        addr = ipaddress.ip_address(ip_str)
        return any(addr in net for net in _BLOCKED_NETWORKS)
    except (socket.gaierror, ValueError):
        # Unresolvable hosts are blocked by default
        return True

# Known documentation path segments that indicate a doc site prefix
DOC_SEGMENTS = {
    "docs", "documentation", "doc", "guide", "guides",
    "manual", "manuals", "reference", "references",
    "api-reference", "api", "tutorial", "tutorials",
    "learn", "wiki", "help", "support", "handbook",
    "book", "books", "getting-started", "quickstart",
}

# File extensions to exclude from crawling
EXCLUDED_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    ".ico", ".css", ".js", ".json", ".xml", ".rss", ".atom",
    ".zip", ".tar", ".gz", ".woff", ".woff2", ".ttf", ".eot",
    ".mp4", ".mp3", ".avi", ".mov", ".txt", ".csv", ".xlsx",
}

# Path segments indicating authentication or non-doc pages
AUTH_SEGMENTS = {"login", "logout", "signin", "signup", "register", "auth", "oauth"}


class UrlFilter:
    """Filter URLs to keep crawling within the documentation scope."""

    def __init__(self, start_url: str, scope_path: str | None = None) -> None:
        self._parsed_start = urlparse(start_url.lower())
        # Cache SSRF check for the start domain — all allowed URLs share the same netloc,
        # so a single DNS lookup at init time avoids blocking the event loop repeatedly.
        self._start_host_is_private = _is_private_host(self._parsed_start.netloc)
        if scope_path is not None:
            scheme = self._parsed_start.scheme
            netloc = self._parsed_start.netloc
            clean_path = scope_path.rstrip("/")
            self._base_prefix = f"{scheme}://{netloc}{clean_path}"
        else:
            self._base_prefix = self._infer_base_prefix(start_url)
        self._visited: set[str] = set()

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    @property
    def base_prefix(self) -> str:
        return self._base_prefix

    def is_allowed(self, url: str) -> bool:
        """Return True if the URL should be crawled."""
        if not url or not url.strip():
            return False

        # Reject non-HTTP schemes
        if not url.startswith(("http://", "https://")):
            return False

        parsed = urlparse(url)

        # Must be same domain
        if parsed.netloc.lower() != self._parsed_start.netloc.lower():
            return False

        # Reject private/loopback hosts (SSRF prevention).
        # Uses the cached result from __init__ since same-domain is enforced above.
        if self._start_host_is_private:
            return False

        # Reject excluded file extensions
        path_lower = parsed.path.lower()
        for ext in EXCLUDED_EXTENSIONS:
            if path_lower.endswith(ext):
                return False

        # Reject auth / login pages
        path_segments = [s for s in parsed.path.split("/") if s]
        for seg in path_segments:
            if seg.lower() in AUTH_SEGMENTS:
                return False

        # Must start with base prefix (case-insensitive path comparison)
        full_url_no_frag = urlunparse(parsed._replace(fragment=""))
        normalized = self.normalize(full_url_no_frag)
        if not normalized.startswith(self._base_prefix):
            return False

        return True

    def normalize(self, url: str) -> str:
        """Normalize URL: lowercase scheme/host/path, remove fragment, remove trailing slash."""
        if not url:
            return ""
        parsed = urlparse(url)
        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()
        path = parsed.path.lower()
        # Remove trailing slash (keep root slash if path is just "/")
        if path != "/" and path.endswith("/"):
            path = path.rstrip("/")
        # Remove trailing slash from root
        if path == "/":
            path = ""
        # Rebuild without fragment
        normalized = urlunparse((scheme, netloc, path, parsed.params, parsed.query, ""))
        return normalized

    def mark_visited(self, url: str) -> None:
        """Mark URL as visited."""
        self._visited.add(self.normalize(url))

    def is_visited(self, url: str) -> bool:
        """Check if URL has already been visited."""
        return self.normalize(url) in self._visited

    @property
    def visited_count(self) -> int:
        return len(self._visited)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _infer_base_prefix(self, start_url: str) -> str:
        """Infer the documentation base path prefix from the start URL."""
        parsed = urlparse(start_url)
        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()
        base = f"{scheme}://{netloc}"

        # If the subdomain itself is a doc-related subdomain (e.g. docs.example.com)
        # treat the whole domain as the prefix without appending a path segment
        subdomain = netloc.split(".")[0] if "." in netloc else netloc
        if subdomain.lower() in DOC_SEGMENTS:
            return base

        path_segments = [s for s in parsed.path.split("/") if s]

        for i, segment in enumerate(path_segments):
            if segment.lower() in DOC_SEGMENTS:
                remaining = path_segments[i + 1 :]
                if len(remaining) >= 2:
                    # Tighter scope: include the first sub-segment after the doc segment
                    prefix_path = "/" + "/".join(path_segments[: i + 2])
                else:
                    # 0 or 1 segments after doc segment: use doc segment as prefix
                    prefix_path = "/" + "/".join(path_segments[: i + 1])
                return base + prefix_path

        return base
