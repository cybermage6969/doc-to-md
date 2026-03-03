/**
 * Tests for DownloadButton component.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { DownloadButton } from "@/components/download-button";

describe("DownloadButton", () => {
  it("renders download button", () => {
    render(<DownloadButton downloadUrl="/api/tasks/abc/download" />);
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("link points to download URL", () => {
    render(<DownloadButton downloadUrl="/api/tasks/abc/download" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/api/tasks/abc/download");
  });

  it("has download attribute", () => {
    render(<DownloadButton downloadUrl="/api/tasks/abc/download" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("download");
  });

  it("shows download text in Chinese", () => {
    render(<DownloadButton downloadUrl="/api/tasks/abc/download" />);
    expect(screen.getByText(/下载 Markdown/)).toBeInTheDocument();
  });

  it("is disabled when no download URL", () => {
    render(<DownloadButton downloadUrl={null} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });
});
