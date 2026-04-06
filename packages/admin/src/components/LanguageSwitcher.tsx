import * as React from "react";
import { Globe } from "@phosphor-icons/react";
import { useI18n, LOCALE_LABELS, type Locale } from "../i18n";

export interface LanguageSwitcherProps {
  /** Optional className for the wrapper */
  className?: string;
}

/**
 * Language switcher dropdown that toggles between English and Chinese.
 * Persists the choice to localStorage via the I18nProvider.
 */
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const handleSelect = (l: Locale) => {
    setLocale(l);
    setIsOpen(false);
  };

  const locales: Locale[] = ["en", "zh"];

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-kumo-subtle hover:text-kumo-default hover:bg-kumo-tint transition-colors"
        aria-label={t("languageSwitcher.language")}
        aria-expanded={isOpen}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-36 rounded-md border bg-kumo-base shadow-lg z-50 py-1"
          role="menu"
        >
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(l)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                locale === l
                  ? "bg-kumo-brand/10 text-kumo-brand font-medium"
                  : "text-kumo-default hover:bg-kumo-tint"
              }`}
            >
              {LOCALE_LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
