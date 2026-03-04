/**
 * Tests for TaskHistory component.
 */
import React from "react";
import { screen } from "@testing-library/react";
import { TaskHistory } from "@/components/task-history";
import { renderWithProviders } from "@/__tests__/test-utils";
import type { CompletedTask } from "@/types";

describe("TaskHistory", () => {
  it("renders nothing when tasks array is empty", () => {
    const { container } = renderWithProviders(<TaskHistory tasks={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the history heading when tasks exist", () => {
    const tasks: CompletedTask[] = [
      {
        taskId: "task-1",
        url: "https://docs.example.com",
        downloadUrl: "http://localhost:8000/api/tasks/task-1/download",
        completedAt: new Date("2026-03-04T10:00:00Z"),
      },
    ];
    renderWithProviders(<TaskHistory tasks={tasks} />);
    expect(screen.getByText(/历史任务/)).toBeInTheDocument();
  });

  it("displays task URL", () => {
    const tasks: CompletedTask[] = [
      {
        taskId: "task-1",
        url: "https://docs.example.com/long-path",
        downloadUrl: "http://localhost:8000/api/tasks/task-1/download",
        completedAt: new Date("2026-03-04T10:00:00Z"),
      },
    ];
    renderWithProviders(<TaskHistory tasks={tasks} />);
    expect(
      screen.getByText(/docs\.example\.com/)
    ).toBeInTheDocument();
  });

  it("renders download link for each task", () => {
    const tasks: CompletedTask[] = [
      {
        taskId: "task-1",
        url: "https://docs.example.com",
        downloadUrl: "http://localhost:8000/api/tasks/task-1/download",
        completedAt: new Date("2026-03-04T10:00:00Z"),
      },
    ];
    renderWithProviders(<TaskHistory tasks={tasks} />);
    const link = screen.getByRole("link", { name: /MD/ });
    expect(link).toHaveAttribute(
      "href",
      "http://localhost:8000/api/tasks/task-1/download"
    );
  });

  it("displays completion time", () => {
    const tasks: CompletedTask[] = [
      {
        taskId: "task-1",
        url: "https://docs.example.com",
        downloadUrl: "http://localhost:8000/api/tasks/task-1/download",
        completedAt: new Date("2026-03-04T10:30:00Z"),
      },
    ];
    renderWithProviders(<TaskHistory tasks={tasks} />);
    const timeEl = screen.getByText(
      new Date("2026-03-04T10:30:00Z").toLocaleTimeString()
    );
    expect(timeEl).toBeInTheDocument();
    expect(timeEl.tagName).toBe("TIME");
  });

  it("renders multiple tasks with newest first", () => {
    const tasks: CompletedTask[] = [
      {
        taskId: "task-1",
        url: "https://old-docs.example.com",
        downloadUrl: "http://localhost:8000/api/tasks/task-1/download",
        completedAt: new Date("2026-03-04T10:00:00Z"),
      },
      {
        taskId: "task-2",
        url: "https://new-docs.example.com",
        downloadUrl: "http://localhost:8000/api/tasks/task-2/download",
        completedAt: new Date("2026-03-04T11:00:00Z"),
      },
    ];
    renderWithProviders(<TaskHistory tasks={tasks} />);
    const links = screen.getAllByRole("link", { name: /MD/ });
    expect(links).toHaveLength(2);

    // Newest task (task-2) should appear first
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/new-docs\.example\.com/);
    expect(items[1]).toHaveTextContent(/old-docs\.example\.com/);
  });

  it("shows English heading when locale is en", () => {
    const tasks: CompletedTask[] = [
      {
        taskId: "task-1",
        url: "https://docs.example.com",
        downloadUrl: "http://localhost:8000/api/tasks/task-1/download",
        completedAt: new Date("2026-03-04T10:00:00Z"),
      },
    ];
    renderWithProviders(<TaskHistory tasks={tasks} />, { locale: "en" });
    expect(screen.getByText(/Task history/)).toBeInTheDocument();
  });
});
