"use client";

import { useState, useEffect } from "react";
import { useCrawlTask } from "@/hooks/use-crawl-task";
import { useSSEProgress } from "@/hooks/use-sse-progress";
import { useLocale } from "@/i18n";
import { UrlInputForm } from "@/components/url-input-form";
import { CrawlProgress } from "@/components/crawl-progress";
import { DownloadSection } from "@/components/download-section";
import { ErrorDisplay } from "@/components/error-display";
import { TaskHistory } from "@/components/task-history";
import type { CompletedTask } from "@/types";

/**
 * Main page for the deepcrawl2md application.
 *
 * Orchestrates the crawl workflow:
 *  1. User submits a URL via UrlInputForm
 *  2. useCrawlTask creates the backend task
 *  3. useSSEProgress streams real-time progress
 *  4. On completion, DownloadSection shows token count and dual download buttons
 *  5. Completed tasks are stored in memory for history access
 */
export default function Home() {
  const { t } = useLocale();
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
      {/* Hero + URL Input Form */}
      {!task && (
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {t("siteTitle").replace(/^.*?-\s*/, "")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("siteSubtitle")}
            </p>
          </div>
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
          <div className="flex items-center justify-between">
            <div>
              {progress.totalDiscovered != null &&
                progress.totalDiscovered > progress.total && (
                  <span className="text-xs text-amber-600">
                    {t("truncationNotice", {
                      totalDiscovered: progress.totalDiscovered,
                      total: progress.total,
                    })}
                  </span>
                )}
            </div>
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer text-sm font-medium text-slate-500 transition-colors duration-200 hover:text-slate-900 focus:outline-none"
            >
              {t("newTask")} &rarr;
            </button>
          </div>
          <DownloadSection
            downloadUrl={progress.downloadUrl ?? null}
            downloadZipUrl={progress.downloadZipUrl ?? null}
            estimatedTokens={progress.estimatedTokens ?? null}
            zipParts={progress.zipParts ?? null}
          />
        </div>
      )}

      {/* Task history */}
      <TaskHistory tasks={completedTasks} />
    </div>
  );
}
