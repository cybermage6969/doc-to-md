"""Progress event types and SSE serialization."""
import json
from dataclasses import dataclass, field
from enum import Enum


class ProgressEventType(str, Enum):
    TASK_STARTED = "task_started"
    PAGE_DISCOVERED = "page_discovered"
    PAGE_CRAWLED = "page_crawled"
    PHASE_CHANGED = "phase_changed"
    TASK_COMPLETED = "task_completed"
    TASK_FAILED = "task_failed"


@dataclass
class ProgressEvent:
    """A single progress event to be sent via SSE."""

    type: ProgressEventType
    data: dict = field(default_factory=dict)

    # ------------------------------------------------------------------
    # Factory methods
    # ------------------------------------------------------------------

    @classmethod
    def task_started(cls, task_id: str, url: str) -> "ProgressEvent":
        return cls(
            type=ProgressEventType.TASK_STARTED,
            data={"task_id": task_id, "url": url},
        )

    @classmethod
    def page_discovered(cls, total_discovered: int) -> "ProgressEvent":
        return cls(
            type=ProgressEventType.PAGE_DISCOVERED,
            data={"total_discovered": total_discovered},
        )

    @classmethod
    def page_crawled(
        cls,
        crawled: int,
        total: int,
        url: str,
        title: str,
        status: str,
    ) -> "ProgressEvent":
        return cls(
            type=ProgressEventType.PAGE_CRAWLED,
            data={
                "crawled": crawled,
                "total": total,
                "url": url,
                "title": title,
                "status": status,
            },
        )

    @classmethod
    def phase_changed(cls, phase: str) -> "ProgressEvent":
        return cls(
            type=ProgressEventType.PHASE_CHANGED,
            data={"phase": phase},
        )

    @classmethod
    def task_completed(
        cls,
        total_pages: int,
        download_url: str,
        total_discovered: int | None = None,
        estimated_tokens: int | None = None,
        download_zip_url: str | None = None,
        zip_parts: list | None = None,
    ) -> "ProgressEvent":
        data: dict = {"total_pages": total_pages, "download_url": download_url}
        if total_discovered is not None:
            data["total_discovered"] = total_discovered
        if estimated_tokens is not None:
            data["estimated_tokens"] = estimated_tokens
        if download_zip_url is not None:
            data["download_zip_url"] = download_zip_url
        if zip_parts is not None:
            data["zip_parts"] = zip_parts
        return cls(
            type=ProgressEventType.TASK_COMPLETED,
            data=data,
        )

    @classmethod
    def task_failed(cls, error: str) -> "ProgressEvent":
        return cls(
            type=ProgressEventType.TASK_FAILED,
            data={"error": error},
        )

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_json(self) -> str:
        """Serialize event to JSON string."""
        payload = {"type": self.type.value, **self.data}
        return json.dumps(payload)

    def to_sse(self) -> str:
        """Serialize event to SSE format: 'data: {...}\\n\\n'."""
        return f"data: {self.to_json()}\n\n"
