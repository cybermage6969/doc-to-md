/**
 * Shared TypeScript types for the full-doc-to-md application.
 */

export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface CrawlTask {
  task_id: string;
  url: string;
  status: TaskStatus;
  max_pages: number;
  error?: string;
  has_result: boolean;
}

export interface CreateTaskRequest {
  url: string;
  max_pages?: number;
  scope_path?: string;
}

export interface TaskStartedEvent {
  type: "task_started";
  task_id: string;
  url: string;
}

export interface PageDiscoveredEvent {
  type: "page_discovered";
  total_discovered: number;
}

export interface PageCrawledEvent {
  type: "page_crawled";
  crawled: number;
  total: number;
  url: string;
  title: string;
  status: "success" | "failed";
}

export interface PhaseChangedEvent {
  type: "phase_changed";
  phase: string;
}

export interface TaskCompletedEvent {
  type: "task_completed";
  total_pages: number;
  download_url: string;
  total_discovered?: number;
}

export interface TaskFailedEvent {
  type: "task_failed";
  error: string;
}

export type ProgressEvent =
  | TaskStartedEvent
  | PageDiscoveredEvent
  | PageCrawledEvent
  | PhaseChangedEvent
  | TaskCompletedEvent
  | TaskFailedEvent;

export interface CompletedTask {
  taskId: string;
  url: string;
  downloadUrl: string;
  completedAt: Date;
}

export interface CrawlProgress {
  phase: string;
  crawled: number;
  total: number;
  currentUrl: string;
  currentTitle: string;
  downloadUrl?: string;
  totalDiscovered?: number;
}
