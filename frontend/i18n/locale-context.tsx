"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Locale, TranslationDictionary } from "./types";
import { zh } from "./dictionaries/zh";
import { en } from "./dictionaries/en";
import { detectLocale, persistLocale } from "./detect-locale";

const dictionaries: Record<Locale, TranslationDictionary> = { zh, en };

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (
    key: keyof TranslationDictionary,
    vars?: Record<string, string | number>,
  ) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  children: ReactNode;
  /** Override for testing; skips detectLocale when provided. */
  initialLocale?: Locale;
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale ?? detectLocale,
  );

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    persistLocale(newLocale);
  }, []);

  const t = useCallback(
    (
      key: keyof TranslationDictionary,
      vars?: Record<string, string | number>,
    ): string => {
      const dict = dictionaries[locale];
      let text = dict[key];
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replaceAll(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}
