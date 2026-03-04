import React from "react";
import { screen } from "@testing-library/react";
import { DownloadSection } from "@/components/download-section";
import { renderWithProviders } from "@/__tests__/test-utils";

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
    renderWithProviders(<DownloadSection {...defaultProps} />);
    expect(
      screen.getByRole("link", { name: /下载 .md/ })
    ).toBeInTheDocument();
  });

  it("renders zip download link", () => {
    renderWithProviders(<DownloadSection {...defaultProps} />);
    expect(
      screen.getByRole("link", { name: /下载 .zip/ })
    ).toBeInTheDocument();
  });

  it("displays formatted token count in K", () => {
    renderWithProviders(<DownloadSection {...defaultProps} />);
    expect(screen.getByText(/50\.0K/)).toBeInTheDocument();
  });

  it("shows Recommended badge when tokens exceed 100K", () => {
    renderWithProviders(<DownloadSection {...defaultProps} estimatedTokens={150000} />);
    expect(screen.getByText("推荐")).toBeInTheDocument();
  });

  it("does not show Recommended badge when tokens are under 100K", () => {
    renderWithProviders(<DownloadSection {...defaultProps} />);
    expect(screen.queryByText("推荐")).not.toBeInTheDocument();
  });

  it("formats millions correctly", () => {
    renderWithProviders(<DownloadSection {...defaultProps} estimatedTokens={1500000} />);
    expect(screen.getByText(/1\.5M/)).toBeInTheDocument();
  });

  it("renders disabled buttons when URLs are null", () => {
    renderWithProviders(
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
    renderWithProviders(
      <DownloadSection
        downloadUrl={defaultProps.downloadUrl}
        downloadZipUrl={defaultProps.downloadZipUrl}
        estimatedTokens={null}
        zipParts={null}
      />
    );
    expect(screen.queryByText("合计")).not.toBeInTheDocument();
  });

  it("shows card descriptions for both download types", () => {
    renderWithProviders(<DownloadSection {...defaultProps} />);
    expect(screen.getByText(/合并为单个文件/)).toBeInTheDocument();
    expect(screen.getByText(/分批发送给 LLM/)).toBeInTheDocument();
  });

  describe("ZIP parts preview", () => {
    it("renders zip parts with filenames and token counts", () => {
      const zipParts = [
        { filename: "full.md", page_count: 5, estimated_tokens: 45000 },
      ];
      renderWithProviders(<DownloadSection {...defaultProps} zipParts={zipParts} />);
      expect(screen.getByText("full.md")).toBeInTheDocument();
      expect(screen.getByText(/45\.0K tokens/)).toBeInTheDocument();
    });

    it("renders multiple parts", () => {
      const zipParts = [
        { filename: "part-001.md", page_count: 10, estimated_tokens: 78000 },
        { filename: "part-002.md", page_count: 8, estimated_tokens: 72000 },
        { filename: "part-003.md", page_count: 3, estimated_tokens: 15000 },
      ];
      renderWithProviders(
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
      renderWithProviders(<DownloadSection {...defaultProps} zipParts={null} />);
      expect(screen.queryByText("full.md")).not.toBeInTheDocument();
      expect(screen.queryByText(/part-/)).not.toBeInTheDocument();
    });

    it("does not show parts preview when zipParts is empty", () => {
      renderWithProviders(<DownloadSection {...defaultProps} zipParts={[]} />);
      expect(screen.queryByText("full.md")).not.toBeInTheDocument();
    });
  });

  describe("i18n: English locale", () => {
    it("renders English labels", () => {
      renderWithProviders(<DownloadSection {...defaultProps} />, { locale: "en" });
      expect(screen.getByRole("link", { name: /Download .md/ })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Download .zip/ })).toBeInTheDocument();
      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText(/single file/i)).toBeInTheDocument();
    });

    it("shows Recommended in English when large", () => {
      renderWithProviders(
        <DownloadSection {...defaultProps} estimatedTokens={150000} />,
        { locale: "en" },
      );
      expect(screen.getByText("Recommended")).toBeInTheDocument();
    });
  });
});
