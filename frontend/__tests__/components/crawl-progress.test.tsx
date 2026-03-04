/**
 * Tests for CrawlProgress component.
 */
import React from "react";
import { screen } from "@testing-library/react";
import { CrawlProgress } from "@/components/crawl-progress";
import { renderWithProviders } from "@/__tests__/test-utils";
import type { CrawlProgress as CrawlProgressType } from "@/types";

const defaultProgress: CrawlProgressType = {
  phase: "crawling",
  crawled: 5,
  total: 20,
  currentUrl: "https://example.com/docs/page5",
  currentTitle: "Page 5",
};

describe("CrawlProgress", () => {
  it("displays crawled and total counts", () => {
    renderWithProviders(<CrawlProgress progress={defaultProgress} isConnected={true} />);
    expect(screen.getByText(/5 \/ 20/)).toBeInTheDocument();
  });

  it("displays current page title", () => {
    renderWithProviders(<CrawlProgress progress={defaultProgress} isConnected={true} />);
    expect(screen.getByText("Page 5")).toBeInTheDocument();
  });

  it("displays current phase in Chinese", () => {
    renderWithProviders(<CrawlProgress progress={defaultProgress} isConnected={true} />);
    expect(screen.getByText(/抓取中/)).toBeInTheDocument();
  });

  it("shows progress bar", () => {
    renderWithProviders(<CrawlProgress progress={defaultProgress} isConnected={true} />);
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });

  it("progress bar reflects percentage", () => {
    renderWithProviders(<CrawlProgress progress={defaultProgress} isConnected={true} />);
    const progressBar = screen.getByRole("progressbar");
    // 5/20 = 25%
    expect(progressBar).toHaveAttribute("aria-valuenow", "25");
  });

  it("shows converting phase in Chinese", () => {
    const progress = { ...defaultProgress, phase: "converting" };
    renderWithProviders(<CrawlProgress progress={progress} isConnected={true} />);
    expect(screen.getByText(/转换中/)).toBeInTheDocument();
  });

  it("shows disconnected state in Chinese", () => {
    renderWithProviders(<CrawlProgress progress={defaultProgress} isConnected={false} />);
    expect(screen.getByText(/连接中/)).toBeInTheDocument();
  });

  it("shows 100% when task is complete", () => {
    const progress = { ...defaultProgress, crawled: 20, total: 20 };
    renderWithProviders(<CrawlProgress progress={progress} isConnected={true} />);
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "100");
  });

  it("displays English labels when locale is en", () => {
    renderWithProviders(
      <CrawlProgress progress={defaultProgress} isConnected={true} />,
      { locale: "en" },
    );
    expect(screen.getByText(/Crawling/)).toBeInTheDocument();
    expect(screen.getByText(/5 \/ 20 pages/)).toBeInTheDocument();
  });
});
