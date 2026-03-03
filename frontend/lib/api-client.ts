/**
 * API client for the full-doc-to-md backend.
 */

import { API_BASE_URL } from "@/lib/constants";
import type { CrawlTask, CreateTaskRequest } from "@/types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body.detail ?? message;
    } catch {
      // ignore JSON parse error
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

/**
 * Create a new crawl task.
 */
export async function createTask(request: CreateTaskRequest): Promise<CrawlTask> {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<CrawlTask>(response);
}

/**
 * Get the current status of a task.
 */
export async function getTask(taskId: string): Promise<CrawlTask> {
  const encoded = encodeURIComponent(taskId);
  const response = await fetch(`${API_BASE_URL}/api/tasks/${encoded}`);
  return handleResponse<CrawlTask>(response);
}

/**
 * Get the SSE progress stream URL for a task.
 */
export function getProgressUrl(taskId: string): string {
  return `${API_BASE_URL}/api/tasks/${encodeURIComponent(taskId)}/progress`;
}
