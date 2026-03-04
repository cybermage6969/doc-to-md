/**
 * Tests for ErrorDisplay component.
 */
import React from "react";
import { screen } from "@testing-library/react";
import { ErrorDisplay } from "@/components/error-display";
import { renderWithProviders } from "@/__tests__/test-utils";

describe("ErrorDisplay", () => {
  it("renders error message", () => {
    renderWithProviders(<ErrorDisplay error="Something went wrong" />);
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  });

  it("renders nothing when error is null", () => {
    const { container } = renderWithProviders(<ErrorDisplay error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("has alert role for accessibility", () => {
    renderWithProviders(<ErrorDisplay error="An error occurred" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders empty string as nothing", () => {
    const { container } = renderWithProviders(<ErrorDisplay error="" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows Chinese error prefix by default", () => {
    renderWithProviders(<ErrorDisplay error="test" />);
    expect(screen.getByText(/错误：/)).toBeInTheDocument();
  });

  it("shows English error prefix when locale is en", () => {
    renderWithProviders(<ErrorDisplay error="test" />, { locale: "en" });
    expect(screen.getByText(/Error:/)).toBeInTheDocument();
  });
});
