/**
 * Browser locale detection and localStorage persistence.
 */

import type { Locale } from "./types";

const STORAGE_KEY = "preferred-locale";

/**
 * Detect the user's preferred locale.
 * Priority: localStorage > navigator.language > default "zh".
 */
export function detectLocale(): Locale {
  if (typeof window === "undefined") return "zh";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "zh" || stored === "en") return stored;

  const lang = navigator.language;
  return lang.startsWith("zh") ? "zh" : "en";
}

/**
 * Persist the user's locale choice to localStorage.
 */
export function persistLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, locale);
}
