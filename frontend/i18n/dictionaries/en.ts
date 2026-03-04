import type { TranslationDictionary } from "../types";

export const en: TranslationDictionary = {
  // Site / Layout
  siteTitle: "deepcrawl2md - Deep Crawl to Markdown",
  siteSubtitle: "Crawl entire sites from one link \u00b7 Export as Markdown",
  siteDescription:
    "Deep-crawl any website from a single URL into Markdown, optimized for LLMs",

  // Page - completion
  crawlComplete: "Crawl complete",
  truncationNotice:
    "Discovered {totalDiscovered} pages, crawled {total} (limit reached)",
  newTask: "New task",

  // URL Input Form
  docUrlLabel: "Documentation URL",
  validationEmpty: "Please enter a documentation URL",
  validationInvalid:
    "Please enter a valid URL starting with http:// or https://",
  maxPagesLabel: "Max pages",
  advancedOptions: "Advanced options",
  scopePathLabel: "Scope path",
  scopePathHint: "Optional: only crawl pages under this path prefix",
  buttonCrawling: "Crawling...",
  buttonStartCrawl: "Start crawling",

  // Download Button
  downloadMarkdown: "Download Markdown",

  // Error Display
  errorPrefix: "Error: ",

  // Crawl Progress
  phaseCrawling: "Crawling",
  phaseConverting: "Converting",
  phaseMerging: "Merging",
  phaseCompleted: "Completed",
  connecting: "Connecting...",
  progressPages: "{crawled} / {total} pages",
  progressLabel: "Crawl progress: {percentage}%",
  currentPage: "Current page: ",

  // Task History
  taskHistory: "Task history",

  // Download Section
  totalLabel: "Total",
  tokensUnit: "tokens",
  markdownCardTitle: "Markdown",
  markdownCardDesc:
    "All pages merged into a single file. Best for reading or full-text search.",
  downloadMd: "Download .md",
  splitZipTitle: "Split ZIP",
  recommended: "Recommended",
  splitZipDesc:
    "Chunked by ~80K tokens per file. Feed each part to an LLM separately.",
  downloadZip: "Download .zip",

  // SSE Progress Hook
  connectionFailed: "Connection to progress stream failed",
};
