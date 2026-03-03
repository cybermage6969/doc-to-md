/**
 * Integration tests for the main Home page.
 * Tests component integration, state transitions, and user flows.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

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
      render(<Home />);
      expect(screen.getByLabelText(/文档网址/)).toBeInTheDocument();
    });

    it("renders the start button", () => {
      render(<Home />);
      expect(screen.getByRole("button", { name: /开始抓取/ })).toBeInTheDocument();
    });

    it("does not show crawl progress before task starts", () => {
      render(<Home />);
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("does not show download button before task completes", () => {
      render(<Home />);
      const downloadBtn = screen.queryByRole("link", { name: /下载/ });
      expect(downloadBtn).not.toBeInTheDocument();
    });

    it("does not show markdown preview before crawl finishes", () => {
      render(<Home />);
      expect(screen.queryByText(/Markdown 预览/)).not.toBeInTheDocument();
    });

    it("does not show error initially", () => {
      render(<Home />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("task loading state", () => {
    it("disables the form while loading", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        isLoading: true,
      });
      render(<Home />);
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
      render(<Home />);
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("passes task ID to useSSEProgress when task exists", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        task: activeTask,
      });
      render(<Home />);
      expect(mockUseSSEProgress).toHaveBeenCalledWith("task-123");
    });

    it("passes null to useSSEProgress when no task", () => {
      render(<Home />);
      expect(mockUseSSEProgress).toHaveBeenCalledWith(null);
    });
  });

  describe("error state", () => {
    it("shows error from useCrawlTask", () => {
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        error: "Network request failed",
      });
      render(<Home />);
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
      render(<Home />);
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
        },
      });
      render(<Home />);
      const downloadLink = screen.getByRole("link", { name: /下载 Markdown/ });
      expect(downloadLink).toBeInTheDocument();
      expect(downloadLink).toHaveAttribute(
        "href",
        "http://localhost:8000/api/tasks/task-789/download"
      );
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
      render(<Home />);
      expect(
        screen.getByRole("button", { name: /新建任务/ })
      ).toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("calls startCrawl with URL and maxPages when form is submitted", async () => {
      const mockStartCrawl = jest.fn();
      mockUseCrawlTask.mockReturnValue({
        ...defaultCrawlTaskReturn,
        startCrawl: mockStartCrawl,
      });
      render(<Home />);

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
      render(<Home />);

      const resetButton = screen.getByRole("button", { name: /新建任务/ });
      await userEvent.click(resetButton);

      expect(mockReset).toHaveBeenCalled();
    });
  });
});
