/**
 * Locale types and translation dictionary interface.
 * TypeScript enforces that both zh and en dictionaries implement every key.
 */

export type Locale = "zh" | "en";

export interface TranslationDictionary {
  // Site / Layout
  siteTitle: string;
  siteSubtitle: string;
  siteDescription: string;

  // Page - completion
  crawlComplete: string;
  truncationNotice: string;
  newTask: string;

  // URL Input Form
  docUrlLabel: string;
  validationEmpty: string;
  validationInvalid: string;
  maxPagesLabel: string;
  advancedOptions: string;
  scopePathLabel: string;
  scopePathHint: string;
  buttonCrawling: string;
  buttonStartCrawl: string;

  // Download Button
  downloadMarkdown: string;

  // Error Display
  errorPrefix: string;

  // Crawl Progress
  phaseCrawling: string;
  phaseConverting: string;
  phaseMerging: string;
  phaseCompleted: string;
  connecting: string;
  progressPages: string;
  progressLabel: string;
  currentPage: string;

  // Task History
  taskHistory: string;

  // Download Section
  totalLabel: string;
  tokensUnit: string;
  markdownCardTitle: string;
  markdownCardDesc: string;
  downloadMd: string;
  splitZipTitle: string;
  recommended: string;
  splitZipDesc: string;
  downloadZip: string;

  // SSE Progress Hook
  connectionFailed: string;
}
