"""Tests for page fetcher module - TDD Red phase."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from crawler.page_fetcher import PageFetcher


class TestHttpxFetching:
    """Test httpx-based static page fetching."""

    @pytest.mark.asyncio
    async def test_fetches_page_with_httpx(self):
        """Should fetch page content via httpx."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "<html><body><h1>Hello</h1></body></html>"

        with patch("crawler.page_fetcher.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            fetcher = PageFetcher(use_playwright=False)
            html, status = await fetcher.fetch("https://example.com/docs/page")

        assert status == 200
        assert "Hello" in html

    @pytest.mark.asyncio
    async def test_returns_status_code(self):
        """Should return the HTTP status code."""
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.text = "<html><body>Not Found</body></html>"

        with patch("crawler.page_fetcher.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            fetcher = PageFetcher(use_playwright=False)
            html, status = await fetcher.fetch("https://example.com/docs/missing")

        assert status == 404


class TestSpaDetection:
    """Test SPA detection and Playwright fallback."""

    @pytest.mark.asyncio
    async def test_detects_empty_spa_shell(self):
        """Should detect empty SPA shell and trigger Playwright fallback."""
        spa_html = '<html><body><div id="root"></div></body></html>'

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = spa_html

        playwright_html = "<html><body><main><h1>Rendered Content</h1></main></body></html>"

        with patch("crawler.page_fetcher.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            fetcher = PageFetcher(use_playwright=True)

            with patch.object(fetcher, "_fetch_with_playwright", new_callable=AsyncMock) as mock_pw:
                mock_pw.return_value = (playwright_html, 200)
                html, status = await fetcher.fetch("https://example.com/docs/spa")

            mock_pw.assert_called_once()
            assert "Rendered Content" in html

    @pytest.mark.asyncio
    async def test_does_not_use_playwright_for_static_page(self):
        """Should NOT use Playwright when static page has content."""
        static_html = "<html><body><main><h1>Static Content</h1><p>Lots of text here.</p></main></body></html>"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = static_html

        with patch("crawler.page_fetcher.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            fetcher = PageFetcher(use_playwright=True)

            with patch.object(fetcher, "_fetch_with_playwright", new_callable=AsyncMock) as mock_pw:
                html, status = await fetcher.fetch("https://example.com/docs/static")

            mock_pw.assert_not_called()
            assert "Static Content" in html

    @pytest.mark.asyncio
    async def test_detects_empty_app_div_as_spa(self):
        """Should detect <div id='app'></div> as SPA shell."""
        spa_html = '<html><body><div id="app"></div></body></html>'

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = spa_html

        with patch("crawler.page_fetcher.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            fetcher = PageFetcher(use_playwright=True)

            with patch.object(fetcher, "_fetch_with_playwright", new_callable=AsyncMock) as mock_pw:
                mock_pw.return_value = ("<html><body><p>Rendered</p></body></html>", 200)
                await fetcher.fetch("https://example.com/docs/app")

            mock_pw.assert_called_once()


class TestFetcherErrorHandling:
    """Test error handling in page fetcher."""

    @pytest.mark.asyncio
    async def test_raises_on_network_error(self):
        """Should raise exception on network failure."""
        import httpx

        with patch("crawler.page_fetcher.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))
            mock_client_cls.return_value = mock_client

            fetcher = PageFetcher(use_playwright=False)
            with pytest.raises(Exception):
                await fetcher.fetch("https://example.com/docs/page")

    def test_is_spa_returns_true_for_root_div(self):
        """is_spa should detect empty root div."""
        fetcher = PageFetcher()
        assert fetcher.is_spa('<html><body><div id="root"></div></body></html>') is True

    def test_is_spa_returns_false_for_content(self):
        """is_spa should return False when content is present."""
        fetcher = PageFetcher()
        assert fetcher.is_spa("<html><body><p>Real content here</p></body></html>") is False

    def test_is_spa_returns_false_for_populated_root(self):
        """is_spa should return False when root div has children."""
        fetcher = PageFetcher()
        html = '<html><body><div id="root"><h1>Content</h1></div></body></html>'
        assert fetcher.is_spa(html) is False
