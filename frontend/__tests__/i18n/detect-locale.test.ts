/**
 * Tests for locale detection and persistence.
 */
import { detectLocale, persistLocale } from "@/i18n/detect-locale";

describe("detectLocale", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns stored locale from localStorage when available", () => {
    localStorage.setItem("preferred-locale", "en");
    expect(detectLocale()).toBe("en");
  });

  it("returns zh when localStorage has zh", () => {
    localStorage.setItem("preferred-locale", "zh");
    expect(detectLocale()).toBe("zh");
  });

  it("ignores invalid localStorage values and falls back to navigator", () => {
    localStorage.setItem("preferred-locale", "fr");
    // jsdom navigator.language defaults to "en" (non-zh)
    expect(detectLocale()).toBe("en");
  });

  it("returns zh when navigator.language starts with zh", () => {
    const spy = jest.spyOn(navigator, "language", "get").mockReturnValue("zh-TW");
    expect(detectLocale()).toBe("zh");
    spy.mockRestore();
  });

  it("returns en when navigator.language is non-zh", () => {
    const spy = jest.spyOn(navigator, "language", "get").mockReturnValue("ja");
    expect(detectLocale()).toBe("en");
    spy.mockRestore();
  });
});

describe("persistLocale", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves locale to localStorage", () => {
    persistLocale("en");
    expect(localStorage.getItem("preferred-locale")).toBe("en");
  });

  it("overwrites previous locale", () => {
    persistLocale("zh");
    persistLocale("en");
    expect(localStorage.getItem("preferred-locale")).toBe("en");
  });
});
