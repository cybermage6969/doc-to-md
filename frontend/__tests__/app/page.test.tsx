/**
 * Integration tests for the main Home page.
 * Tests component integration, state transitions, and user flows.
 */
import React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { renderWithProviders } from "@/__tests__/test-utils";

// Mock hooks
jest.mock("@/hooks/use-crawl-task", () => ({
  useCrawlTask: jest.fn(),
}));

jest.mock("@/hooks/use-sse-progress", () => ({
  useSSEProgress: jest.fn(),
}));

import { useCrawlTask } from "@/hooks/use-crawl-task";
import { useSSEProgress } from "@/hooks/use-sse-progress";
import type { CrawlTask, CrawlProgress } from "@/types";

const mockUseCrawlTask = useCrawlTask as jest.MockedFunction<typeof useCrawlTask>;
const mockUseSSEProgress = useSSEProgress as jest.MockedFunction<typeof useSSEProgress>;

const defaultProgress: CrawlProgress = {
  phase: "crawling",
  crawled: 0,
  total: 0,
  currentUrl: "",
  currentTitle: "",
};

const defaultSSEReturn = {
  progress: defaultProgress,
  isConnected: false,
  error: null,
};

const defaultCrawlTaskReturn = {
  task: null,
  isLoading: false,
  error: null,
  startCrawl: jest.fn(),
  reset: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCrawlTask.mockReturnValue(defaultCrawlTaskReturn);
  mockUseSSEProgress.mockReturnValue(defaultSSEReturn);
});

describe("Home page", () => {
  describe("initial state", () => {
    it("renders the URL input form", () => {
      renderWithProviders(<Home />);
      expect(screen.getByLabelText(/文档网址/)).toBeInTheDocument();
    });

    it("renders the start button", () => {
      renderWithProviders(<Home />);
      expect(screen.getByRole("button", { name: /开始抓取/ })).toBeInTheDocument();
    });

    it("does not show crawl progress before task starts", () => {
      renderWithProviders(<Home />);
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("does not show download button before task completes", () => {
      renderWithProviders(<Home />);
      const downloadBtn = screen.queryByRole("link", { name: /下载/ });
      expect(downloadBtn).not.toBeInTheDocument();
    });

    it("does not show error initially", () => {
      renderWithProviders(<Home />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("task loading state", () => {
    it("disables the form while loading", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        isLoading: true,
      });
      renderWithProviders(<Home />);
      expect(screen.getByRole("button", { name: /正在抓取/ })).toBeDisabled();
    });
  });

  describe("active task state", () => {
    const activeTask: CrawlTask = {
      task_id: "task-123",
      url: "https://docs.example.com",
      status: "running",
      max_pages: 100,
      has_result: false,
    };

    it("shows crawl progress when task is running", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: activeTask,
      });
      mockUseSSEProgress.mockReturnValue({
        ...defaultSSEReturn,
        progress: { ...defaultProgress, crawled: 3, total: 10 },
        isConnected: true,
      });
      renderWithProviders(<Home />);
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("passes task ID to useSSEProgress when task exists", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: activeTask,
      });
      renderWithProviders(<Home />);
      expect(mockUseSSEProgress).toHaveBeenCalledWith("task-123");
    });

    it("passes null to useSSEProgress when no task", () => {
      renderWithProviders(<Home />);
      expect(mockUseSSEProgress).toHaveBeenCalledWith(null);
    });
  });

  describe("error state", () => {
    it("shows error from useCrawlTask", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        error: "Network request failed",
      });
      renderWithProviders(<Home />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Network request failed/)).toBeInTheDocument();
    });

    it("shows SSE error when task is running but connection fails", () => {
      const activeTask: CrawlTask = {
        task_id: "task-456",
        url: "https://docs.example.com",
        status: "running",
        max_pages: 100,
        has_result: false,
      };
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: activeTask,
      });
      mockUseSSEProgress.mockReturnValue({
        ...defaultSSEReturn,
        error: "Connection to progress stream failed",
      });
      renderWithProviders(<Home />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("completed task state", () => {
    const completedTask: CrawlTask = {
      task_id: "task-789",
      url: "https://docs.example.com",
      status: "completed",
      max_pages: 100,
      has_result: true,
    };

    it("shows download link when task is completed with download URL", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: completedTask,
      });
      mockUseSSEProgress.mockReturnValue({
        ...defaultSSEReturn,
        progress: {
          ...defaultProgress,
          downloadUrl: "http://localhost:8000/api/tasks/task-789/download",
          downloadZipUrl: "http://localhost:8000/api/tasks/task-789/download/zip",
          estimatedTokens: 50000,
        },
      });
      renderWithProviders(<Home />);
      const downloadLink = screen.getByRole("link", { name: /下载 .md/ });
      expect(downloadLink).toBeInTheDocument();
      expect(downloadLink).toHaveAttribute(
        "href",
        "http://localhost:8000/api/tasks/task-789/download"
      );
    });

    it("shows zip download link when task is completed", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: completedTask,
      });
      mockUseSSEProgress.mockReturnValue({
        ...defaultSSEReturn,
        progress: {
          ...defaultProgress,
          downloadUrl: "http://localhost:8000/api/tasks/task-789/download",
          downloadZipUrl: "http://localhost:8000/api/tasks/task-789/download/zip",
        },
      });
      renderWithProviders(<Home />);
      const zipLink = screen.getByRole("link", { name: /下载 .zip/ });
      expect(zipLink).toBeInTheDocument();
      expect(zipLink).toHaveAttribute(
        "href",
        "http://localhost:8000/api/tasks/task-789/download/zip"
      );
    });

    it("shows token count when task is completed", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: completedTask,
      });
      mockUseSSEProgress.mockReturnValue({
        ...defaultSSEReturn,
        progress: {
          ...defaultProgress,
          downloadUrl: "http://localhost:8000/api/tasks/task-789/download",
          estimatedTokens: 50000,
        },
      });
      renderWithProviders(<Home />);
      // Token count appears in both DownloadSection and TaskHistory
      const tokenTexts = screen.getAllByText(/50\.0K/);
      expect(tokenTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("shows new task button after task completes", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: completedTask,
      });
      mockUseSSEProgress.mockReturnValue({
        ...defaultSSEReturn,
        progress: {
          ...defaultProgress,
          downloadUrl: "http://localhost:8000/api/tasks/task-789/download",
        },
      });
      renderWithProviders(<Home />);
      expect(
        screen.getByRole("button", { name: /新建任务/ })
      ).toBeInTheDocument();
    });
  });

  describe("truncation notice", () => {
    const completedTask: CrawlTask = {
      task_id: "task-trunc",
      url: "https://docs.example.com",
      status: "completed",
      max_pages: 100,
      has_result: true,
    };

    it("shows truncation notice when totalDiscovered > total", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: completedTask,
      });
      mockUseSSEProgress.mockReturnValue({
        ...defaultSSEReturn,
        progress: {
          ...defaultProgress,
          phase: "completed",
          crawled: 100,
          total: 100,
          downloadUrl: "http://localhost:8000/api/tasks/task-trunc/download",
          totalDiscovered: 250,
        },
      });
      renderWithProviders(<Home />);
      expect(screen.getByText(/共发现 250 页/)).toBeInTheDocument();
      expect(screen.getByText(/已抓取 100 页/)).toBeInTheDocument();
    });

    it("does not show truncation notice when totalDiscovered equals total", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: completedTask,
      });
      mockUseSSEProgress.mockReturnValue({
        ...defaultSSEReturn,
        progress: {
          ...defaultProgress,
          phase: "completed",
          crawled: 50,
          total: 50,
          downloadUrl: "http://localhost:8000/api/tasks/task-trunc/download",
          totalDiscovered: 50,
        },
      });
      renderWithProviders(<Home />);
      expect(screen.queryByText(/达到上限/)).not.toBeInTheDocument();
    });

    it("does not show truncation notice when totalDiscovered is undefined", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: completedTask,
      });
      mockUseSSEProgress.mockReturnValue({
        ...defaultSSEReturn,
        progress: {
          ...defaultProgress,
          phase: "completed",
          crawled: 50,
          total: 50,
          downloadUrl: "http://localhost:8000/api/tasks/task-trunc/download",
        },
      });
      renderWithProviders(<Home />);
      expect(screen.queryByText(/达到上限/)).not.toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("calls startCrawl with URL and maxPages when form is submitted", async () => {
      const mockStartCrawl = jest.fn();
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        startCrawl: mockStartCrawl,
      });
      renderWithProviders(<Home />);

      const urlInput = screen.getByLabelText(/文档网址/);
      await userEvent.type(urlInput, "https://docs.example.com");

      const submitButton = screen.getByRole("button", { name: /开始抓取/ });
      await userEvent.click(submitButton);

      expect(mockStartCrawl).toHaveBeenCalledWith("https://docs.example.com", expect.any(Number), undefined);
    });
  });

  describe("reset flow", () => {
    it("calls reset when new task button is clicked", async () => {
      const mockReset = jest.fn();
      const completedTask: CrawlTask = {
        task_id: "task-789",
        url: "https://docs.example.com",
        status: "completed",
        max_pages: 100,
        has_result: true,
      };
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: completedTask,
        reset: mockReset,
      });
      mockUseSSEProgress.mockReturnValue({
        ...defaultSSEReturn,
        progress: {
          ...defaultProgress,
          downloadUrl: "http://localhost:8000/api/tasks/task-789/download",
        },
      });
      renderWithProviders(<Home />);

      const resetButton = screen.getByRole("button", { name: /新建任务/ });
      await userEvent.click(resetButton);

      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe("task history", () => {
    it("does not show history section initially", () => {
      renderWithProviders(<Home />);
      expect(screen.queryByText(/历史任务/)).not.toBeInTheDocument();
    });

    it("shows completed task in history when task is complete", () => {
      const mockReset = jest.fn();
      const completedTask: CrawlTask = {
        task_id: "task-789",
        url: "https://docs.example.com",
        status: "completed",
        max_pages: 100,
        has_result: true,
      };

      // Start with a completed task
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: completedTask,
        reset: mockReset,
      });
      mockUseSSEProgress.mockReturnValue({
        ...defaultSSEReturn,
        progress: {
          ...defaultProgress,
          phase: "completed",
          crawled: 10,
          total: 10,
          downloadUrl: "http://localhost:8000/api/tasks/task-789/download",
        },
      });

      renderWithProviders(<Home />);

      // History should show the completed task (it gets added when task completes)
      expect(screen.getByText(/历史任务/)).toBeInTheDocument();
      expect(screen.getByText(/docs\.example\.com/)).toBeInTheDocument();
    });

    it("preserves history across reset cycles", async () => {
      const mockReset = jest.fn();
      const completedTask: CrawlTask = {
        task_id: "task-789",
        url: "https://docs.example.com",
        status: "completed",
        max_pages: 100,
        has_result: true,
      };

      // Completed task state
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: completedTask,
        reset: mockReset,
      });
      mockUseSSEProgress.mockReturnValue({
        ...defaultSSEReturn,
        progress: {
          ...defaultProgress,
          phase: "completed",
          crawled: 10,
          total: 10,
          downloadUrl: "http://localhost:8000/api/tasks/task-789/download",
        },
      });

      const { rerender } = renderWithProviders(<Home />);

      // Click new task button
      const resetButton = screen.getByRole("button", { name: /新建任务/ });
      await userEvent.click(resetButton);

      // Simulate reset state (task is null again)
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: null,
        reset: mockReset,
      });
      mockUseSSEProgress.mockReturnValue(defaultSSEReturn);
      rerender(<Home />);

      // History should still show the previous task with its URL
      expect(screen.getByText(/历史任务/)).toBeInTheDocument();
      expect(screen.getByText(/docs\.example\.com/)).toBeInTheDocument();
    });
  });

  describe("i18n: English locale", () => {
    it("renders English labels when locale is en", () => {
      renderWithProviders(<Home />, { locale: "en" });
      expect(screen.getByLabelText(/Documentation URL/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Start crawling/ })).toBeInTheDocument();
    });
  });
});
