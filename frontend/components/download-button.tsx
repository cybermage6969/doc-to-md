"use client";

import { useLocale } from "@/i18n";
import { isSafeDownloadUrl } from "@/lib/url-utils";

interface DownloadButtonProps {
  downloadUrl: string | null;
}

/**
 * Download button for the generated Markdown file.
 * Renders a disabled button when no URL is available.
 */
export function DownloadButton({ downloadUrl }: DownloadButtonProps) {
  const { t } = useLocale();

  if (downloadUrl && isSafeDownloadUrl(downloadUrl)) {
    return (
      <a
        href={downloadUrl}
        download
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
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
        {t("downloadMarkdown")}
      </a>
    );
  }

  return (
    <button
      disabled
      className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-medium text-slate-400"
    >
      {t("downloadMarkdown")}
    </button>
  );
}
