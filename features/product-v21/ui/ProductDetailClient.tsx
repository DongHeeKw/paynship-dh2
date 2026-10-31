'use client';

/**
 * PayNShip v2.1 — PDP Client Component
 *
 * Shopify Product 데이터를 받아 상세 페이지 렌더. Landed Cost 예상값 포함.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Price } from '@/components/currency/Price';
import type { V2Product, V2ProductVariant } from '@/lib/shopify/queries-v2/product';

export interface ProductDetailClientProps {
  product: V2Product;
}

/**
 * Landed Cost 계산 (예상값).
 * - Fee: 10%
 * - Shipping: 임시 $8 (AcrossB 연동 전)
 * - DDP: 임시 상품가의 5% (국가별 상이, 정확값은 AcrossB 연동 후)
 */
function computeLandedCost(priceUsd: number) {
  const fee = priceUsd * 0.1;
  const shipping = 8;
  const ddp = priceUsd * 0.05;
  return {
    product: priceUsd,
    fee,
    shipping,
    ddp,
    total: priceUsd + fee + shipping + ddp,
  };
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants[0]?.id ?? '',
  );

  const selectedVariant = useMemo<V2ProductVariant | undefined>(
    () => product.variants.find(v => v.id === selectedVariantId) ?? product.variants[0],
    [product.variants, selectedVariantId],
  );

  const priceUsd = Number(selectedVariant?.price ?? '0');
  const landed = computeLandedCost(priceUsd);

  const originCountry = product.metafields.find(m => m.key === 'origin_country')?.value ?? 'KR';
  const sourceUrl = product.metafields.find(m => m.key === 'source_url')?.value;
  const scrapeLevel = product.metafields.find(m => m.key === 'scrape_level')?.value;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:underline">홈</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">{product.title}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <section>
          {product.images[0] ? (
            <div className="overflow-hidden rounded-2xl bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.images[0].url}
                alt={product.images[0].altText ?? product.title}
                className="h-auto w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              이미지 없음
            </div>
          )}
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.slice(0, 5).map(img => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.altText ?? ''}
                  className="aspect-square rounded-md object-cover"
                />
              ))}
            </div>
          )}
        </section>

        {/* Info */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <FlagEmoji iso={originCountry} />
            <span>{product.vendor}</span>
            {scrapeLevel && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{scrapeLevel}</span>
            )}
          </div>

          <h1 className="mb-4 text-2xl font-bold text-gray-900 md:text-3xl">{product.title}</h1>

          <div className="mb-6">
            <Price usd={landed.total} size="xl" />
            <div className="mt-1 text-xs text-gray-400">
              모든 비용 포함 (수수료·배송·관세)
            </div>
          </div>

          {/* Variant Selector */}
          {product.variants.length > 1 && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">옵션</label>
              <select
                value={selectedVariantId}
                onChange={e => setSelectedVariantId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {product.variants.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.title} · ${Number(v.price).toFixed(2)}
                    {!v.availableForSale ? ' (품절)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Landed Cost Breakdown */}
          <details className="mb-6 rounded-lg border border-gray-200 p-4 open:bg-gray-50">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              가격 상세 보기
            </summary>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">상품가</dt>
                <dd><Price usd={landed.product} size="sm" usdOnly /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">수수료 (10%)</dt>
                <dd><Price usd={landed.fee} size="sm" usdOnly /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">예상 국제 배송비</dt>
                <dd><Price usd={landed.shipping} size="sm" usdOnly /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">예상 관세·세금 (DDP)</dt>
                <dd><Price usd={landed.ddp} size="sm" usdOnly /></dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold">
                <dt>합계</dt>
                <dd><Price usd={landed.total} size="sm" usdOnly /></dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-gray-400">
              * 실제 배송비·관세는 결제 시점에 배송지 기준으로 재계산됩니다.
            </p>
          </details>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={!selectedVariant?.availableForSale}
              className="rounded-lg bg-[var(--pn-brand)] py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              onClick={() => {
                // MVP: 실제 cart 연동은 W3에서
                alert('장바구니 담기 (W3에서 구현)');
              }}
            >
              {selectedVariant?.availableForSale ? '장바구니에 담기' : '품절'}
            </button>
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-xs text-gray-400 underline"
              >
                원 판매처 확인
              </a>
            )}
            <Link href="/" className="text-center text-sm text-gray-600 hover:underline">
              ← 채팅으로 돌아가기
            </Link>
          </div>

          {product.descriptionHtml && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="mb-3 text-lg font-semibold">상세 설명</h2>
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FlagEmoji({ iso }: { iso: string }) {
  if (iso?.length !== 2) return null;
  const codePoints = iso.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
  return <span className="text-base">{String.fromCodePoint(...codePoints)}</span>;
}
