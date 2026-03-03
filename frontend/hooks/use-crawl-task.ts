"use client";

import { useState, useCallback } from "react";
import { createTask } from "@/lib/api-client";
import { DEFAULT_MAX_PAGES } from "@/lib/constants";
import type { CrawlTask } from "@/types";

interface UseCrawlTaskReturn {
  task: CrawlTask | null;
  isLoading: boolean;
  error: string | null;
  startCrawl: (url: string, maxPages?: number, scopePath?: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for managing crawl task lifecycle.
 *
 * Handles task creation, loading state, and error handling.
 */
export function useCrawlTask(): UseCrawlTaskReturn {
  const [task, setTask] = useState<CrawlTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCrawl = useCallback(
    async (url: string, maxPages: number = DEFAULT_MAX_PAGES, scopePath?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const newTask = await createTask({
          url,
          max_pages: maxPages,
          scope_path: scopePath || undefined,
        });
        setTask(newTask);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setTask(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setTask(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { task, isLoading, error, startCrawl, reset };
}
