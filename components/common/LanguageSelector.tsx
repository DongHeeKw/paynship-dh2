'use client';

/**
 * LanguageSelector Component
 *
 * Dropdown to select language (English, Korean, Chinese)
 * Compact design for header placement
 */

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import type { Language } from '@/lib/i18n/translations';

interface LanguageSelectorProps {
  /** Compact mode shows only flag */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

export default function LanguageSelector({
  compact = false,
  className = '',
}: LanguageSelectorProps) {
  const { language, setLanguage, languageNames, languageFlags } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages: Language[] = ['en', 'ko', 'zh'];

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-center rounded-2xl transition-all
          ${compact
            ? 'h-10 w-10 border border-[var(--chat-border)] bg-[var(--chat-panel)] text-[var(--chat-ink)] shadow-[0_12px_24px_rgba(38,33,28,0.08)] hover:bg-[var(--chat-panel-strong)] hover:border-[var(--chat-border-strong)] hover:scale-[1.02] active:scale-95'
            : 'gap-1.5 border border-[var(--chat-border)] bg-[var(--chat-panel)] px-3 py-2 text-[var(--chat-ink)] shadow-[0_12px_24px_rgba(38,33,28,0.08)] hover:bg-[var(--chat-panel-strong)] hover:border-[var(--chat-border-strong)]'
          }
        `}
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={compact ? 'text-lg' : 'text-base'}>{languageFlags[language]}</span>
        {!compact && (
          <>
            <span className="text-sm font-medium text-[var(--chat-ink)]">
              {languageNames[language]}
            </span>
            <svg
              className={`h-3.5 w-3.5 text-[var(--chat-ink-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-2 w-40 rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-panel-strong)] py-1.5 shadow-[0_22px_44px_rgba(27,22,18,0.14)] backdrop-blur-xl animate-fade-in"
          role="listbox"
        >
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                setLanguage(lang);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors
                ${language === lang
                  ? 'bg-[var(--chat-accent-soft)] text-[var(--chat-accent-strong)]'
                  : 'text-[var(--chat-ink-soft)] hover:bg-[var(--chat-surface-soft)] hover:text-[var(--chat-ink)]'
                }
              `}
              role="option"
              aria-selected={language === lang}
            >
              <span className="text-base">{languageFlags[lang]}</span>
              <span className="text-sm font-medium">{languageNames[lang]}</span>
              {language === lang && (
                <svg
                  className="ml-auto h-4 w-4 text-[var(--chat-accent)]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
