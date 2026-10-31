'use client';

/**
 * PayNShip v2.1 — <Price /> 컴포넌트
 *
 * USD 금액을 받아 현재 고객 통화 + USD 보조 표시.
 *
 * @example
 * <Price usd={25.00} />
 * // "₩33,756 (≈ $25.00 USD)"
 *
 * <Price usd={25.00} usdOnly />
 * // "$25.00 USD"
 *
 * <Price usd={25.00} primary="usd" />
 * // "$25.00 USD (≈ ₩33,756)"
 *
 * <Price usd={25.00} size="lg" />
 * // 큰 글씨
 */

import React from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getCurrencyConfig } from '@/lib/exchange-rate/constants';

export interface PriceProps {
  /** USD 금액 (소수점 포함) */
  usd: number;
  /**
   * USD만 표시 (보조 안 씀).
   * 체크아웃 최종 단계나 결제 금액 표시 시 사용.
   */
  usdOnly?: boolean;
  /**
   * Primary 표시 통화.
   * - "local" (기본): 현지 통화가 크게, USD 보조
   * - "usd": USD가 크게, 현지 통화 보조
   */
  primary?: 'local' | 'usd';
  /** 크기 변형 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 추가 className */
  className?: string;
  /** 사용자 통화 = USD일 때 보조 표시 생략 (기본 true) */
  hideSecondaryWhenSame?: boolean;
}

function formatAmount(amount: number, currencyCode: string): string {
  const config = getCurrencyConfig(currencyCode);
  const decimals = config?.decimals ?? 2;
  const symbol = config?.symbol ?? currencyCode;

  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // USD 이하 prefix 형태가 일반적, 아랍어 기반 통화는 suffix지만 MVP는 prefix 통일
  // (정교한 locale은 Phase 2)
  return `${symbol}${formatted}`;
}

const SIZE_CLASSES: Record<NonNullable<PriceProps['size']>, { primary: string; secondary: string }> = {
  sm: { primary: 'text-sm font-medium', secondary: 'text-xs text-gray-500' },
  md: { primary: 'text-base font-semibold', secondary: 'text-sm text-gray-500' },
  lg: { primary: 'text-lg font-bold', secondary: 'text-sm text-gray-500' },
  xl: { primary: 'text-2xl font-bold', secondary: 'text-base text-gray-500' },
};

export function Price({
  usd,
  usdOnly = false,
  primary = 'local',
  size = 'md',
  className,
  hideSecondaryWhenSame = true,
}: PriceProps) {
  const { selected, convert } = useCurrency();
  const sizeCls = SIZE_CLASSES[size];

  // USD Only 모드
  if (usdOnly) {
    return (
      <span className={`${sizeCls.primary} ${className ?? ''}`}>
        {formatAmount(usd, 'USD')} <span className="text-xs font-normal">USD</span>
      </span>
    );
  }

  // Selected가 USD인 경우
  if (selected === 'USD') {
    return (
      <span className={`${sizeCls.primary} ${className ?? ''}`}>
        {formatAmount(usd, 'USD')}
      </span>
    );
  }

  const { amount: localAmount, fallback } = convert(usd);

  if (fallback) {
    // 환율 못 찾으면 USD 폴백
    return (
      <span className={`${sizeCls.primary} ${className ?? ''}`}>
        {formatAmount(usd, 'USD')}
      </span>
    );
  }

  const localStr = formatAmount(localAmount, selected);
  const usdStr = formatAmount(usd, 'USD');

  if (primary === 'usd') {
    return (
      <span className={className}>
        <span className={sizeCls.primary}>{usdStr}</span>
        {!hideSecondaryWhenSame && (
          <span className={sizeCls.secondary}> (≈ {localStr})</span>
        )}
      </span>
    );
  }

  // primary = 'local'
  return (
    <span className={className}>
      <span className={sizeCls.primary}>{localStr}</span>
      <span className={sizeCls.secondary}> (≈ {usdStr} USD)</span>
    </span>
  );
}
