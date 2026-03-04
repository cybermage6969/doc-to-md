/**
 * Tests for useSSEProgress hook.
 */
import { renderHook, act } from "@testing-library/react";
import { useSSEProgress } from "@/hooks/use-sse-progress";

// Mock the API client so onopen's getTask poll doesn't make real network calls
jest.mock("@/lib/api-client", () => ({
  getProgressUrl: (taskId: string) =>
    `http://localhost:8000/api/tasks/${taskId}/progress`,
  getTask: jest.fn().mockResolvedValue({ status: "running", task_id: "task-123" }),
}));

import { getTask } from "@/lib/api-client";
const mockGetTask = getTask as jest.Mock;

// Mock EventSource
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  static instances: MockEventSource[] = [];

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close = jest.fn();

  simulateMessage(data: object) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data: JSON.stringify(data) }));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }

  simulateOpen() {
    if (this.onopen) {
      this.onopen(new Event("open"));
    }
  }
}

global.EventSource = MockEventSource as unknown as typeof EventSource;

describe("useSSEProgress", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    mockGetTask.mockResolvedValue({ status: "running", task_id: "task-123" });
    jest.useFakeTimers();
  });

  afterEach(() => {
    MockEventSource.instances = [];
    jest.useRealTimers();
  });

  it("starts disconnected when taskId is null", () => {
    const { result } = renderHook(() => useSSEProgress(null));
    expect(result.current.isConnected).toBe(false);
  });

  it("does not create EventSource when taskId is null", () => {
    renderHook(() => useSSEProgress(null));
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("creates EventSource when taskId is provided", () => {
    renderHook(() => useSSEProgress("task-123"));
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it("EventSource URL contains task id", () => {
    renderHook(() => useSSEProgress("task-abc"));
    expect(MockEventSource.instances[0].url).toContain("task-abc");
  });

  it("tracks progress from page_crawled events", () => {
    const { result } = renderHook(() => useSSEProgress("task-123"));

    act(() => {
      MockEventSource.instances[0].simulateMessage({
        type: "page_crawled",
        crawled: 3,
        total: 15,
        url: "https://example.com/page3",
        title: "Page 3",
        status: "success",
      });
    });

    expect(result.current.progress.crawled).toBe(3);
    expect(result.current.progress.total).toBe(15);
  });

  it("updates download URL from task_completed event", () => {
    const { result } = renderHook(() => useSSEProgress("task-123"));

    act(() => {
      MockEventSource.instances[0].simulateMessage({
        type: "task_completed",
        total_pages: 42,
        download_url: "/api/tasks/task-123/download",
      });
    });

    expect(result.current.progress.downloadUrl).toBe(
      "http://localhost:8000/api/tasks/task-123/download"
    );
  });

  it("sets error from task_failed event immediately", () => {
    const { result } = renderHook(() => useSSEProgress("task-123"));

    act(() => {
      MockEventSource.instances[0].simulateMessage({
        type: "task_failed",
        error: "Crawl timed out",
      });
    });

    expect(result.current.error).toBe("Crawl timed out");
  });

  it("closes EventSource on unmount", () => {
    const { unmount } = renderHook(() => useSSEProgress("task-123"));
    const source = MockEventSource.instances[0];
    unmount();
    expect(source.close).toHaveBeenCalled();
  });

  it("closes old EventSource when taskId changes", () => {
    const { rerender } = renderHook(
      ({ taskId }) => useSSEProgress(taskId),
      { initialProps: { taskId: "task-1" as string | null } }
    );

    const firstSource = MockEventSource.instances[0];

    rerender({ taskId: "task-2" });

    expect(firstSource.close).toHaveBeenCalled();
    expect(MockEventSource.instances).toHaveLength(2);
  });

  it("resets progress and error when taskId becomes null", () => {
    const { result, rerender } = renderHook(
      ({ taskId }) => useSSEProgress(taskId),
      { initialProps: { taskId: "task-1" as string | null } }
    );

    // Simulate a completed task
    act(() => {
      MockEventSource.instances[0].simulateMessage({
        type: "task_completed",
        total_pages: 10,
        download_url: "/api/tasks/task-1/download",
      });
    });

    expect(result.current.progress.downloadUrl).toBeDefined();
    expect(result.current.progress.phase).toBe("completed");

    // Reset taskId to null (user clicks "新建任务")
    rerender({ taskId: null });

    expect(result.current.progress.phase).toBe("crawling");
    expect(result.current.progress.downloadUrl).toBeUndefined();
    expect(result.current.progress.crawled).toBe(0);
    expect(result.current.progress.total).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it("resets progress and error when taskId changes to a new task", () => {
    const { result, rerender } = renderHook(
      ({ taskId }) => useSSEProgress(taskId),
      { initialProps: { taskId: "task-1" as string | null } }
    );

    // Simulate progress on first task
    act(() => {
      MockEventSource.instances[0].simulateMessage({
        type: "page_crawled",
        crawled: 5,
        total: 20,
        url: "https://example.com/page5",
        title: "Page 5",
        status: "success",
      });
    });

    expect(result.current.progress.crawled).toBe(5);

    // Switch to a new task
    rerender({ taskId: "task-2" });

    expect(result.current.progress.crawled).toBe(0);
    expect(result.current.progress.total).toBe(0);
    expect(result.current.progress.phase).toBe("crawling");
    expect(result.current.error).toBeNull();
  });

  it("clears previous error when taskId becomes null", () => {
    const { result, rerender } = renderHook(
      ({ taskId }) => useSSEProgress(taskId),
      { initialProps: { taskId: "task-1" as string | null } }
    );

    // Simulate a failed task
    act(() => {
      MockEventSource.instances[0].simulateMessage({
        type: "task_failed",
        error: "Crawl timed out",
      });
    });

    expect(result.current.error).toBe("Crawl timed out");

    // Reset taskId to null
    rerender({ taskId: null });

    expect(result.current.error).toBeNull();
    expect(result.current.progress.phase).toBe("crawling");
  });

  it("does NOT set error immediately on EventSource drop", () => {
    const { result } = renderHook(() => useSSEProgress("task-123"));

    act(() => {
      MockEventSource.instances[0].simulateError();
    });

    // Error should not be visible yet — waiting for reconnect
    expect(result.current.error).toBeNull();
  });

  it("sets error after disconnect timeout with no reconnect", () => {
    const { result } = renderHook(() => useSSEProgress("task-123"));

    act(() => {
      MockEventSource.instances[0].simulateError();
    });

    expect(result.current.error).toBeNull();

    act(() => {
      jest.advanceTimersByTime(15_000);
    });

    expect(result.current.error).not.toBeNull();
  });

  it("clears disconnect error on reconnect (onopen)", async () => {
    const { result } = renderHook(() => useSSEProgress("task-123"));
    const source = MockEventSource.instances[0];

    act(() => {
      source.simulateError();
    });

    // Reconnect before the 15s timer fires
    await act(async () => {
      source.simulateOpen();
      // Let the getTask promise resolve
      await Promise.resolve();
    });

    // Error timer should have been cleared
    act(() => {
      jest.advanceTimersByTime(15_000);
    });

    expect(result.current.error).toBeNull();
  });

  it("polls task status after reconnect and shows download URL if completed", async () => {
    mockGetTask.mockResolvedValueOnce({
      status: "completed",
      task_id: "task-123",
    });

    const { result } = renderHook(() => useSSEProgress("task-123"));
    const source = MockEventSource.instances[0];

    act(() => {
      source.simulateError();
    });

    await act(async () => {
      source.simulateOpen();
      await Promise.resolve();
    });

    expect(result.current.progress.downloadUrl).toBe(
      "http://localhost:8000/api/tasks/task-123/download"
    );
  });

  it("parses totalDiscovered from task_completed event", () => {
    const { result } = renderHook(() => useSSEProgress("task-123"));

    act(() => {
      MockEventSource.instances[0].simulateMessage({
        type: "task_completed",
        total_pages: 10,
        download_url: "/api/tasks/task-123/download",
        total_discovered: 50,
      });
    });

    expect(result.current.progress.totalDiscovered).toBe(50);
  });

  it("totalDiscovered is undefined when not provided in task_completed", () => {
    const { result } = renderHook(() => useSSEProgress("task-123"));

    act(() => {
      MockEventSource.instances[0].simulateMessage({
        type: "task_completed",
        total_pages: 10,
        download_url: "/api/tasks/task-123/download",
      });
    });

    expect(result.current.progress.totalDiscovered).toBeUndefined();
  });

  it("parses estimatedTokens from task_completed event", () => {
    const { result } = renderHook(() => useSSEProgress("task-123"));

    act(() => {
      MockEventSource.instances[0].simulateMessage({
        type: "task_completed",
        total_pages: 10,
        download_url: "/api/tasks/task-123/download",
        estimated_tokens: 25000,
        download_zip_url: "/api/tasks/task-123/download/zip",
      });
    });

    expect(result.current.progress.estimatedTokens).toBe(25000);
  });

  it("parses downloadZipUrl from task_completed event", () => {
    const { result } = renderHook(() => useSSEProgress("task-123"));

    act(() => {
      MockEventSource.instances[0].simulateMessage({
        type: "task_completed",
        total_pages: 10,
        download_url: "/api/tasks/task-123/download",
        download_zip_url: "/api/tasks/task-123/download/zip",
      });
    });

    expect(result.current.progress.downloadZipUrl).toBe(
      "http://localhost:8000/api/tasks/task-123/download/zip"
    );
  });

  it("downloadZipUrl is undefined when not in task_completed", () => {
    const { result } = renderHook(() => useSSEProgress("task-123"));

    act(() => {
      MockEventSource.instances[0].simulateMessage({
        type: "task_completed",
        total_pages: 10,
        download_url: "/api/tasks/task-123/download",
      });
    });

    expect(result.current.progress.downloadZipUrl).toBeUndefined();
  });

  it("parses zipParts from task_completed event", () => {
    const { result } = renderHook(() => useSSEProgress("task-123"));

    const zipParts = [
      { filename: "part-001.md", page_count: 10, estimated_tokens: 78000 },
      { filename: "part-002.md", page_count: 5, estimated_tokens: 42000 },
    ];

    act(() => {
      MockEventSource.instances[0].simulateMessage({
        type: "task_completed",
        total_pages: 15,
        download_url: "/api/tasks/task-123/download",
        download_zip_url: "/api/tasks/task-123/download/zip",
        zip_parts: zipParts,
      });
    });

    expect(result.current.progress.zipParts).toEqual(zipParts);
  });

  it("zipParts is undefined when not in task_completed", () => {
    const { result } = renderHook(() => useSSEProgress("task-123"));

    act(() => {
      MockEventSource.instances[0].simulateMessage({
        type: "task_completed",
        total_pages: 10,
        download_url: "/api/tasks/task-123/download",
      });
    });

    expect(result.current.progress.zipParts).toBeUndefined();
  });

  it("closes source after task_completed to prevent unnecessary reconnects", () => {
    renderHook(() => useSSEProgress("task-123"));
    const source = MockEventSource.instances[0];

    act(() => {
      source.simulateMessage({
        type: "task_completed",
        total_pages: 10,
        download_url: "/api/tasks/task-123/download",
      });
    });

    expect(source.close).toHaveBeenCalled();
  });
});
