import React, { type ReactNode } from "react";
import { render, renderHook, type RenderOptions } from "@testing-library/react";
import { LocaleProvider, type Locale } from "@/i18n";

interface ProviderOptions {
  locale?: Locale;
}

function createWrapper(locale: Locale = "zh") {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
    );
  };
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions & ProviderOptions,
) {
  const { locale, ...renderOptions } = options ?? {};
  return render(ui, { wrapper: createWrapper(locale), ...renderOptions });
}

export function renderHookWithProviders<T>(
  hook: () => T,
  options?: ProviderOptions,
) {
  const { locale } = options ?? {};
  return renderHook(hook, { wrapper: createWrapper(locale) });
}
