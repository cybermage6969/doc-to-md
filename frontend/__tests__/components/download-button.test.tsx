/**
 * Tests for DownloadButton component.
 */
import React from "react";
import { screen } from "@testing-library/react";
import { DownloadButton } from "@/components/download-button";
import { renderWithProviders } from "@/__tests__/test-utils";

describe("DownloadButton", () => {
  it("renders download button", () => {
    renderWithProviders(<DownloadButton downloadUrl="/api/tasks/abc/download" />);
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("link points to download URL", () => {
    renderWithProviders(<DownloadButton downloadUrl="/api/tasks/abc/download" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/api/tasks/abc/download");
  });

  it("has download attribute", () => {
    renderWithProviders(<DownloadButton downloadUrl="/api/tasks/abc/download" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("download");
  });

  it("shows download text in Chinese", () => {
    renderWithProviders(<DownloadButton downloadUrl="/api/tasks/abc/download" />);
    expect(screen.getByText(/下载 Markdown/)).toBeInTheDocument();
  });

  it("is disabled when no download URL", () => {
    renderWithProviders(<DownloadButton downloadUrl={null} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("shows English text when locale is en", () => {
    renderWithProviders(
      <DownloadButton downloadUrl="/api/tasks/abc/download" />,
      { locale: "en" },
    );
    expect(screen.getByText(/Download Markdown/)).toBeInTheDocument();
  });
});
