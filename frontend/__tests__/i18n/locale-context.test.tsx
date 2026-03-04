/**
 * Tests for LocaleProvider and useLocale hook.
 */
import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider, useLocale } from "@/i18n";

function TestConsumer() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translated">{t("siteTitle")}</span>
      <span data-testid="interpolated">
        {t("truncationNotice", { totalDiscovered: 250, total: 100 })}
      </span>
      <button onClick={() => setLocale(locale === "zh" ? "en" : "zh")}>
        Toggle
      </button>
    </div>
  );
}

describe("LocaleProvider + useLocale", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides default locale zh via initialLocale", () => {
    render(
      <LocaleProvider initialLocale="zh">
        <TestConsumer />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("locale")).toHaveTextContent("zh");
  });

  it("translates keys in zh", () => {
    render(
      <LocaleProvider initialLocale="zh">
        <TestConsumer />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("translated")).toHaveTextContent(
      /deepcrawl2md - \u6df1\u5ea6\u722c\u53d6\u8f6c Markdown/,
    );
  });

  it("translates keys in en", () => {
    render(
      <LocaleProvider initialLocale="en">
        <TestConsumer />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("translated")).toHaveTextContent(
      "deepcrawl2md - Deep Crawl to Markdown",
    );
  });

  it("interpolates variables", () => {
    render(
      <LocaleProvider initialLocale="zh">
        <TestConsumer />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("interpolated")).toHaveTextContent(
      /250/,
    );
    expect(screen.getByTestId("interpolated")).toHaveTextContent(
      /100/,
    );
  });

  it("switches locale on setLocale", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider initialLocale="zh">
        <TestConsumer />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("zh");

    await user.click(screen.getByRole("button", { name: "Toggle" }));

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(screen.getByTestId("translated")).toHaveTextContent(
      "deepcrawl2md - Deep Crawl to Markdown",
    );
  });

  it("persists locale to localStorage on switch", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider initialLocale="zh">
        <TestConsumer />
      </LocaleProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Toggle" }));
    expect(localStorage.getItem("preferred-locale")).toBe("en");
  });

  it("throws when useLocale is called without provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useLocale must be used within a LocaleProvider",
    );
    spy.mockRestore();
  });
});
