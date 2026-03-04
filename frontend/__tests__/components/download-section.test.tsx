import React from "react";
import { render, screen } from "@testing-library/react";
import { DownloadSection } from "@/components/download-section";

jest.mock("@/lib/url-utils", () => ({
  isSafeDownloadUrl: (url: string) => url.startsWith("http://localhost:8000/"),
}));

describe("DownloadSection", () => {
  const defaultProps = {
    downloadUrl: "http://localhost:8000/api/tasks/t1/download",
    downloadZipUrl: "http://localhost:8000/api/tasks/t1/download/zip",
    estimatedTokens: 50000,
    zipParts: null,
  };

  it("renders markdown download link", () => {
    render(<DownloadSection {...defaultProps} />);
    expect(
      screen.getByRole("link", { name: /Download .md/ })
    ).toBeInTheDocument();
  });

  it("renders zip download link", () => {
    render(<DownloadSection {...defaultProps} />);
    expect(
      screen.getByRole("link", { name: /Download .zip/ })
    ).toBeInTheDocument();
  });

  it("displays formatted token count in K", () => {
    render(<DownloadSection {...defaultProps} />);
    expect(screen.getByText(/50\.0K/)).toBeInTheDocument();
  });

  it("shows Recommended badge when tokens exceed 100K", () => {
    render(<DownloadSection {...defaultProps} estimatedTokens={150000} />);
    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("does not show Recommended badge when tokens are under 100K", () => {
    render(<DownloadSection {...defaultProps} />);
    expect(screen.queryByText("Recommended")).not.toBeInTheDocument();
  });

  it("formats millions correctly", () => {
    render(<DownloadSection {...defaultProps} estimatedTokens={1500000} />);
    expect(screen.getByText(/1\.5M/)).toBeInTheDocument();
  });

  it("renders disabled buttons when URLs are null", () => {
    render(
      <DownloadSection
        downloadUrl={null}
        downloadZipUrl={null}
        estimatedTokens={null}
        zipParts={null}
      />
    );
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it("does not show token summary when estimatedTokens is null", () => {
    render(
      <DownloadSection
        downloadUrl={defaultProps.downloadUrl}
        downloadZipUrl={defaultProps.downloadZipUrl}
        estimatedTokens={null}
        zipParts={null}
      />
    );
    // The total token summary should not appear (card descriptions may mention "tokens")
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
  });

  it("shows card descriptions for both download types", () => {
    render(<DownloadSection {...defaultProps} />);
    expect(screen.getByText(/single file/i)).toBeInTheDocument();
    expect(screen.getByText(/Feed each part/i)).toBeInTheDocument();
  });

  describe("ZIP parts preview", () => {
    it("renders zip parts with filenames and token counts", () => {
      const zipParts = [
        { filename: "full.md", page_count: 5, estimated_tokens: 45000 },
      ];
      render(<DownloadSection {...defaultProps} zipParts={zipParts} />);
      expect(screen.getByText("full.md")).toBeInTheDocument();
      expect(screen.getByText(/45\.0K tokens/)).toBeInTheDocument();
    });

    it("renders multiple parts", () => {
      const zipParts = [
        { filename: "part-001.md", page_count: 10, estimated_tokens: 78000 },
        { filename: "part-002.md", page_count: 8, estimated_tokens: 72000 },
        { filename: "part-003.md", page_count: 3, estimated_tokens: 15000 },
      ];
      render(
        <DownloadSection
          {...defaultProps}
          estimatedTokens={165000}
          zipParts={zipParts}
        />
      );
      expect(screen.getByText("part-001.md")).toBeInTheDocument();
      expect(screen.getByText("part-002.md")).toBeInTheDocument();
      expect(screen.getByText("part-003.md")).toBeInTheDocument();
      expect(screen.getByText(/78\.0K tokens/)).toBeInTheDocument();
      expect(screen.getByText(/72\.0K tokens/)).toBeInTheDocument();
      expect(screen.getByText(/15\.0K tokens/)).toBeInTheDocument();
    });

    it("does not show parts preview when zipParts is null", () => {
      render(<DownloadSection {...defaultProps} zipParts={null} />);
      expect(screen.queryByText("full.md")).not.toBeInTheDocument();
      expect(screen.queryByText(/part-/)).not.toBeInTheDocument();
    });

    it("does not show parts preview when zipParts is empty", () => {
      render(<DownloadSection {...defaultProps} zipParts={[]} />);
      expect(screen.queryByText("full.md")).not.toBeInTheDocument();
    });
  });
});
