"use client";

import { useState, useEffect } from "react";
import { useCrawlTask } from "@/hooks/use-crawl-task";
import { useSSEProgress } from "@/hooks/use-sse-progress";
import { UrlInputForm } from "@/components/url-input-form";
import { CrawlProgress } from "@/components/crawl-progress";
import { DownloadSection } from "@/components/download-section";
import { ErrorDisplay } from "@/components/error-display";
import { TaskHistory } from "@/components/task-history";
import type { CompletedTask } from "@/types";

/**
 * Main page for the Full Doc to Markdown application.
 *
 * Orchestrates the crawl workflow:
 *  1. User submits a URL via UrlInputForm
 *  2. useCrawlTask creates the backend task
 *  3. useSSEProgress streams real-time progress
 *  4. On completion, DownloadSection shows token count and dual download buttons
 *  5. Completed tasks are stored in memory for history access
 */
export default function Home() {
  const { task, isLoading, error: taskError, startCrawl, reset } = useCrawlTask();
  const { progress, isConnected, error: sseError } = useSSEProgress(
    task?.task_id ?? null
  );

  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);

  // task.status is only set once on creation ("pending") and never polled.
  // Use SSE signals instead: downloadUrl means completed; sseError means failed/timed-out.
  const isTaskDone =
    task !== null && (progress.downloadUrl != null || sseError != null);

  const error = taskError ?? sseError;

  // Record completed task into history (once per task, deduplicated via state)
  useEffect(() => {
    if (!task || !progress.downloadUrl) return;

    setCompletedTasks((prev) => {
      if (prev.some((t) => t.taskId === task.task_id)) return prev;
      return [
        ...prev,
        {
          taskId: task.task_id,
          url: task.url,
          downloadUrl: progress.downloadUrl!,
          downloadZipUrl: progress.downloadZipUrl,
          estimatedTokens: progress.estimatedTokens,
          zipParts: progress.zipParts,
          completedAt: new Date(),
        },
      ];
    });
  }, [task, progress.downloadUrl, progress.downloadZipUrl, progress.estimatedTokens, progress.zipParts]); // eslint-disable-line react-hooks/exhaustive-deps -- dedup guard makes extra fires safe

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
        <div className="space-y-4">
          {progress.downloadUrl && (
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                抓取完成
              </span>
              {progress.totalDiscovered != null &&
                progress.totalDiscovered > progress.total && (
                  <span className="text-xs text-amber-600">
                    共发现 {progress.totalDiscovered} 页，已抓取 {progress.total}{" "}
                    页（达到上限）
                  </span>
                )}
            </div>
          )}
          <DownloadSection
            downloadUrl={progress.downloadUrl ?? null}
            downloadZipUrl={progress.downloadZipUrl ?? null}
            estimatedTokens={progress.estimatedTokens ?? null}
            zipParts={progress.zipParts ?? null}
          />
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            新建任务
          </button>
        </div>
      )}

      {/* Task history */}
      <TaskHistory tasks={completedTasks} />
    </div>
  );
}
