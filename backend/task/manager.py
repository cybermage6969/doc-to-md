"""Task lifecycle management with SSE progress support."""
import asyncio
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from task.progress import ProgressEvent

# Tasks older than this (seconds) are eligible for cleanup
TASK_TTL_SECONDS = 3600  # 1 hour

# Maximum number of tasks in PENDING or RUNNING state at once
MAX_CONCURRENT_TASKS = 10


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class CrawlTask:
    """Represents a single crawl task."""
    task_id: str
    url: str
    status: TaskStatus = TaskStatus.PENDING
    max_pages: int = 500
    scope_path: Optional[str] = None
    error: Optional[str] = None
    result_markdown: Optional[str] = None
    created_at: float = field(default_factory=time.time)


class TaskManager:
    """
    In-memory task store with SSE event broadcasting.

    Manages task lifecycle and distributes progress events to subscribers.
    """

    def __init__(self) -> None:
        self._tasks: dict[str, CrawlTask] = {}
        # task_id -> list of asyncio.Queue for SSE subscribers
        self._subscribers: dict[str, list[asyncio.Queue]] = {}

    # ------------------------------------------------------------------
    # Task CRUD
    # ------------------------------------------------------------------

    def create_task(
        self,
        url: str,
        max_pages: int = 500,
        scope_path: Optional[str] = None,
    ) -> CrawlTask:
        """Create and store a new crawl task.

        Raises:
            RuntimeError: If MAX_CONCURRENT_TASKS active tasks are already running.
        """
        self.cleanup_expired_tasks()

        active_count = sum(
            1 for t in self._tasks.values()
            if t.status in (TaskStatus.PENDING, TaskStatus.RUNNING)
        )
        if active_count >= MAX_CONCURRENT_TASKS:
            raise RuntimeError(
                f"Too many active tasks (max {MAX_CONCURRENT_TASKS}). "
                "Please wait for a task to complete before starting a new one."
            )

        task_id = str(uuid.uuid4())
        task = CrawlTask(task_id=task_id, url=url, max_pages=max_pages, scope_path=scope_path)
        self._tasks[task_id] = task
        self._subscribers[task_id] = []
        return task

    def cleanup_expired_tasks(self) -> int:
        """Remove tasks older than TASK_TTL_SECONDS. Returns count of removed tasks."""
        cutoff = time.time() - TASK_TTL_SECONDS
        expired = [
            task_id for task_id, task in self._tasks.items()
            if task.created_at < cutoff
        ]
        for task_id in expired:
            del self._tasks[task_id]
            self._subscribers.pop(task_id, None)
        return len(expired)

    def get_task(self, task_id: str) -> Optional[CrawlTask]:
        """Retrieve a task by ID, or None if not found."""
        return self._tasks.get(task_id)

    def update_status(
        self,
        task_id: str,
        status: TaskStatus,
        error: Optional[str] = None,
    ) -> None:
        """Update the status (and optionally error message) of a task."""
        task = self._tasks.get(task_id)
        if task is None:
            return
        # Return new immutable-style copy (keep dict entry updated)
        self._tasks[task_id] = CrawlTask(
            task_id=task.task_id,
            url=task.url,
            status=status,
            max_pages=task.max_pages,
            scope_path=task.scope_path,
            error=error,
            result_markdown=task.result_markdown,
            created_at=task.created_at,
        )

    def set_result(self, task_id: str, markdown: str) -> None:
        """Store the final Markdown result for a completed task."""
        task = self._tasks.get(task_id)
        if task is None:
            return
        self._tasks[task_id] = CrawlTask(
            task_id=task.task_id,
            url=task.url,
            status=task.status,
            max_pages=task.max_pages,
            scope_path=task.scope_path,
            error=task.error,
            result_markdown=markdown,
            created_at=task.created_at,
        )

    # ------------------------------------------------------------------
    # SSE pub/sub
    # ------------------------------------------------------------------

    async def subscribe_progress(self, task_id: str) -> asyncio.Queue:
        """Create and register a new subscriber queue for a task."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=256)
        if task_id in self._subscribers:
            self._subscribers[task_id].append(queue)
        return queue

    async def publish_event(self, task_id: str, event: ProgressEvent) -> None:
        """Broadcast a progress event to all subscribers of a task."""
        for queue in self._subscribers.get(task_id, []):
            await queue.put(event)

    def unsubscribe(self, task_id: str, queue: asyncio.Queue) -> None:
        """Remove a subscriber queue."""
        subs = self._subscribers.get(task_id, [])
        if queue in subs:
            subs.remove(queue)
