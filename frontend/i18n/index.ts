export type { Locale, TranslationDictionary } from "./types";
export { zh } from "./dictionaries/zh";
export { en } from "./dictionaries/en";
export { detectLocale, persistLocale } from "./detect-locale";
export { LocaleProvider, useLocale } from "./locale-context";
export type { LocaleContextValue } from "./locale-context";
