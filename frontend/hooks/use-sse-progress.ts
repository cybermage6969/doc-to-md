"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getProgressUrl, getTask } from "@/lib/api-client";
import { API_BASE_URL } from "@/lib/constants";
import type { ProgressEvent, CrawlProgress } from "@/types";

/** How long to wait after an SSE drop before showing the error (ms). */
const DISCONNECT_ERROR_DELAY_MS = 15_000;

const DEFAULT_PROGRESS: CrawlProgress = {
  phase: "crawling",
  crawled: 0,
  total: 0,
  currentUrl: "",
  currentTitle: "",
};

interface UseSSEProgressReturn {
  progress: CrawlProgress;
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook to connect to a task's SSE progress stream.
 *
 * Manages EventSource lifecycle, parses events, and tracks crawl progress.
 * Handles transient disconnections gracefully:
 *   - A brief drop does NOT immediately show an error.
 *   - After DISCONNECT_ERROR_DELAY_MS without reconnecting, the error is shown.
 *   - On reconnect, task status is polled to catch events missed while disconnected.
 *
 * @param taskId - Task ID to subscribe to, or null to disconnect.
 */
export function useSSEProgress(taskId: string | null): UseSSEProgressReturn {
  const [progress, setProgress] = useState<CrawlProgress>(DEFAULT_PROGRESS);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True after a terminal SSE event (task_completed / task_failed) — suppresses onerror. */
  const taskDoneRef = useRef(false);
  /** True after the first onerror — used to distinguish initial open from reconnect. */
  const didDisconnectRef = useRef(false);

  const updateProgress = useCallback((event: ProgressEvent) => {
    setProgress((prev) => {
      switch (event.type) {
        case "page_crawled":
          return {
            ...prev,
            crawled: event.crawled,
            total: event.total,
            currentUrl: event.url,
            currentTitle: event.title,
          };
        case "phase_changed":
          return { ...prev, phase: event.phase };
        case "task_completed":
          return {
            ...prev,
            phase: "completed",
            crawled: event.total_pages,
            total: event.total_pages,
            downloadUrl: `${API_BASE_URL}${event.download_url}`,
            totalDiscovered: event.total_discovered,
          };
        default:
          return prev;
      }
    });
  }, []);

  useEffect(() => {
    // Clean up previous connection and any pending timer
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    taskDoneRef.current = false;
    didDisconnectRef.current = false;

    // Reset state unconditionally (covers both null and new taskId)
    setProgress(DEFAULT_PROGRESS);
    setError(null);

    if (!taskId) {
      setIsConnected(false);
      return;
    }

    const url = getProgressUrl(taskId);
    const source = new EventSource(url);
    sourceRef.current = source;

    // Cancellation flag: set to true in cleanup so in-flight getTask promises
    // don't apply stale state updates after taskId changes or unmount.
    let cancelled = false;

    source.onopen = () => {
      setIsConnected(true);

      // Clear any pending disconnect-error timer
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }

      // On reconnect (not initial open): clear transient error and check task status,
      // in case the task completed while we were disconnected.
      if (didDisconnectRef.current) {
        setError(null);
        getTask(taskId)
          .then((task) => {
            if (cancelled) return;
            if (task.status === "completed") {
              setProgress((prev) => ({
                ...prev,
                downloadUrl: `${API_BASE_URL}/api/tasks/${task.task_id}/download`,
              }));
              taskDoneRef.current = true;
              source.close();
            } else if (task.status === "failed") {
              setError(task.error ?? "Crawl task failed");
              taskDoneRef.current = true;
              source.close();
            }
            // Otherwise task is still running — continue listening to SSE events
          })
          .catch(() => {
            // Ignore polling errors; SSE events will provide updates if available
          });
      }
    };

    source.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as ProgressEvent;

        if (parsed.type === "task_failed") {
          setError(parsed.error ?? "Crawl task failed");
          taskDoneRef.current = true;
          source.close();
        } else if (parsed.type === "task_completed") {
          updateProgress(parsed);
          taskDoneRef.current = true;
          source.close();
        } else {
          updateProgress(parsed);
        }
      } catch {
        // Ignore malformed events
      }
    };

    source.onerror = () => {
      // Ignore onerror after task completion — stream ends cleanly, browser still fires it
      if (taskDoneRef.current) return;

      setIsConnected(false);
      didDisconnectRef.current = true;

      // EventSource auto-reconnects; wait before surfacing the error to the user
      if (!disconnectTimerRef.current) {
        disconnectTimerRef.current = setTimeout(() => {
          setError("Connection to progress stream failed");
          disconnectTimerRef.current = null;
        }, DISCONNECT_ERROR_DELAY_MS);
      }
    };

    // Optimistically mark as connected; onopen will confirm (and handle reconnects)
    setIsConnected(true);

    return () => {
      cancelled = true;
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      source.close();
      sourceRef.current = null;
    };
  }, [taskId, updateProgress]);

  return { progress, isConnected, error };
}
