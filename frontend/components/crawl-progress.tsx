"use client";

import type { CrawlProgress as CrawlProgressType } from "@/types";

interface CrawlProgressProps {
  progress: CrawlProgressType;
  isConnected: boolean;
}

const PHASE_LABELS: Record<string, string> = {
  crawling: "抓取中",
  converting: "转换中",
  merging: "合并中",
};

/**
 * Real-time crawl progress display.
 * Shows phase, progress bar, and current page being crawled.
 */
export function CrawlProgress({ progress, isConnected }: CrawlProgressProps) {
  const { phase, crawled, total, currentTitle } = progress;

  const percentage =
    total > 0 ? Math.round((crawled / total) * 100) : 0;

  const phaseLabel = PHASE_LABELS[phase] ?? phase;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
          <span className="text-sm font-medium text-slate-700">
            {phaseLabel}
          </span>
        </div>
        {!isConnected && (
          <span className="text-xs text-amber-500">连接中...</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`抓取进度：${percentage}%`}
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>{crawled} / {total} 页</span>
          <span>{percentage}%</span>
        </div>
      </div>

      {/* Current page */}
      {currentTitle && (
        <div className="truncate text-sm text-slate-500">
          <span className="text-slate-400">当前页面：</span>
          {currentTitle}
        </div>
      )}
    </div>
  );
}
