"""Tests for API routes - TDD Red phase."""
import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient
from fastapi.testclient import TestClient

from main import app, _rate_limit_store
from task.manager import TaskManager, TaskStatus
from task.progress import ProgressEvent, ProgressEventType
from api.routes import set_task_manager


@pytest.fixture
def task_manager():
    """Fresh TaskManager for each test."""
    manager = TaskManager()
    set_task_manager(manager)
    return manager


@pytest.fixture
def client(task_manager):
    """Synchronous test client. Resets rate-limit counters before each test."""
    _rate_limit_store.clear()
    return TestClient(app)


class TestCreateTask:
    """Test POST /api/tasks endpoint."""

    def test_creates_task_successfully(self, client, task_manager):
        response = client.post(
            "/api/tasks",
            json={"url": "https://example.com/docs", "max_pages": 50},
        )
        assert response.status_code == 201
        data = response.json()
        assert "task_id" in data
        assert data["url"] == "https://example.com/docs"
        assert data["status"] == "pending"
        assert data["max_pages"] == 50

    def test_returns_task_id(self, client, task_manager):
        response = client.post(
            "/api/tasks",
            json={"url": "https://example.com/docs"},
        )
        assert response.status_code == 201
        data = response.json()
        assert len(data["task_id"]) > 0

    def test_uses_default_max_pages(self, client, task_manager):
        response = client.post(
            "/api/tasks",
            json={"url": "https://example.com/docs"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["max_pages"] == 500

    def test_rejects_invalid_url_scheme(self, client, task_manager):
        response = client.post(
            "/api/tasks",
            json={"url": "ftp://example.com/docs"},
        )
        assert response.status_code == 422

    def test_rejects_missing_url(self, client, task_manager):
        response = client.post("/api/tasks", json={})
        assert response.status_code == 422

    def test_rejects_max_pages_above_limit(self, client, task_manager):
        response = client.post(
            "/api/tasks",
            json={"url": "https://example.com/docs", "max_pages": 9999},
        )
        assert response.status_code == 422

    def test_rejects_max_pages_zero(self, client, task_manager):
        response = client.post(
            "/api/tasks",
            json={"url": "https://example.com/docs", "max_pages": 0},
        )
        assert response.status_code == 422


class TestGetTask:
    """Test GET /api/tasks/{task_id} endpoint."""

    def test_gets_existing_task(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        response = client.get(f"/api/tasks/{task.task_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == task.task_id
        assert data["url"] == "https://example.com/docs"

    def test_returns_404_for_nonexistent_task(self, client, task_manager):
        response = client.get("/api/tasks/nonexistent-id")
        assert response.status_code == 404

    def test_returns_task_status(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        task_manager.update_status(task.task_id, TaskStatus.RUNNING)
        response = client.get(f"/api/tasks/{task.task_id}")
        data = response.json()
        assert data["status"] == "running"

    def test_returns_error_message_for_failed_task(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        task_manager.update_status(task.task_id, TaskStatus.FAILED, error="Network timeout")
        response = client.get(f"/api/tasks/{task.task_id}")
        data = response.json()
        assert data["error"] == "Network timeout"

    def test_has_result_false_when_no_result(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        response = client.get(f"/api/tasks/{task.task_id}")
        data = response.json()
        assert data["has_result"] is False

    def test_has_result_true_when_result_set(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        task_manager.set_result(task.task_id, "# Result")
        response = client.get(f"/api/tasks/{task.task_id}")
        data = response.json()
        assert data["has_result"] is True


class TestDownloadResult:
    """Test GET /api/tasks/{task_id}/download endpoint."""

    def test_downloads_completed_task_result(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        task_manager.update_status(task.task_id, TaskStatus.COMPLETED)
        task_manager.set_result(task.task_id, "# Documentation\n\nContent here")
        response = client.get(f"/api/tasks/{task.task_id}/download")
        assert response.status_code == 200
        assert "# Documentation" in response.text

    def test_download_returns_markdown_content_type(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        task_manager.update_status(task.task_id, TaskStatus.COMPLETED)
        task_manager.set_result(task.task_id, "# Docs")
        response = client.get(f"/api/tasks/{task.task_id}/download")
        assert "markdown" in response.headers["content-type"]

    def test_download_includes_content_disposition(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        task_manager.update_status(task.task_id, TaskStatus.COMPLETED)
        task_manager.set_result(task.task_id, "# Docs")
        response = client.get(f"/api/tasks/{task.task_id}/download")
        assert "attachment" in response.headers["content-disposition"]

    def test_download_returns_404_for_nonexistent_task(self, client, task_manager):
        response = client.get("/api/tasks/nonexistent/download")
        assert response.status_code == 404

    def test_download_returns_409_when_task_not_completed(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        response = client.get(f"/api/tasks/{task.task_id}/download")
        assert response.status_code == 409

    def test_download_returns_409_for_running_task(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        task_manager.update_status(task.task_id, TaskStatus.RUNNING)
        response = client.get(f"/api/tasks/{task.task_id}/download")
        assert response.status_code == 409


class TestDownloadZip:
    """Test GET /api/tasks/{task_id}/download/zip endpoint."""

    def test_downloads_zip_for_completed_task(self, client, task_manager):
        from merger.doc_merger import PageData
        task = task_manager.create_task("https://example.com/docs")
        pages = [
            PageData(url="https://example.com/intro", title="Intro", content="Content", order=0),
        ]
        task_manager.set_result(task.task_id, "# Docs", pages=pages, estimated_tokens=100)
        task_manager.update_status(task.task_id, TaskStatus.COMPLETED)
        response = client.get(f"/api/tasks/{task.task_id}/download/zip")
        assert response.status_code == 200

    def test_zip_returns_correct_content_type(self, client, task_manager):
        from merger.doc_merger import PageData
        task = task_manager.create_task("https://example.com/docs")
        pages = [
            PageData(url="https://example.com/intro", title="Intro", content="Content", order=0),
        ]
        task_manager.set_result(task.task_id, "# Docs", pages=pages, estimated_tokens=100)
        task_manager.update_status(task.task_id, TaskStatus.COMPLETED)
        response = client.get(f"/api/tasks/{task.task_id}/download/zip")
        assert "application/zip" in response.headers["content-type"]

    def test_zip_includes_content_disposition(self, client, task_manager):
        from merger.doc_merger import PageData
        task = task_manager.create_task("https://example.com/docs")
        pages = [
            PageData(url="https://example.com/intro", title="Intro", content="Content", order=0),
        ]
        task_manager.set_result(task.task_id, "# Docs", pages=pages, estimated_tokens=100)
        task_manager.update_status(task.task_id, TaskStatus.COMPLETED)
        response = client.get(f"/api/tasks/{task.task_id}/download/zip")
        assert "attachment" in response.headers["content-disposition"]
        assert ".zip" in response.headers["content-disposition"]

    def test_zip_returns_404_for_nonexistent_task(self, client, task_manager):
        response = client.get("/api/tasks/nonexistent/download/zip")
        assert response.status_code == 404

    def test_zip_returns_409_when_task_not_completed(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        response = client.get(f"/api/tasks/{task.task_id}/download/zip")
        assert response.status_code == 409

    def test_zip_returns_404_when_no_pages(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        task_manager.set_result(task.task_id, "# Docs")
        task_manager.update_status(task.task_id, TaskStatus.COMPLETED)
        response = client.get(f"/api/tasks/{task.task_id}/download/zip")
        assert response.status_code == 404


class TestGetTaskEstimatedTokens:
    """Test that GET /api/tasks/{task_id} returns estimated_tokens."""

    def test_returns_estimated_tokens_when_set(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        task_manager.set_result(task.task_id, "# Docs", estimated_tokens=5000)
        response = client.get(f"/api/tasks/{task.task_id}")
        data = response.json()
        assert data["estimated_tokens"] == 5000

    def test_returns_null_estimated_tokens_when_not_set(self, client, task_manager):
        task = task_manager.create_task("https://example.com/docs")
        response = client.get(f"/api/tasks/{task.task_id}")
        data = response.json()
        assert data["estimated_tokens"] is None


class TestHealthCheck:
    """Test health check endpoint."""

    def test_health_check_returns_ok(self, client, task_manager):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
