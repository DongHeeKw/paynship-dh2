'use client';

/**
 * PayNShip v2.1 — Currency System Dev Test Page
 *
 * 로컬 개발용 <Price /> + <CurrencySwitcher /> + useCurrency 검증 페이지.
 * 프로덕션에서는 접근 제한 권장 (NODE_ENV 체크).
 */

import React, { useState } from 'react';
import { Price } from '@/components/currency/Price';
import { CurrencySwitcher } from '@/components/currency/CurrencySwitcher';
import { ShippingCountrySelect } from '@/components/shipping/ShippingCountrySelect';
import { useCurrency } from '@/contexts/CurrencyContext';

const SAMPLE_USD_AMOUNTS = [
  { label: 'K-pop 앨범',       usd: 25 },
  { label: '한정판 스니커즈',  usd: 199 },
  { label: '화장품 세트',      usd: 58.5 },
  { label: '프리미엄 와인',    usd: 340 },
  { label: '명품 가방',        usd: 2499 },
];

export default function CurrencyTestPage() {
  const { selected, rates, ratesFetchedAt, isLoading, error, supported } = useCurrency();
  const [shippingCountry, setShippingCountry] = useState<string>('');

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">💱 Currency System Test</h1>
        <CurrencySwitcher />
      </div>

      {/* 상태 요약 */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Context State</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500">Selected currency</dt>
          <dd className="font-mono">{selected}</dd>
          <dt className="text-gray-500">Rates count</dt>
          <dd className="font-mono">{Object.keys(rates).length}</dd>
          <dt className="text-gray-500">Rates fetched at</dt>
          <dd className="font-mono">{ratesFetchedAt ?? '(none)'}</dd>
          <dt className="text-gray-500">Loading</dt>
          <dd className="font-mono">{isLoading ? 'yes' : 'no'}</dd>
          <dt className="text-gray-500">Error</dt>
          <dd className="font-mono">{error ?? '(none)'}</dd>
          <dt className="text-gray-500">Supported</dt>
          <dd className="font-mono">{supported.length} currencies</dd>
        </dl>
      </div>

      {/* Price 컴포넌트 샘플 */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">&lt;Price /&gt; 컴포넌트 샘플</h2>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Item</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">USD</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Default (local primary)</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">USD only</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">USD primary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {SAMPLE_USD_AMOUNTS.map(s => (
                <tr key={s.label}>
                  <td className="px-4 py-3">{s.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">${s.usd.toFixed(2)}</td>
                  <td className="px-4 py-3"><Price usd={s.usd} /></td>
                  <td className="px-4 py-3"><Price usd={s.usd} usdOnly /></td>
                  <td className="px-4 py-3"><Price usd={s.usd} primary="usd" hideSecondaryWhenSame={false} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Size 변형 */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">Size 변형</h2>
        <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-6">
          <div><Price usd={199} size="sm" /></div>
          <div><Price usd={199} size="md" /></div>
          <div><Price usd={199} size="lg" /></div>
          <div><Price usd={199} size="xl" /></div>
        </div>
      </section>

      {/* Shipping Country Select */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">&lt;ShippingCountrySelect /&gt; (52개국)</h2>
        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6">
          <ShippingCountrySelect
            value={shippingCountry}
            onChange={setShippingCountry}
          />
          {shippingCountry && (
            <p className="mt-3 text-sm text-gray-600">
              선택: <span className="font-mono font-semibold">{shippingCountry}</span>
            </p>
          )}
        </div>
      </section>

      {/* 환율 테이블 */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Current USD Rates ({Object.keys(rates).length})</h2>
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          {Object.entries(rates).sort(([a], [b]) => a.localeCompare(b)).map(([code, rate]) => (
            <div key={code} className="rounded border border-gray-100 bg-white px-3 py-2">
              <span className="font-mono font-semibold">{code}</span>
              <span className="ml-2 text-gray-500">{rate.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
