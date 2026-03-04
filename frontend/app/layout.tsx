import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocToMD - 全站文档抓取",
  description: "一键抓取文档站点，生成单一 Markdown 文件",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-indigo-500"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                DocToMD
              </h1>
              <p className="hidden text-sm text-slate-400 sm:block">
                全站文档抓取 &middot; 一键导出 Markdown
              </p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
