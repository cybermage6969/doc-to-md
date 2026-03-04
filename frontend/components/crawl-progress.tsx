"use client";

import { useLocale } from "@/i18n";
import type { TranslationDictionary } from "@/i18n";
import type { CrawlProgress as CrawlProgressType } from "@/types";

interface CrawlProgressProps {
  progress: CrawlProgressType;
  isConnected: boolean;
}

const PHASE_KEYS: Record<string, keyof TranslationDictionary> = {
  crawling: "phaseCrawling",
  converting: "phaseConverting",
  merging: "phaseMerging",
  completed: "phaseCompleted",
};

/**
 * Real-time crawl progress display.
 * Shows phase, progress bar, and current page being crawled.
 */
export function CrawlProgress({ progress, isConnected }: CrawlProgressProps) {
  const { t } = useLocale();
  const { phase, crawled, total, currentTitle } = progress;

  const percentage =
    total > 0 ? Math.round((crawled / total) * 100) : 0;

  const phaseKey = PHASE_KEYS[phase];
  const phaseLabel = phaseKey ? t(phaseKey) : phase;

  return (
    <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06]">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-slate-900" />
          <span className="text-sm font-medium text-slate-700">
            {phaseLabel}
          </span>
        </div>
        {!isConnected && (
          <span className="text-xs text-amber-500">{t("connecting")}</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("progressLabel", { percentage })}
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className="h-full rounded-full bg-slate-900 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>{t("progressPages", { crawled, total })}</span>
          <span>{percentage}%</span>
        </div>
      </div>

      {/* Current page */}
      {currentTitle && (
        <div className="truncate text-sm text-slate-500">
          <span className="text-slate-400">{t("currentPage")}</span>
          {currentTitle}
        </div>
      )}
    </div>
  );
}
