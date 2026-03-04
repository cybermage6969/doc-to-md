"""Pydantic models for API request/response."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from task.manager import TaskStatus


class CreateTaskRequest(BaseModel):
    """Request body for POST /api/tasks."""
    url: str = Field(..., description="Starting URL to crawl")
    max_pages: int = Field(default=500, ge=1, le=2000, description="Maximum pages to crawl")
    scope_path: str | None = Field(
        default=None,
        description="Optional path prefix to restrict crawl scope (e.g., '/docs/claude-code')",
    )

    @field_validator("scope_path")
    @classmethod
    def validate_scope_path(cls, v: str | None) -> str | None:
        if v is None:
            return v
        stripped = v.strip()
        if not stripped:
            return None
        if not stripped.startswith("/"):
            raise ValueError("scope_path must start with '/'")
        return stripped


class TaskResponse(BaseModel):
    """Response body for task creation and retrieval."""
    task_id: str
    url: str
    status: TaskStatus
    max_pages: int
    error: Optional[str] = None
    has_result: bool = False
    estimated_tokens: int | None = None
