"use client";

import { isSafeDownloadUrl } from "@/lib/url-utils";
import { formatTokenCount } from "@/lib/format-utils";
import type { ZipPartInfo } from "@/types";

interface DownloadSectionProps {
  downloadUrl: string | null;
  downloadZipUrl: string | null;
  estimatedTokens: number | null;
  zipParts: ZipPartInfo[] | null;
}

const LARGE_TOKEN_THRESHOLD = 100_000;

const downloadIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

const fileIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5 shrink-0 text-slate-400"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0116 6.622V16.5a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 013 16.5v-13z" />
  </svg>
);

/**
 * Download section with card-based layout showing clear descriptions
 * for Markdown vs Split ZIP, plus ZIP file preview with per-file token estimates.
 */
export function DownloadSection({
  downloadUrl,
  downloadZipUrl,
  estimatedTokens,
  zipParts,
}: DownloadSectionProps) {
  const hasMdUrl = downloadUrl != null && isSafeDownloadUrl(downloadUrl);
  const hasZipUrl = downloadZipUrl != null && isSafeDownloadUrl(downloadZipUrl);
  const isLarge = estimatedTokens != null && estimatedTokens > LARGE_TOKEN_THRESHOLD;

  return (
    <div className="space-y-4">
      {/* Token summary */}
      {estimatedTokens != null && (
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-lg font-semibold text-slate-800">
            {formatTokenCount(estimatedTokens)}
          </span>
          <span className="text-sm text-slate-500">tokens</span>
        </div>
      )}

      {/* Download cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Markdown card */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-1 text-sm font-semibold text-slate-800">
            Markdown
          </div>
          <p className="mb-3 text-xs leading-relaxed text-slate-500">
            All pages merged into a single file. Best for reading or full-text search.
          </p>
          <div className="mt-auto">
            {hasMdUrl ? (
              <a
                href={downloadUrl}
                download
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                {downloadIcon}
                Download .md
              </a>
            ) : (
              <button
                disabled
                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
              >
                Download .md
              </button>
            )}
          </div>
        </div>

        {/* ZIP card */}
        <div
          className={`flex flex-col rounded-xl border p-4 ${
            isLarge
              ? "border-indigo-200 bg-indigo-50/30"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">
              Split ZIP
            </span>
            {isLarge && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                Recommended
              </span>
            )}
          </div>
          <p className="mb-3 text-xs leading-relaxed text-slate-500">
            Chunked by ~80K tokens per file. Feed each part to an LLM separately.
          </p>

          {/* ZIP parts preview */}
          {zipParts != null && zipParts.length > 0 && (
            <div className="mb-3 rounded-lg bg-slate-50 p-2.5">
              <div className="space-y-1">
                {zipParts.map((part) => (
                  <div
                    key={part.filename}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex items-center gap-1.5 font-mono text-slate-600">
                      {fileIcon}
                      {part.filename}
                    </span>
                    <span className="whitespace-nowrap text-slate-400">
                      {formatTokenCount(part.estimated_tokens)} tokens
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto">
            {hasZipUrl ? (
              <a
                href={downloadZipUrl}
                download
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {downloadIcon}
                Download .zip
              </a>
            ) : (
              <button
                disabled
                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
              >
                Download .zip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
