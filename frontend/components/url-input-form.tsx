"use client";

import { useState, FormEvent } from "react";
import { useLocale } from "@/i18n";
import { DEFAULT_MAX_PAGES, MIN_MAX_PAGES, MAX_MAX_PAGES } from "@/lib/constants";

interface UrlInputFormProps {
  onSubmit: (url: string, maxPages: number, scopePath?: string) => void;
  isLoading: boolean;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * URL input form with validation and crawl options.
 */
export function UrlInputForm({ onSubmit, isLoading }: UrlInputFormProps) {
  const { t } = useLocale();
  const [url, setUrl] = useState("");
  const [maxPagesInput, setMaxPagesInput] = useState(String(DEFAULT_MAX_PAGES));
  const [scopePath, setScopePath] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setValidationError(t("validationEmpty"));
      return;
    }
    if (!isValidUrl(url.trim())) {
      setValidationError(t("validationInvalid"));
      return;
    }

    const maxPages = Math.max(MIN_MAX_PAGES, Math.min(MAX_MAX_PAGES, parseInt(maxPagesInput) || DEFAULT_MAX_PAGES));
    const trimmedScope = scopePath.trim();
    setValidationError(null);
    onSubmit(url.trim(), maxPages, trimmedScope || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label
          htmlFor="doc-url"
          className="block text-sm font-medium text-slate-700"
        >
          {t("docUrlLabel")}
        </label>
        <input
          id="doc-url"
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (validationError) setValidationError(null);
          }}
          placeholder="https://docs.example.com/"
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-colors duration-200 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          disabled={isLoading}
        />
        {validationError && (
          <p role="alert" className="text-xs text-red-500">
            {validationError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="max-pages"
          className="block text-sm font-medium text-slate-700"
        >
          {t("maxPagesLabel")}
        </label>
        <input
          id="max-pages"
          type="number"
          value={maxPagesInput}
          onChange={(e) => setMaxPagesInput(e.target.value)}
          min={MIN_MAX_PAGES}
          max={MAX_MAX_PAGES}
          className="w-28 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 transition-colors duration-200 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          disabled={isLoading}
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="cursor-pointer text-xs font-medium text-slate-400 transition-colors duration-200 hover:text-slate-600 focus:outline-none"
        >
          {showAdvanced ? "\u25be " : "\u25b8 "}{t("advancedOptions")}
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-2">
            <label
              htmlFor="scope-path"
              className="block text-sm font-medium text-slate-700"
            >
              {t("scopePathLabel")}
            </label>
            <input
              id="scope-path"
              type="text"
              value={scopePath}
              onChange={(e) => setScopePath(e.target.value)}
              placeholder="/docs/claude-code"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-colors duration-200 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              disabled={isLoading}
            />
            <p className="text-xs text-slate-400">
              {t("scopePathHint")}
            </p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="cursor-pointer rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? t("buttonCrawling") : t("buttonStartCrawl")}
      </button>
    </form>
  );
}
