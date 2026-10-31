'use client';

/**
 * PayNShip v2.1 — Currency Switcher (헤더 dropdown)
 *
 * 사용자가 표시 통화를 변경. 선택은 쿠키 1년 저장.
 */

import React, { useState } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';

export function CurrencySwitcher({ className }: { className?: string }) {
  const { selected, supported, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);

  const selectedConfig = supported.find(c => c.code === selected);

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-base leading-none">{selectedConfig?.symbol ?? '$'}</span>
        <span>{selected}</span>
        <svg className="h-3 w-3 opacity-60" viewBox="0 0 12 8" fill="none" aria-hidden>
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* menu */}
          <ul
            className="absolute right-0 z-50 mt-1 max-h-80 w-64 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
            role="listbox"
          >
            {supported.map(cur => {
              const isSelected = cur.code === selected;
              return (
                <li key={cur.code}>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrency(cur.code);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      isSelected ? 'bg-gray-50 font-medium' : ''
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="w-6 text-center text-base leading-none">{cur.symbol}</span>
                    <span className="flex-1">{cur.displayName}</span>
                    <span className="text-xs text-gray-500">{cur.code}</span>
                    {isSelected && (
                      <svg className="h-4 w-4 text-gray-900" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path fillRule="evenodd" d="M16.704 5.296a1 1 0 010 1.408l-8 8a1 1 0 01-1.408 0l-4-4a1 1 0 111.408-1.408L8 12.592l7.296-7.296a1 1 0 011.408 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
