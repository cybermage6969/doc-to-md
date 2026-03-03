"""BFS crawl engine with concurrency control."""
import asyncio
import logging
from collections import deque
from dataclasses import dataclass, field
from typing import Awaitable, Callable, Optional, Union

from crawler.url_filter import UrlFilter
from crawler.link_extractor import LinkExtractor
from converter.content_cleaner import ContentCleaner

logger = logging.getLogger(__name__)


@dataclass
class PageResult:
    """Result of crawling a single page."""
    url: str
    title: str = ""
    html: str = ""
    status: int = 0


@dataclass
class CrawlResult:
    """Aggregated result of a full crawl."""
    pages: list[PageResult] = field(default_factory=list)
    failed_urls: list[str] = field(default_factory=list)


class CrawlEngine:
    """
    BFS crawler that respects URL scope, concurrency limits, and max page count.

    Args:
        fetcher: Object with async `fetch(url) -> (html, status_code)` method.
        max_pages: Maximum number of pages to crawl.
        max_concurrency: Maximum concurrent fetches.
        delay_range: (min, max) seconds delay between requests.
    """

    def __init__(
        self,
        fetcher,
        max_pages: int = 100,
        max_concurrency: int = 5,
        delay_range: tuple[float, float] = (0.0, 0.0),
        scope_path: str | None = None,
    ) -> None:
        self._fetcher = fetcher
        self._max_pages = max_pages
        self._max_concurrency = max_concurrency
        self._delay_range = delay_range
        self._scope_path = scope_path
        self._link_extractor = LinkExtractor()
        self._cleaner = ContentCleaner()

        # Optional callbacks (set before calling crawl).
        # Callbacks may be sync or async — async callbacks are awaited.
        self.on_page_crawled: Optional[
            Callable[[PageResult], Union[None, Awaitable[None]]]
        ] = None
        self.on_page_discovered: Optional[
            Callable[[int], Union[None, Awaitable[None]]]
        ] = None
        self.on_page_failed: Optional[Callable[[str, str], None]] = None

    async def crawl(self, start_url: str) -> CrawlResult:
        """
        Crawl starting from start_url using BFS.

        Returns:
            CrawlResult with all successfully crawled pages and any failures.
        """
        url_filter = UrlFilter(start_url, scope_path=self._scope_path)
        normalized_start = url_filter.normalize(start_url)

        queue: deque[tuple[str, int]] = deque()  # (url, order)
        queue.append((normalized_start, 0))
        url_filter.mark_visited(normalized_start)

        result = CrawlResult()
        semaphore = asyncio.Semaphore(self._max_concurrency)
        order_counter = 0

        while queue and len(result.pages) + len(result.failed_urls) < self._max_pages:
            # Take next URL from queue
            url, order = queue.popleft()

            # Stop if we've reached max pages
            if len(result.pages) >= self._max_pages:
                break

            # Fetch the page
            page_result = await self._fetch_page(url, order, semaphore)

            if page_result is None:
                result.failed_urls.append(url)
                if self.on_page_failed:
                    self.on_page_failed(url, "fetch failed")
                continue

            result.pages.append(page_result)

            if self.on_page_crawled:
                result_or_coro = self.on_page_crawled(page_result)
                if asyncio.iscoroutine(result_or_coro):
                    await result_or_coro

            # Extract and queue new links
            if page_result.html:
                links = self._link_extractor.extract(page_result.html, url)
                new_links: list[str] = []
                for link in links:
                    normalized = url_filter.normalize(link)
                    if (
                        url_filter.is_allowed(link)
                        and not url_filter.is_visited(normalized)
                    ):
                        url_filter.mark_visited(normalized)
                        order_counter += 1
                        queue.append((normalized, order_counter))
                        new_links.append(normalized)

                if new_links and self.on_page_discovered:
                    result_or_coro = self.on_page_discovered(
                        url_filter.visited_count
                    )
                    if asyncio.iscoroutine(result_or_coro):
                        await result_or_coro

        return result

    async def _fetch_page(
        self,
        url: str,
        order: int,
        semaphore: asyncio.Semaphore,
    ) -> Optional[PageResult]:
        """Fetch a single page and return a PageResult, or None on error."""
        async with semaphore:
            try:
                html, status = await self._fetcher.fetch(url)
                cleaner = self._cleaner
                title = cleaner.extract_title(html)
                return PageResult(url=url, title=title, html=html, status=status)
            except Exception as exc:
                logger.warning("Failed to fetch %s: %s", url, exc)
                return None
