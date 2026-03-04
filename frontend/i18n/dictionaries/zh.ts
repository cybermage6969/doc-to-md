import type { TranslationDictionary } from "../types";

export const zh: TranslationDictionary = {
  // Site / Layout
  siteTitle: "deepcrawl2md - \u6df1\u5ea6\u722c\u53d6\u8f6c Markdown",
  siteSubtitle: "\u4e00\u4e2a\u94fe\u63a5\u722c\u53d6\u6574\u7ad9 \u00b7 \u5bfc\u51fa\u4e3a Markdown",
  siteDescription: "\u4e00\u4e2a\u94fe\u63a5\u6df1\u5ea6\u722c\u53d6\u6574\u7ad9\uff0c\u5bfc\u51fa\u4e3a Markdown\uff0c\u4e13\u4e3a LLM \u4f18\u5316",

  // Page - completion
  crawlComplete: "\u6293\u53d6\u5b8c\u6210",
  truncationNotice:
    "\u5171\u53d1\u73b0 {totalDiscovered} \u9875\uff0c\u5df2\u6293\u53d6 {total} \u9875\uff08\u8fbe\u5230\u4e0a\u9650\uff09",
  newTask: "\u65b0\u5efa\u4efb\u52a1",

  // URL Input Form
  docUrlLabel: "\u6587\u6863\u7f51\u5740",
  validationEmpty: "\u8bf7\u8f93\u5165\u6587\u6863\u7f51\u5740",
  validationInvalid:
    "\u8bf7\u8f93\u5165\u4ee5 http:// \u6216 https:// \u5f00\u5934\u7684\u6709\u6548\u7f51\u5740",
  maxPagesLabel: "\u6700\u5927\u9875\u6570",
  advancedOptions: "\u9ad8\u7ea7\u9009\u9879",
  scopePathLabel: "\u8303\u56f4\u8def\u5f84",
  scopePathHint: "\u53ef\u9009\uff1a\u4ec5\u6293\u53d6\u8be5\u8def\u5f84\u524d\u7f00\u4e0b\u7684\u9875\u9762",
  buttonCrawling: "\u6b63\u5728\u6293\u53d6...",
  buttonStartCrawl: "\u5f00\u59cb\u6293\u53d6",

  // Download Button
  downloadMarkdown: "\u4e0b\u8f7d Markdown",

  // Error Display
  errorPrefix: "\u9519\u8bef\uff1a",

  // Crawl Progress
  phaseCrawling: "\u6293\u53d6\u4e2d",
  phaseConverting: "\u8f6c\u6362\u4e2d",
  phaseMerging: "\u5408\u5e76\u4e2d",
  phaseCompleted: "\u5df2\u5b8c\u6210",
  connecting: "\u8fde\u63a5\u4e2d...",
  progressPages: "{crawled} / {total} \u9875",
  progressLabel: "\u6293\u53d6\u8fdb\u5ea6\uff1a{percentage}%",
  currentPage: "\u5f53\u524d\u9875\u9762\uff1a",

  // Task History
  taskHistory: "\u5386\u53f2\u4efb\u52a1",

  // Download Section
  totalLabel: "\u5408\u8ba1",
  tokensUnit: "tokens",
  markdownCardTitle: "Markdown",
  markdownCardDesc:
    "\u6240\u6709\u9875\u9762\u5408\u5e76\u4e3a\u5355\u4e2a\u6587\u4ef6\uff0c\u9002\u5408\u9605\u8bfb\u6216\u5168\u6587\u641c\u7d22\u3002",
  downloadMd: "\u4e0b\u8f7d .md",
  splitZipTitle: "\u5206\u5757 ZIP",
  recommended: "\u63a8\u8350",
  splitZipDesc:
    "\u6309\u7ea6 80K tokens \u5206\u5757\uff0c\u53ef\u5206\u6279\u53d1\u9001\u7ed9 LLM\u3002",
  downloadZip: "\u4e0b\u8f7d .zip",

  // SSE Progress Hook
  connectionFailed: "\u8fde\u63a5\u8fdb\u5ea6\u6d41\u5931\u8d25",
};
