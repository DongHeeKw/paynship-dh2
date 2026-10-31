'use client';

/**
 * PayNShip v2.1 — Shipping Country Selector
 *
 * AcrossB 52개국 지원국(Shopify Markets International 대상)을 고객이 선택.
 * Cart / Checkout Review에서 사용.
 *
 * 데이터 소스: scripts/shopify-markets/countries.ts
 */

import React, { useMemo, useState } from 'react';
import { COUNTRIES, type CountryEntry } from '@/lib/shipping/countries';

export interface ShippingCountrySelectProps {
  value?: string; // ISO 3166-1 alpha-2
  onChange: (iso: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ShippingCountrySelect({
  value,
  onChange,
  label = '배송 국가',
  placeholder = '국가를 선택하세요',
  className,
  disabled = false,
}: ShippingCountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const sorted = [...COUNTRIES].sort((a, b) => a.priority - b.priority || a.en.localeCompare(b.en));
    const q = query.trim().toLowerCase();
    const filtered = q
      ? sorted.filter(
          c =>
            c.en.toLowerCase().includes(q) ||
            c.ko.toLowerCase().includes(q) ||
            c.iso.toLowerCase() === q,
        )
      : sorted;

    // Region별 그룹
    const groups: Record<string, CountryEntry[]> = { APAC: [], EUROPE: [], AMERICAS: [], MEA: [] };
    for (const c of filtered) groups[c.region].push(c);
    return groups;
  }, [query]);

  const selected = COUNTRIES.find(c => c.iso === value);

  return (
    <div className={`relative ${className ?? ''}`}>
      {label && <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm hover:border-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <FlagEmoji iso={selected.iso} />
            <span>{selected.en}</span>
            <span className="text-xs text-gray-400">({selected.iso})</span>
          </span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <svg className="h-4 w-4 opacity-50" viewBox="0 0 12 8" fill="none" aria-hidden>
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 right-0 z-50 mt-1 max-h-96 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-100 bg-gray-50 p-2">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="국가 검색 (한/영/ISO)"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>

            <div className="max-h-72 overflow-y-auto py-1">
              {Object.entries(grouped).map(([region, list]) =>
                list.length > 0 ? (
                  <div key={region}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      {region}
                    </div>
                    {list.map(country => {
                      const isSel = country.iso === value;
                      return (
                        <button
                          key={country.iso}
                          type="button"
                          onClick={() => {
                            onChange(country.iso);
                            setOpen(false);
                            setQuery('');
                          }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${isSel ? 'bg-gray-50' : ''}`}
                          role="option"
                          aria-selected={isSel}
                        >
                          <FlagEmoji iso={country.iso} />
                          <span className="flex-1">{country.en}</span>
                          <span className="text-xs text-gray-400">({country.ko})</span>
                          <span className="font-mono text-xs text-gray-400">{country.iso}</span>
                          {isSel && <CheckIcon />}
                        </button>
                      );
                    })}
                  </div>
                ) : null,
              )}

              {Object.values(grouped).every(list => list.length === 0) && (
                <div className="px-3 py-6 text-center text-sm text-gray-400">
                  일치하는 국가가 없어요
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ISO 2자리 → flag emoji (U+1F1E6 기준 regional indicator)
function FlagEmoji({ iso }: { iso: string }) {
  if (iso.length !== 2) return null;
  const codePoints = iso
    .toUpperCase()
    .split('')
    .map(c => 127397 + c.charCodeAt(0));
  return <span className="text-base leading-none">{String.fromCodePoint(...codePoints)}</span>;
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-gray-900" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M16.704 5.296a1 1 0 010 1.408l-8 8a1 1 0 01-1.408 0l-4-4a1 1 0 111.408-1.408L8 12.592l7.296-7.296a1 1 0 011.408 0z" clipRule="evenodd" />
    </svg>
  );
}
