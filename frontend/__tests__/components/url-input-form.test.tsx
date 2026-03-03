/**
 * Tests for UrlInputForm component.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UrlInputForm } from "@/components/url-input-form";

const mockOnSubmit = jest.fn();

describe("UrlInputForm", () => {
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it("renders URL input field", () => {
    render(<UrlInputForm onSubmit={mockOnSubmit} isLoading={false} />);
    expect(screen.getByLabelText(/文档网址/)).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<UrlInputForm onSubmit={mockOnSubmit} isLoading={false} />);
    expect(screen.getByRole("button", { name: /开始抓取/ })).toBeInTheDocument();
  });

  it("calls onSubmit with URL when form is submitted", async () => {
    const user = userEvent.setup();
    render(<UrlInputForm onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByLabelText(/文档网址/);
    await user.type(input, "https://example.com/docs");
    await user.click(screen.getByRole("button", { name: /开始抓取/ }));

    expect(mockOnSubmit).toHaveBeenCalledWith("https://example.com/docs", expect.any(Number), undefined);
  });

  it("disables submit button when loading", () => {
    render(<UrlInputForm onSubmit={mockOnSubmit} isLoading={true} />);
    expect(screen.getByRole("button", { name: /正在抓取/ })).toBeDisabled();
  });

  it("shows validation error for empty URL", async () => {
    const user = userEvent.setup();
    render(<UrlInputForm onSubmit={mockOnSubmit} isLoading={false} />);

    await user.click(screen.getByRole("button", { name: /开始抓取/ }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("shows validation error for invalid URL", async () => {
    const user = userEvent.setup();
    render(<UrlInputForm onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByLabelText(/文档网址/);
    await user.type(input, "not-a-valid-url");
    await user.click(screen.getByRole("button", { name: /开始抓取/ }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders max pages input", () => {
    render(<UrlInputForm onSubmit={mockOnSubmit} isLoading={false} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("submits with custom max pages", async () => {
    const user = userEvent.setup();
    render(<UrlInputForm onSubmit={mockOnSubmit} isLoading={false} />);

    const urlInput = screen.getByLabelText(/文档网址/);
    await user.type(urlInput, "https://example.com/docs");

    const maxPagesInput = screen.getByRole("spinbutton");
    await user.clear(maxPagesInput);
    await user.type(maxPagesInput, "50");

    await user.click(screen.getByRole("button", { name: /开始抓取/ }));

    expect(mockOnSubmit).toHaveBeenCalledWith("https://example.com/docs", 50, undefined);
  });

  it("shows advanced options when toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<UrlInputForm onSubmit={mockOnSubmit} isLoading={false} />);

    expect(screen.queryByLabelText(/范围路径/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /高级选项/ }));

    expect(screen.getByLabelText(/范围路径/)).toBeInTheDocument();
  });

  it("submits with scope path when provided", async () => {
    const user = userEvent.setup();
    render(<UrlInputForm onSubmit={mockOnSubmit} isLoading={false} />);

    const urlInput = screen.getByLabelText(/文档网址/);
    await user.type(urlInput, "https://example.com/docs");

    await user.click(screen.getByRole("button", { name: /高级选项/ }));
    const scopeInput = screen.getByLabelText(/范围路径/);
    await user.type(scopeInput, "/docs/claude-code");

    await user.click(screen.getByRole("button", { name: /开始抓取/ }));

    expect(mockOnSubmit).toHaveBeenCalledWith(
      "https://example.com/docs",
      expect.any(Number),
      "/docs/claude-code"
    );
  });
});
