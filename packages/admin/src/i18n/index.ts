import * as React from "react";
import en from "./en";
import zh from "./zh";

// ============================================================================
// Types
// ============================================================================

export type Locale = "en" | "zh";

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ============================================================================
// Translation map
// ============================================================================

const translations: Record<Locale, Record<string, unknown>> = {
  en: en as unknown as Record<string, unknown>,
  zh: zh as unknown as Record<string, unknown>,
};

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "中文",
};

// ============================================================================
// Storage
// ============================================================================

const STORAGE_KEY = "emdash-locale";

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "zh") return stored;
  // Detect browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith("zh")) return "zh";
  return "en";
}

function storeLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, locale);
}

// ============================================================================
// Translation lookup
// ============================================================================

/**
 * Resolve a dot-separated key into a nested object.
 * e.g. "sidebar.dashboard" → obj.sidebar.dashboard
 */
function resolveKey(obj: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

/**
 * Interpolate params into a template string.
 * Supports {name} placeholders.
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value != null ? String(value) : match;
  });
}

// ============================================================================
// Context
// ============================================================================

const I18nContext = React.createContext<I18nContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export interface I18nProviderProps {
  children: React.ReactNode;
  defaultLocale?: Locale;
}

export function I18nProvider({ children, defaultLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = React.useState<Locale>(() => defaultLocale ?? getStoredLocale());

  const setLocale = React.useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    storeLocale(newLocale);
  }, []);

  const t = React.useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // Try current locale first, fall back to English
      const currentTranslations = translations[locale];
      const result = resolveKey(currentTranslations, key);
      if (result != null) return interpolate(result, params);

      // Fallback to English
      const enResult = resolveKey(translations.en, key);
      if (enResult != null) return interpolate(enResult, params);

      // Return the key itself as last resort
      return key;
    },
    [locale],
  );

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return React.createElement(I18nContext.Provider, { value }, children);
}

// ============================================================================
// Hook
// ============================================================================

export function useI18n(): I18nContextValue {
  const context = React.useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

/**
 * Shorthand hook that just returns the `t` function.
 */
export function useT(): I18nContextValue["t"] {
  return useI18n().t;
}

// ============================================================================
// Exports
// ============================================================================

export { en, zh };
