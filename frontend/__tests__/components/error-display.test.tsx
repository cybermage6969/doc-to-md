/**
 * Tests for ErrorDisplay component - TDD Red phase.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { ErrorDisplay } from "@/components/error-display";

describe("ErrorDisplay", () => {
  it("renders error message", () => {
    render(<ErrorDisplay error="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders nothing when error is null", () => {
    const { container } = render(<ErrorDisplay error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("has alert role for accessibility", () => {
    render(<ErrorDisplay error="An error occurred" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders empty string as nothing", () => {
    const { container } = render(<ErrorDisplay error="" />);
    expect(container.firstChild).toBeNull();
  });
});
