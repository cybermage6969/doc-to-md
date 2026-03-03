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
        <header className="border-b border-slate-200/60 bg-white">
          <div className="mx-auto flex max-w-2xl items-baseline gap-3 px-6 py-5">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              DocToMD
            </h1>
            <p className="text-sm text-slate-400">
              全站文档抓取 &middot; 一键导出 Markdown
            </p>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
