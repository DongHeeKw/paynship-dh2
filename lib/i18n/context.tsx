'use client';

/**
 * Language Context Provider
 *
 * Provides i18n functionality across the app.
 * Stores language preference in localStorage.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type Language,
  type Translations,
  getTranslation,
  detectBrowserLanguage,
  LANGUAGE_NAMES,
  LANGUAGE_FLAGS,
} from './translations';
import {
  type Currency,
  formatPriceForLanguage,
  getCurrencySymbol,
  getCurrencyCode,
} from './currency';

interface FormatPriceOptions {
  showCode?: boolean;  // Show currency code (e.g., "USD")
  compact?: boolean;   // Use compact notation for large numbers
  showOriginal?: boolean;  // Also show original KRW price
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  languageNames: typeof LANGUAGE_NAMES;
  languageFlags: typeof LANGUAGE_FLAGS;
  /** Format KRW price in user's locale currency */
  formatPrice: (krwAmount: number, options?: FormatPriceOptions) => string;
  /** Get current currency code */
  currency: Currency;
  /** Get current currency symbol */
  currencySymbol: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'paynship-language';

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

export function LanguageProvider({
  children,
  defaultLanguage,
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage ?? 'en');

  // Initialize language from localStorage or browser detection
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;

    if (stored && ['en', 'ko', 'zh'].includes(stored)) {
      setLanguageState(stored);
    } else if (defaultLanguage) {
      setLanguageState(defaultLanguage);
    } else {
      const detected = detectBrowserLanguage();
      setLanguageState(detected);
    }
  }, [defaultLanguage]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Save to localStorage when language changes
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);

    // Update html lang attribute for accessibility
    document.documentElement.lang = lang;
  }, []);

  // Get translations for current language
  const t = getTranslation(language);

  // Currency utilities
  const currency = getCurrencyCode(language);
  const currencySymbol = getCurrencySymbol(language);

  // Format KRW price in user's locale currency
  const formatPrice = useCallback(
    (krwAmount: number, options?: FormatPriceOptions) => {
      return formatPriceForLanguage(krwAmount, language, options);
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languageNames: LANGUAGE_NAMES,
        languageFlags: LANGUAGE_FLAGS,
        formatPrice,
        currency,
        currencySymbol,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language context
 */
export function useLanguage() {
  const context = useContext(LanguageContext);

  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}

/**
 * Hook to get just the translations (shorthand)
 */
export function useTranslations() {
  const { t } = useLanguage();
  return t;
}
