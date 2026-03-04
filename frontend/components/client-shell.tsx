"use client";

import { useEffect, type ReactNode } from "react";
import { LocaleProvider, useLocale } from "@/i18n";

function ShellInner({ children }: { children: ReactNode }) {
  const { locale, setLocale, t } = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = t("siteTitle");
  }, [locale, t]);

  return (
    <>
      <header className="bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-6 py-4">
          <h1 className="flex-1 text-sm font-semibold tracking-tight text-slate-900">
            Deep Crawl to Markdown
          </h1>
          <div
            className="flex rounded-lg border border-slate-200 p-0.5"
            role="radiogroup"
            aria-label="Language"
          >
            <button
              type="button"
              role="radio"
              aria-checked={locale === "zh"}
              onClick={() => setLocale("zh")}
              className={`cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium transition-all duration-200 ${
                locale === "zh"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {"\u4e2d"}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={locale === "en"}
              onClick={() => setLocale("en")}
              className={`cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium transition-all duration-200 ${
                locale === "en"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-6 py-14">{children}</main>
    </>
  );
}

export function ClientShell({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <ShellInner>{children}</ShellInner>
    </LocaleProvider>
  );
}
