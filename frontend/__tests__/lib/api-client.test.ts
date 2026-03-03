/**
 * Tests for API client - TDD Red phase.
 */
import { createTask, getTask, getProgressUrl, ApiError } from "@/lib/api-client";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("createTask", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("sends POST request to /api/tasks", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        task_id: "abc-123",
        url: "https://example.com/docs",
        status: "pending",
        max_pages: 100,
        has_result: false,
      }),
    });

    await createTask({ url: "https://example.com/docs" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/tasks"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns CrawlTask on success", async () => {
    const mockTask = {
      task_id: "abc-123",
      url: "https://example.com/docs",
      status: "pending" as const,
      max_pages: 100,
      has_result: false,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTask,
    });

    const result = await createTask({ url: "https://example.com/docs" });
    expect(result.task_id).toBe("abc-123");
    expect(result.status).toBe("pending");
  });

  it("throws ApiError on HTTP error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: "Validation error" }),
    });

    await expect(createTask({ url: "ftp://bad" })).rejects.toThrow(ApiError);
  });

  it("includes max_pages in request body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        task_id: "abc",
        url: "https://example.com/docs",
        status: "pending",
        max_pages: 50,
        has_result: false,
      }),
    });

    await createTask({ url: "https://example.com/docs", max_pages: 50 });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.max_pages).toBe(50);
  });
});

describe("getTask", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("sends GET request to /api/tasks/{id}", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        task_id: "abc-123",
        url: "https://example.com/docs",
        status: "running",
        max_pages: 100,
        has_result: false,
      }),
    });

    await getTask("abc-123");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/tasks/abc-123")
    );
  });

  it("throws ApiError on 404", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Task not found" }),
    });

    await expect(getTask("nonexistent")).rejects.toThrow(ApiError);
  });
});

describe("getProgressUrl", () => {
  it("returns correct SSE progress URL", () => {
    const url = getProgressUrl("abc-123");
    expect(url).toContain("/api/tasks/abc-123/progress");
  });
});
