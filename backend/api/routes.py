"""FastAPI route handlers."""
import asyncio
import logging
import re
import urllib.parse
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import Response, StreamingResponse

from api.models import CreateTaskRequest, TaskResponse
from converter.content_cleaner import ContentCleaner
from converter.html_to_md import HtmlToMarkdown
from crawler.engine import CrawlEngine
from crawler.page_fetcher import PageFetcher
from merger.doc_merger import DocMerger, PageData
from merger.zip_builder import build_split_zip, compute_zip_parts
from task.manager import TaskManager, TaskStatus
from task.progress import ProgressEvent
from utils.token_estimator import estimate_tokens

logger = logging.getLogger(__name__)

router = APIRouter()

# Shared task manager instance (injected at app startup)
_task_manager: TaskManager | None = None


def set_task_manager(manager: TaskManager) -> None:
    """Inject the task manager dependency."""
    global _task_manager
    _task_manager = manager


def get_task_manager() -> TaskManager:
    if _task_manager is None:
        raise RuntimeError("TaskManager not initialized")
    return _task_manager


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------


@router.post("/tasks", response_model=TaskResponse, status_code=201)
async def create_task(
    request: CreateTaskRequest,
    background_tasks: BackgroundTasks,
) -> TaskResponse:
    """Create a new crawl task and start it in the background."""
    manager = get_task_manager()

    # Validate URL scheme
    if not request.url.startswith(("http://", "https://")):
        raise HTTPException(status_code=422, detail="URL must start with http:// or https://")

    try:
        task = manager.create_task(
            url=request.url,
            max_pages=request.max_pages,
            scope_path=request.scope_path,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    # Start crawl in background
    background_tasks.add_task(_run_crawl_task, task.task_id, manager)

    return TaskResponse(
        task_id=task.task_id,
        url=task.url,
        status=task.status,
        max_pages=task.max_pages,
    )


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str) -> TaskResponse:
    """Get the current status of a crawl task."""
    manager = get_task_manager()
    task = manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    return TaskResponse(
        task_id=task.task_id,
        url=task.url,
        status=task.status,
        max_pages=task.max_pages,
        error=task.error,
        has_result=task.result_markdown is not None,
        estimated_tokens=task.estimated_tokens,
    )


@router.get("/tasks/{task_id}/progress")
async def stream_progress(task_id: str) -> StreamingResponse:
    """SSE endpoint for real-time crawl progress."""
    manager = get_task_manager()
    task = manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    queue = await manager.subscribe_progress(task_id)

    async def event_stream() -> AsyncGenerator[str, None]:
        try:
            while True:
                try:
                    event: ProgressEvent = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield event.to_sse()
                    # Stop streaming on terminal events
                    if event.type.value in ("task_completed", "task_failed"):
                        break
                except asyncio.TimeoutError:
                    # Send keepalive comment
                    yield ": keepalive\n\n"
        finally:
            manager.unsubscribe(task_id, queue)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/tasks/{task_id}/download")
async def download_result(task_id: str) -> Response:
    """Download the merged Markdown result for a completed task."""
    manager = get_task_manager()
    task = manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=409, detail="Task is not completed yet")

    if task.result_markdown is None:
        raise HTTPException(status_code=404, detail="Result not available")

    # Generate a safe ASCII-only filename from the URL (prevents header injection)
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", task.url.split("//")[-1])[:50]
    filename = f"{safe_name}.md"
    # RFC 5987 encoding for the filename* parameter
    filename_encoded = urllib.parse.quote(filename, safe="")

    return Response(
        content=task.result_markdown,
        media_type="text/markdown",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"; '
                f"filename*=UTF-8''{filename_encoded}"
            )
        },
    )


@router.get("/tasks/{task_id}/download/zip")
async def download_zip(task_id: str) -> Response:
    """Download the split ZIP archive for a completed task."""
    manager = get_task_manager()
    task = manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=409, detail="Task is not completed yet")

    if not task.result_pages:
        raise HTTPException(status_code=404, detail="Split result not available")

    doc_title = task.result_pages[0].title
    zip_bytes = build_split_zip(task.result_pages, doc_title, task.url)

    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", task.url.split("//")[-1])[:50]
    filename = f"{safe_name}.zip"
    filename_encoded = urllib.parse.quote(filename, safe="")

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"; '
                f"filename*=UTF-8''{filename_encoded}"
            )
        },
    )


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _safe_error_message(exc: Exception) -> str:
    """Return a user-facing error message that does not leak implementation details."""
    name = type(exc).__name__
    msg = str(exc).lower()
    if "timeout" in name.lower() or "timeout" in msg:
        return "The crawl timed out. Try again with fewer pages or a smaller site."
    if "connect" in name.lower() or "network" in name.lower() or "connection" in msg:
        return "Failed to connect to the target site. Please verify the URL and try again."
    return "An error occurred during the crawl. Please try again."


# ------------------------------------------------------------------
# Background task runner
# ------------------------------------------------------------------


async def _run_crawl_task(task_id: str, manager: TaskManager) -> None:
    """Background task: crawl, convert, merge, and store result."""
    task = manager.get_task(task_id)
    if task is None:
        return

    manager.update_status(task_id, TaskStatus.RUNNING)
    await manager.publish_event(
        task_id,
        ProgressEvent.task_started(task_id=task_id, url=task.url),
    )

    try:
        fetcher = PageFetcher(use_playwright=True, delay_range=(0.5, 2.0))
        engine = CrawlEngine(
            fetcher=fetcher,
            max_pages=task.max_pages,
            scope_path=task.scope_path,
        )

        crawled_count = [0]
        total_discovered = [1]

        async def on_discovered(count: int) -> None:
            total_discovered[0] = count
            await manager.publish_event(
                task_id,
                ProgressEvent.page_discovered(total_discovered=count),
            )

        async def on_crawled(page) -> None:
            crawled_count[0] += 1
            await manager.publish_event(
                task_id,
                ProgressEvent.page_crawled(
                    crawled=crawled_count[0],
                    total=total_discovered[0],
                    url=page.url,
                    title=page.title,
                    status="success",
                ),
            )

        engine.on_page_discovered = on_discovered
        engine.on_page_crawled = on_crawled

        # Phase 1: Crawl
        crawl_result = await engine.crawl(task.url)

        if not crawl_result.pages:
            raise RuntimeError("No pages were crawled successfully.")

        # Phase 2: Convert
        await manager.publish_event(
            task_id, ProgressEvent.phase_changed(phase="converting")
        )

        cleaner = ContentCleaner()
        converter = HtmlToMarkdown()
        pages_data: list[PageData] = []

        for i, page in enumerate(crawl_result.pages):
            clean_html = cleaner.extract_main_content(page.html)
            md_content = converter.convert(clean_html)
            pages_data.append(
                PageData(url=page.url, title=page.title, content=md_content, order=i)
            )

        # Phase 3: Merge
        await manager.publish_event(
            task_id, ProgressEvent.phase_changed(phase="merging")
        )
        merger = DocMerger()
        result_md = merger.merge(
            pages=pages_data,
            doc_title=pages_data[0].title if pages_data else "Documentation",
            source_url=task.url,
        )

        token_count = estimate_tokens(result_md)
        manager.set_result(
            task_id, result_md, pages=pages_data, estimated_tokens=token_count
        )
        manager.update_status(task_id, TaskStatus.COMPLETED)

        zip_parts = compute_zip_parts(pages_data)

        await manager.publish_event(
            task_id,
            ProgressEvent.task_completed(
                total_pages=len(pages_data),
                download_url=f"/api/tasks/{task_id}/download",
                total_discovered=crawl_result.total_discovered,
                estimated_tokens=token_count,
                download_zip_url=f"/api/tasks/{task_id}/download/zip",
                zip_parts=zip_parts,
            ),
        )

    except Exception as exc:
        logger.exception("Crawl task %s failed", task_id)
        safe_msg = _safe_error_message(exc)
        manager.update_status(task_id, TaskStatus.FAILED, error=safe_msg)
        await manager.publish_event(
            task_id,
            ProgressEvent.task_failed(error=safe_msg),
        )
