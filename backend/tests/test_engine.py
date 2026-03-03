"""Tests for crawl engine module - TDD Red phase."""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from crawler.engine import CrawlEngine, CrawlResult, PageResult


class TestCrawlEngineBasic:
    """Test basic BFS crawling behavior."""

    @pytest.mark.asyncio
    async def test_crawls_start_url(self):
        """Engine should fetch the start URL."""
        fetcher = AsyncMock()
        fetcher.fetch.return_value = (
            "<html><body><main><h1>Home</h1><p>Welcome</p></main></body></html>",
            200,
        )
        engine = CrawlEngine(fetcher=fetcher, max_pages=10)
        result = await engine.crawl("https://example.com/docs/intro")
        fetcher.fetch.assert_called()
        assert len(result.pages) >= 1

    @pytest.mark.asyncio
    async def test_follows_discovered_links(self):
        """Engine should follow links found on crawled pages."""
        call_count = 0
        pages_html = {
            "https://example.com/docs/intro": (
                '<html><body><main><h1>Intro</h1>'
                '<a href="/docs/page2">Page 2</a></main></body></html>',
                200,
            ),
            "https://example.com/docs/page2": (
                "<html><body><main><h1>Page 2</h1><p>Content</p></main></body></html>",
                200,
            ),
        }

        async def mock_fetch(url: str):
            return pages_html.get(url, ("<html><body></body></html>", 404))

        fetcher = MagicMock()
        fetcher.fetch = AsyncMock(side_effect=mock_fetch)

        engine = CrawlEngine(fetcher=fetcher, max_pages=10)
        result = await engine.crawl("https://example.com/docs/intro")
        assert len(result.pages) == 2

    @pytest.mark.asyncio
    async def test_does_not_revisit_pages(self):
        """Engine should not fetch the same URL twice."""
        fetch_calls: list[str] = []

        async def mock_fetch(url: str):
            fetch_calls.append(url)
            if url == "https://example.com/docs/intro":
                return (
                    '<html><body><main>'
                    '<a href="/docs/intro">Self link</a>'
                    '<a href="/docs/page2">Page 2</a>'
                    '</main></body></html>',
                    200,
                )
            return ("<html><body><main><h1>Page 2</h1></main></body></html>", 200)

        fetcher = MagicMock()
        fetcher.fetch = AsyncMock(side_effect=mock_fetch)

        engine = CrawlEngine(fetcher=fetcher, max_pages=10)
        await engine.crawl("https://example.com/docs/intro")
        intro_fetches = [u for u in fetch_calls if "intro" in u]
        assert len(intro_fetches) == 1

    @pytest.mark.asyncio
    async def test_respects_max_pages_limit(self):
        """Engine should stop after reaching max_pages."""
        page_count = [0]

        async def mock_fetch(url: str):
            # Each page links to 5 new pages
            page_num = page_count[0]
            page_count[0] += 1
            links = "".join(
                f'<a href="/docs/page{page_num * 5 + i}">P</a>'
                for i in range(5)
            )
            return (f"<html><body><main>{links}</main></body></html>", 200)

        fetcher = MagicMock()
        fetcher.fetch = AsyncMock(side_effect=mock_fetch)

        engine = CrawlEngine(fetcher=fetcher, max_pages=5)
        result = await engine.crawl("https://example.com/docs/start")
        assert len(result.pages) <= 5

    @pytest.mark.asyncio
    async def test_returns_crawl_result_with_pages(self):
        """CrawlResult should contain PageResult objects."""
        fetcher = MagicMock()
        fetcher.fetch = AsyncMock(return_value=(
            "<html><body><main><h1>Title</h1><p>Content</p></main></body></html>",
            200,
        ))
        engine = CrawlEngine(fetcher=fetcher, max_pages=1)
        result = await engine.crawl("https://example.com/docs/start")
        assert isinstance(result, CrawlResult)
        assert len(result.pages) == 1
        page = result.pages[0]
        assert isinstance(page, PageResult)
        assert page.url == "https://example.com/docs/start"


class TestCrawlEngineErrorHandling:
    """Test error handling in crawl engine."""

    @pytest.mark.asyncio
    async def test_handles_fetch_error_gracefully(self):
        """Engine should continue crawling when one page fails."""
        pages_html = {
            "https://example.com/docs/intro": (
                '<html><body><main>'
                '<a href="/docs/broken">Broken</a>'
                '<a href="/docs/good">Good</a>'
                '</main></body></html>',
                200,
            ),
            "https://example.com/docs/broken": Exception("Network error"),
            "https://example.com/docs/good": (
                "<html><body><main><h1>Good</h1></main></body></html>",
                200,
            ),
        }

        async def mock_fetch(url: str):
            result = pages_html.get(url)
            if isinstance(result, Exception):
                raise result
            return result or ("<html><body></body></html>", 404)

        fetcher = MagicMock()
        fetcher.fetch = AsyncMock(side_effect=mock_fetch)

        engine = CrawlEngine(fetcher=fetcher, max_pages=10)
        result = await engine.crawl("https://example.com/docs/intro")
        # Should have crawled intro + good, skipped broken
        good_pages = [p for p in result.pages if "good" in p.url]
        assert len(good_pages) == 1

    @pytest.mark.asyncio
    async def test_records_failed_pages(self):
        """CrawlResult should track failed page URLs."""
        async def mock_fetch(url: str):
            if "broken" in url:
                raise Exception("Connection refused")
            return (
                '<html><body><main>'
                '<a href="/docs/broken">Link</a>'
                '</main></body></html>',
                200,
            )

        fetcher = MagicMock()
        fetcher.fetch = AsyncMock(side_effect=mock_fetch)

        engine = CrawlEngine(fetcher=fetcher, max_pages=10)
        result = await engine.crawl("https://example.com/docs/start")
        assert len(result.failed_urls) >= 1


class TestProgressCallbacks:
    """Test progress event callbacks."""

    @pytest.mark.asyncio
    async def test_calls_on_page_crawled_callback(self):
        """Engine should invoke on_page_crawled for each successfully crawled page."""
        crawled_events: list[str] = []

        async def mock_fetch(url: str):
            return ("<html><body><main><h1>Page</h1></main></body></html>", 200)

        fetcher = MagicMock()
        fetcher.fetch = AsyncMock(side_effect=mock_fetch)

        engine = CrawlEngine(fetcher=fetcher, max_pages=1)
        engine.on_page_crawled = lambda page: crawled_events.append(page.url)
        await engine.crawl("https://example.com/docs/start")
        assert len(crawled_events) == 1

    @pytest.mark.asyncio
    async def test_calls_on_page_discovered_callback(self):
        """Engine should invoke on_page_discovered when links are found."""
        discovered_counts: list[int] = []

        async def mock_fetch(url: str):
            if "start" in url:
                return (
                    '<html><body><main>'
                    '<a href="/docs/p1">P1</a>'
                    '<a href="/docs/p2">P2</a>'
                    '</main></body></html>',
                    200,
                )
            return ("<html><body><main>Content</main></body></html>", 200)

        fetcher = MagicMock()
        fetcher.fetch = AsyncMock(side_effect=mock_fetch)

        engine = CrawlEngine(fetcher=fetcher, max_pages=10)
        engine.on_page_discovered = lambda count: discovered_counts.append(count)
        await engine.crawl("https://example.com/docs/start")
        assert len(discovered_counts) > 0
