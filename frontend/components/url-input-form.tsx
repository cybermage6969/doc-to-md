"use client";

import { useState, FormEvent } from "react";
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
  const [url, setUrl] = useState("");
  const [maxPagesInput, setMaxPagesInput] = useState(String(DEFAULT_MAX_PAGES));
  const [scopePath, setScopePath] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setValidationError("请输入文档网址");
      return;
    }
    if (!isValidUrl(url.trim())) {
      setValidationError("请输入以 http:// 或 https:// 开头的有效网址");
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
          文档网址
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
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-colors duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
          最大页数
        </label>
        <input
          id="max-pages"
          type="number"
          value={maxPagesInput}
          onChange={(e) => setMaxPagesInput(e.target.value)}
          min={MIN_MAX_PAGES}
          max={MAX_MAX_PAGES}
          className="w-28 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 transition-colors duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          disabled={isLoading}
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="cursor-pointer text-xs font-medium text-slate-400 transition-colors duration-200 hover:text-slate-600 focus:outline-none"
        >
          {showAdvanced ? "▾ 高级选项" : "▸ 高级选项"}
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-2">
            <label
              htmlFor="scope-path"
              className="block text-sm font-medium text-slate-700"
            >
              范围路径
            </label>
            <input
              id="scope-path"
              type="text"
              value={scopePath}
              onChange={(e) => setScopePath(e.target.value)}
              placeholder="/docs/claude-code"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-colors duration-200 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              disabled={isLoading}
            />
            <p className="text-xs text-slate-400">
              可选：仅抓取该路径前缀下的页面
            </p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="cursor-pointer rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "正在抓取..." : "开始抓取"}
      </button>
    </form>
  );
}
