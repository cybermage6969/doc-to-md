"""Tests for task manager and progress modules - TDD Red phase."""
import asyncio
import pytest
from task.manager import TaskManager, TaskStatus
from task.progress import ProgressEvent, ProgressEventType


class TestTaskCreation:
    """Test task creation and retrieval."""

    def setup_method(self):
        self.manager = TaskManager()

    def test_creates_task_with_id(self):
        task = self.manager.create_task("https://example.com/docs")
        assert task.task_id is not None
        assert len(task.task_id) > 0

    def test_creates_task_with_url(self):
        task = self.manager.create_task("https://example.com/docs")
        assert task.url == "https://example.com/docs"

    def test_new_task_has_pending_status(self):
        task = self.manager.create_task("https://example.com/docs")
        assert task.status == TaskStatus.PENDING

    def test_get_existing_task(self):
        task = self.manager.create_task("https://example.com/docs")
        retrieved = self.manager.get_task(task.task_id)
        assert retrieved is not None
        assert retrieved.task_id == task.task_id

    def test_get_nonexistent_task_returns_none(self):
        result = self.manager.get_task("nonexistent-id")
        assert result is None

    def test_task_ids_are_unique(self):
        task1 = self.manager.create_task("https://example.com/docs")
        task2 = self.manager.create_task("https://example.com/docs")
        assert task1.task_id != task2.task_id

    def test_creates_task_with_options(self):
        task = self.manager.create_task(
            "https://example.com/docs",
            max_pages=50,
        )
        assert task.max_pages == 50


class TestTaskStatusManagement:
    """Test task status transitions."""

    def setup_method(self):
        self.manager = TaskManager()

    def test_update_task_status_to_running(self):
        task = self.manager.create_task("https://example.com/docs")
        self.manager.update_status(task.task_id, TaskStatus.RUNNING)
        updated = self.manager.get_task(task.task_id)
        assert updated.status == TaskStatus.RUNNING

    def test_update_task_status_to_completed(self):
        task = self.manager.create_task("https://example.com/docs")
        self.manager.update_status(task.task_id, TaskStatus.COMPLETED)
        updated = self.manager.get_task(task.task_id)
        assert updated.status == TaskStatus.COMPLETED

    def test_update_task_status_to_failed(self):
        task = self.manager.create_task("https://example.com/docs")
        self.manager.update_status(task.task_id, TaskStatus.FAILED, error="Network error")
        updated = self.manager.get_task(task.task_id)
        assert updated.status == TaskStatus.FAILED
        assert updated.error == "Network error"

    def test_set_result_markdown(self):
        task = self.manager.create_task("https://example.com/docs")
        self.manager.set_result(task.task_id, "# Result Markdown\n\nContent")
        updated = self.manager.get_task(task.task_id)
        assert updated.result_markdown == "# Result Markdown\n\nContent"


class TestProgressEvents:
    """Test progress event creation."""

    def test_creates_task_started_event(self):
        event = ProgressEvent.task_started(task_id="abc", url="https://example.com/docs")
        assert event.type == ProgressEventType.TASK_STARTED
        assert event.data["task_id"] == "abc"
        assert event.data["url"] == "https://example.com/docs"

    def test_creates_page_discovered_event(self):
        event = ProgressEvent.page_discovered(total_discovered=15)
        assert event.type == ProgressEventType.PAGE_DISCOVERED
        assert event.data["total_discovered"] == 15

    def test_creates_page_crawled_event(self):
        event = ProgressEvent.page_crawled(
            crawled=3, total=15, url="https://example.com/docs/page", title="Page Title", status="success"
        )
        assert event.type == ProgressEventType.PAGE_CRAWLED
        assert event.data["crawled"] == 3
        assert event.data["total"] == 15
        assert event.data["url"] == "https://example.com/docs/page"
        assert event.data["title"] == "Page Title"
        assert event.data["status"] == "success"

    def test_creates_phase_changed_event(self):
        event = ProgressEvent.phase_changed(phase="converting")
        assert event.type == ProgressEventType.PHASE_CHANGED
        assert event.data["phase"] == "converting"

    def test_creates_task_completed_event(self):
        event = ProgressEvent.task_completed(
            total_pages=42, download_url="/api/tasks/abc/download"
        )
        assert event.type == ProgressEventType.TASK_COMPLETED
        assert event.data["total_pages"] == 42
        assert event.data["download_url"] == "/api/tasks/abc/download"

    def test_creates_task_failed_event(self):
        event = ProgressEvent.task_failed(error="Connection timeout")
        assert event.type == ProgressEventType.TASK_FAILED
        assert event.data["error"] == "Connection timeout"

    def test_event_serializes_to_json_string(self):
        import json
        event = ProgressEvent.task_started(task_id="abc", url="https://example.com")
        json_str = event.to_json()
        data = json.loads(json_str)
        assert data["type"] == "task_started"

    def test_event_serializes_to_sse_format(self):
        event = ProgressEvent.page_crawled(
            crawled=1, total=10, url="https://example.com/page", title="Test", status="success"
        )
        sse = event.to_sse()
        assert sse.startswith("data: ")
        assert "\n\n" in sse


class TestTaskProgressQueue:
    """Test async progress event queue for SSE."""

    def setup_method(self):
        self.manager = TaskManager()

    @pytest.mark.asyncio
    async def test_subscribes_to_task_progress(self):
        task = self.manager.create_task("https://example.com/docs")
        queue = await self.manager.subscribe_progress(task.task_id)
        assert queue is not None

    @pytest.mark.asyncio
    async def test_publishes_event_to_subscribers(self):
        task = self.manager.create_task("https://example.com/docs")
        queue = await self.manager.subscribe_progress(task.task_id)

        event = ProgressEvent.task_started(task_id=task.task_id, url=task.url)
        await self.manager.publish_event(task.task_id, event)

        received = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert received.type == ProgressEventType.TASK_STARTED
