/**
 * Tests for useCrawlTask hook - TDD Red phase.
 */
import { renderHook, act } from "@testing-library/react";
import { useCrawlTask } from "@/hooks/use-crawl-task";
import * as apiClient from "@/lib/api-client";

jest.mock("@/lib/api-client");

const mockCreateTask = apiClient.createTask as jest.MockedFunction<typeof apiClient.createTask>;

const mockTask = {
  task_id: "test-123",
  url: "https://example.com/docs",
  status: "pending" as const,
  max_pages: 100,
  has_result: false,
};

describe("useCrawlTask", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts with null task", () => {
    const { result } = renderHook(() => useCrawlTask());
    expect(result.current.task).toBeNull();
  });

  it("starts with loading false", () => {
    const { result } = renderHook(() => useCrawlTask());
    expect(result.current.isLoading).toBe(false);
  });

  it("starts with null error", () => {
    const { result } = renderHook(() => useCrawlTask());
    expect(result.current.error).toBeNull();
  });

  it("sets loading to true when submitting", async () => {
    let resolveCreate: (value: typeof mockTask) => void;
    mockCreateTask.mockReturnValueOnce(
      new Promise((resolve) => { resolveCreate = resolve; })
    );

    const { result } = renderHook(() => useCrawlTask());

    act(() => {
      result.current.startCrawl("https://example.com/docs");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveCreate!(mockTask);
    });
  });

  it("sets task after successful creation", async () => {
    mockCreateTask.mockResolvedValueOnce(mockTask);

    const { result } = renderHook(() => useCrawlTask());

    await act(async () => {
      await result.current.startCrawl("https://example.com/docs");
    });

    expect(result.current.task).toEqual(mockTask);
    expect(result.current.isLoading).toBe(false);
  });

  it("sets error on failure", async () => {
    mockCreateTask.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useCrawlTask());

    await act(async () => {
      await result.current.startCrawl("https://example.com/docs");
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.task).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("calls createTask with correct url", async () => {
    mockCreateTask.mockResolvedValueOnce(mockTask);

    const { result } = renderHook(() => useCrawlTask());

    await act(async () => {
      await result.current.startCrawl("https://example.com/docs", 50);
    });

    expect(mockCreateTask).toHaveBeenCalledWith({
      url: "https://example.com/docs",
      max_pages: 50,
    });
  });

  it("resets state when reset is called", async () => {
    mockCreateTask.mockResolvedValueOnce(mockTask);

    const { result } = renderHook(() => useCrawlTask());

    await act(async () => {
      await result.current.startCrawl("https://example.com/docs");
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.task).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
