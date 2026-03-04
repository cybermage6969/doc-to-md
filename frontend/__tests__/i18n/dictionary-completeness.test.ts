/**
 * Tests that zh and en dictionaries have identical keys and no empty values.
 */
import { zh } from "@/i18n/dictionaries/zh";
import { en } from "@/i18n/dictionaries/en";

describe("Translation dictionary completeness", () => {
  const zhKeys = Object.keys(zh).sort();
  const enKeys = Object.keys(en).sort();

  it("zh and en have the same keys", () => {
    expect(zhKeys).toEqual(enKeys);
  });

  it("zh has no empty string values", () => {
    for (const [key, value] of Object.entries(zh)) {
      expect(value.trim()).not.toBe("");
    }
  });

  it("en has no empty string values", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim()).not.toBe("");
    }
  });

  it("interpolation placeholders are consistent between zh and en", () => {
    const placeholderRe = /\{(\w+)\}/g;
    for (const key of zhKeys) {
      const zhMatches = [...zh[key as keyof typeof zh].matchAll(placeholderRe)]
        .map((m) => m[1])
        .sort();
      const enMatches = [...en[key as keyof typeof en].matchAll(placeholderRe)]
        .map((m) => m[1])
        .sort();
      expect(zhMatches).toEqual(enMatches);
    }
  });
});
