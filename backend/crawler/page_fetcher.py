"""Fetch pages using httpx with optional Playwright fallback for SPAs."""
import asyncio
import logging
import random
from bs4 import BeautifulSoup

import httpx

logger = logging.getLogger(__name__)

# Browser-like User-Agent
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

# SPA container IDs that indicate a JavaScript-rendered shell
SPA_CONTAINER_IDS = {"root", "app", "__next", "gatsby-focus-wrapper"}


class PageFetcher:
    """
    Two-phase page fetcher:
    1. Try httpx (fast, static)
    2. If SPA detected, fall back to Playwright (headless browser)

    Args:
        use_playwright: Whether to enable Playwright fallback (default True).
        timeout: HTTP request timeout in seconds.
        delay_range: (min, max) random delay between requests.
        playwright_timeout: Playwright page load timeout in ms.
    """

    def __init__(
        self,
        use_playwright: bool = True,
        timeout: float = 30.0,
        delay_range: tuple[float, float] = (0.0, 0.0),
        playwright_timeout: int = 30_000,
    ) -> None:
        self._use_playwright = use_playwright
        self._timeout = timeout
        self._delay_range = delay_range
        self._playwright_timeout = playwright_timeout

    async def fetch(self, url: str) -> tuple[str, int]:
        """
        Fetch a page and return (html, status_code).

        Falls back to Playwright if use_playwright=True and SPA is detected.

        Raises:
            httpx.HTTPError or playwright error on network failure.
        """
        # Optional delay
        if self._delay_range[1] > 0:
            await asyncio.sleep(random.uniform(*self._delay_range))

        html, status = await self._fetch_with_httpx(url)

        # Check if we need Playwright fallback
        if self._use_playwright and self.is_spa(html):
            logger.debug("SPA detected at %s, switching to Playwright", url)
            html, status = await self._fetch_with_playwright(url)

        return html, status

    def is_spa(self, html: str) -> bool:
        """
        Detect if the HTML is an empty SPA shell.

        Returns True ONLY if a known SPA container div exists AND is empty
        (has no child elements). Does NOT use body text length as a fallback,
        because short but valid pages would be misclassified.
        """
        if not html:
            return False

        soup = BeautifulSoup(html, "lxml")

        # Check for empty SPA container divs
        for container_id in SPA_CONTAINER_IDS:
            container = soup.find(id=container_id)
            if container is not None:
                # Check if container has any child tags (not just whitespace text nodes)
                child_tags = list(container.find_all(True, recursive=False))
                if not child_tags:
                    return True

        return False

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _fetch_with_httpx(self, url: str) -> tuple[str, int]:
        """Fetch using httpx AsyncClient."""
        headers = {"User-Agent": DEFAULT_USER_AGENT}
        async with httpx.AsyncClient(
            headers=headers,
            timeout=self._timeout,
            follow_redirects=True,
            max_redirects=5,
        ) as client:
            response = await client.get(url)
            return response.text, response.status_code

    async def _fetch_with_playwright(self, url: str) -> tuple[str, int]:
        """Fetch using Playwright headless browser."""
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            try:
                page = await browser.new_page(
                    user_agent=DEFAULT_USER_AGENT,
                )
                response = await page.goto(
                    url,
                    wait_until="networkidle",
                    timeout=self._playwright_timeout,
                )
                html = await page.content()
                status = response.status if response else 200
                return html, status
            finally:
                await browser.close()
