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
