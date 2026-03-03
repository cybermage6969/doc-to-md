"use client";

import { useCrawlTask } from "@/hooks/use-crawl-task";
import { useSSEProgress } from "@/hooks/use-sse-progress";
import { UrlInputForm } from "@/components/url-input-form";
import { CrawlProgress } from "@/components/crawl-progress";
import { DownloadButton } from "@/components/download-button";
import { ErrorDisplay } from "@/components/error-display";

/**
 * Main page for the Full Doc to Markdown application.
 *
 * Orchestrates the crawl workflow:
 *  1. User submits a URL via UrlInputForm
 *  2. useCrawlTask creates the backend task
 *  3. useSSEProgress streams real-time progress
 *  4. On completion, DownloadButton becomes available for download
 */
export default function Home() {
  const { task, isLoading, error: taskError, startCrawl, reset } = useCrawlTask();
  const { progress, isConnected, error: sseError } = useSSEProgress(
    task?.task_id ?? null
  );

  // task.status is only set once on creation ("pending") and never polled.
  // Use SSE signals instead: downloadUrl means completed; sseError means failed/timed-out.
  const isTaskDone =
    task !== null && (progress.downloadUrl != null || sseError != null);

  const error = taskError ?? sseError;

  return (
    <div className="space-y-6">
      {/* URL Input Form */}
      {!task && (
        <section className="rounded-2xl border border-slate-200/60 bg-white p-8 shadow-sm">
          <UrlInputForm onSubmit={startCrawl} isLoading={isLoading} />
        </section>
      )}

      {/* Error display */}
      <ErrorDisplay error={error} />

      {/* Active crawl progress */}
      {task && (
        <section>
          <CrawlProgress progress={progress} isConnected={isConnected} />
        </section>
      )}

      {/* Completed task actions */}
      {isTaskDone && (
        <div className="flex items-center gap-3">
          <DownloadButton downloadUrl={progress.downloadUrl ?? null} />
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            新建任务
          </button>
        </div>
      )}
    </div>
  );
}
