'use client';

import { useState, useEffect } from 'react';
import type { ProductOption, ProductOptionValue, ProductDataSources } from '@/types';
import { useLanguage } from '@/lib/i18n';
import SourceBadge, { SourceBadgeCompact } from '@/components/common/SourceBadge';

interface ProductForCart {
  id: string;
  name: string;
  imageUrl: string;
  priceKrw: number;
  category: string;
  weightKg?: number;  // Use weightKg consistently
  dimensions?: { l: number; w: number; h: number };
  hsCode?: string;
  origin?: string;
  material?: string;
  dataSources?: ProductDataSources;
  overallConfidence?: number;
  sourceUrl?: string;
}

/**
 * Option A: 캐시 상태 정보
 */
interface CacheInfo {
  isCached: boolean;
  lastScrapedAt: string | null;
  ageMinutes: number;
  wasUpdated: boolean;
}

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    imageUrl: string;
    priceKrw: number;
    salePriceKrw?: number | null;
    category: string;
    weightKg?: number;  // Use weightKg consistently
    dimensions?: { l: number; w: number; h: number };
    options?: ProductOption[];
    sourceUrl?: string;
    hsCode?: string;
    origin?: string;
    material?: string;
    // Phase 4: Data Source Tracking
    dataSources?: ProductDataSources;
    overallConfidence?: number;
    // Option A: Cache status
    cacheInfo?: CacheInfo;
    _isPreview?: boolean;   // Progressive Pipeline: Phase 1 preview state
    _scrapeStatus?: 'pending' | 'processing' | 'ready' | 'failed' | 'cancelled';
    _scrapeMessage?: string;
    _taskState?: import('@/types').ProductTaskState;
    _quoteReady?: boolean;
    _taskMissingFields?: string[];
  };
  onCalculate?: () => void;
  onAddToCart?: (product: ProductForCart, quantity: number, selectedOptions?: Record<string, string>) => void;
  onRefresh?: () => void;  // Option A: Refresh callback
  showAddToCart?: boolean;
  disabled?: boolean;
  disabledMode?: 'disable' | 'warn';
  isAddingToCart?: boolean;
  isRefreshing?: boolean;  // Option A: Refresh loading state
  showDataSources?: boolean;  // Phase 4: Show data source badges
  showCacheStatus?: boolean;  // Option A: Show cache status (admin only)
}

export default function ProductCard({
  product,
  onCalculate,
  onAddToCart,
  onRefresh,
  showAddToCart = true,
  disabled = false,
  disabledMode = 'disable',
  isAddingToCart = false,
  isRefreshing = false,
  showDataSources = true,
  showCacheStatus = false,
}: ProductCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, ProductOptionValue>>({});
  const [finalPrice, setFinalPrice] = useState(product.salePriceKrw || product.priceKrw);
  const [quantity, setQuantity] = useState(1);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<'calculate' | 'addToCart' | null>(null);
  const { t, formatPrice, language } = useLanguage();

  const isPreview = product._isPreview;
  const scrapeStatus = product._scrapeStatus;
  const scrapeMessage = product._scrapeMessage;
  const quoteReady = product._quoteReady;
  const taskState = product._taskState;
  const hasDiscount = product.salePriceKrw && product.salePriceKrw < product.priceKrw;
  const weightKg = product.weightKg;
  const hasOptions = product.options && product.options.length > 0;
  const isClickDisabled = disabled && disabledMode === 'disable';
  const isQuoteBlocked = quoteReady === false;
  // Add-to-cart is allowed even during preview (wishlist-style: add now, enrich later)
  const isAddToCartDisabled = isClickDisabled || isAddingToCart;
  // Calculate (shipping estimate) requires complete product data
  const isButtonDisabled = isClickDisabled || isAddingToCart || isPreview || isQuoteBlocked;

  // Calculate final price based on selected options
  useEffect(() => {
    let basePrice = product.salePriceKrw || product.priceKrw;
    let adjustment = 0;

    Object.values(selectedOptions).forEach(option => {
      if (option.priceAdjustment) {
        adjustment += option.priceAdjustment;
      }
    });

    setFinalPrice(basePrice + adjustment);
  }, [selectedOptions, product.priceKrw, product.salePriceKrw]);

  const handleOptionChange = (optionName: string, value: ProductOptionValue) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value,
    }));
  };

  // Check if all required options are selected
  const canCalculate = !hasOptions || product.options?.every(option =>
    !option.required || selectedOptions[option.name]
  );

  const handleAddToCart = () => {
    if (isClickDisabled) return;

    if (disabled && disabledMode === 'warn') {
      setPendingAction('addToCart');
      setShowWarning(true);
      return;
    }

    executeAddToCart();
  };

  const handleCalculate = () => {
    if (isClickDisabled) return;

    if (disabled && disabledMode === 'warn') {
      setPendingAction('calculate');
      setShowWarning(true);
      return;
    }

    onCalculate?.();
  };

  const executeAddToCart = () => {
    const optionValues: Record<string, string> = {};
    Object.entries(selectedOptions).forEach(([key, val]) => {
      optionValues[key] = val.value;
    });
    onAddToCart?.(
      {
        ...product,
        priceKrw: finalPrice,
        weightKg,
      },
      quantity,
      Object.keys(optionValues).length > 0 ? optionValues : undefined
    );
  };

  const handleConfirm = () => {
    if (pendingAction === 'calculate') {
      onCalculate?.();
    } else if (pendingAction === 'addToCart') {
      executeAddToCart();
    }
    setShowWarning(false);
    setPendingAction(null);
  };

  const handleCancel = () => {
    setShowWarning(false);
    setPendingAction(null);
  };

  return (
    <div className={`w-full max-w-full overflow-hidden rounded-[24px] border border-[var(--chat-border)] bg-[var(--chat-surface)] shadow-[0_18px_32px_rgba(35,29,24,0.08)] sm:max-w-[320px] md:max-w-[360px] ${isClickDisabled ? 'opacity-50' : ''}`}>
      {/* Product Image */}
      <div className="relative h-32 overflow-hidden bg-[var(--chat-surface-soft)] md:h-40">
{/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl || '/images/product-placeholder.svg'}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = '/images/product-placeholder.svg';
          }}
        />

        {/* Category Badge */}
        <div className="absolute bottom-2 right-2 rounded-full bg-[rgba(33,54,51,0.82)] px-2.5 py-1 text-xs text-white backdrop-blur-md">
          {product.category}
        </div>
      </div>

      {/* Product Details */}
      <div className="p-4">
        <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-tight text-[var(--chat-ink)]">
          {product.name}
        </h3>

        {/* Option A: Cache Status Indicator (Admin Only) */}
        {showCacheStatus && product.cacheInfo && product.cacheInfo.isCached && !product.cacheInfo.wasUpdated && (
          <div className="mb-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <i className="fas fa-clock text-amber-500"></i>
              <span>
                {product.cacheInfo.ageMinutes >= 60 ? (
                  <>
                    {Math.floor(product.cacheInfo.ageMinutes / 60)}시간{' '}
                    {product.cacheInfo.ageMinutes % 60 > 0 && `${product.cacheInfo.ageMinutes % 60}분`} 전 데이터
                  </>
                ) : (
                  <>{product.cacheInfo.ageMinutes}분 전 데이터</>
                )}
              </span>
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className={`fas fa-sync-alt ${isRefreshing ? 'fa-spin' : ''}`}></i>
                <span>{isRefreshing ? '새로고침 중...' : '새로고침'}</span>
              </button>
            )}
          </div>
        )}

        {/* Cache was refreshed indicator (Admin Only) */}
        {showCacheStatus && product.cacheInfo && product.cacheInfo.wasUpdated && (
          <div className="mb-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <i className="fas fa-check-circle text-green-500"></i>
            <span className="text-sm text-green-700">최신 데이터로 업데이트됨</span>
          </div>
        )}

        {/* Options Selection */}
        {!isPreview && hasOptions && (
          <div className="mb-4 space-y-3">
            {product.options?.map((option) => (
              <div key={option.name}>
                <label className="mb-1 block text-sm font-medium text-[var(--chat-ink-soft)]">
                  {option.name}
                  {option.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                  className="w-full rounded-xl border border-[var(--chat-border)] bg-[var(--chat-surface)] px-3 py-2 text-sm text-[var(--chat-ink)] focus:border-[var(--chat-border-strong)] focus:ring-2 focus:ring-[var(--chat-accent-soft)]"
                  onChange={(e) => {
                    const selectedValue = option.values.find(v => v.value === e.target.value);
                    if (selectedValue) {
                      handleOptionChange(option.name, selectedValue);
                    }
                  }}
                  value={selectedOptions[option.name]?.value || ''}
                >
                  <option value="">{t.product.selectOption} {option.name}</option>
                  {option.values.map((value) => (
                    <option
                      key={value.value}
                      value={value.value}
                      disabled={value.disabled || (value.stock !== undefined && value.stock === 0)}
                    >
                      {value.label}
                      {value.priceAdjustment && value.priceAdjustment !== 0 && (
                        ` (${value.priceAdjustment > 0 ? '+' : ''}₩${value.priceAdjustment.toLocaleString()})`
                      )}
                      {value.stock !== undefined && value.stock === 0 && ` (${t.product.outOfStock})`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-1.5">
            {isPreview && !weightKg ? (
              <div className="h-4 w-20 animate-pulse rounded bg-[var(--chat-surface-soft)]" />
            ) : (
              <span className="text-sm text-[var(--chat-ink-soft)]">
                {t.product.weight}: {weightKg ? `${weightKg} kg` : 'TBD'}
              </span>
            )}
            {showDataSources && product.dataSources?.weight && (
              <SourceBadge
                source={product.dataSources.weight}
                field="Weight"
                size="sm"
              />
            )}
          </div>
          <div className="flex flex-col items-end">
            {isPreview && !product.priceKrw ? (
              <div className="h-7 w-16 animate-pulse rounded bg-[var(--chat-surface-soft)]" />
            ) : (
              <span className="text-xl font-bold text-[var(--chat-accent)]">
                {formatPrice(finalPrice)}
              </span>
            )}
            {hasDiscount && (
              <span className="text-xs text-[var(--chat-ink-muted)] line-through">
                {formatPrice(product.priceKrw)}
              </span>
            )}
          </div>
        </div>

        {/* Progressive Pipeline: Preview indicator */}
        {isPreview && (
          <div
            className={`mt-2 flex items-center gap-1.5 text-xs ${
              scrapeStatus === 'failed'
                ? 'text-red-500'
                : scrapeStatus === 'cancelled'
                  ? 'text-amber-600'
                  : 'text-[var(--chat-ink-muted)]'
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${
                scrapeStatus === 'failed'
                  ? 'bg-red-500'
                  : scrapeStatus === 'cancelled'
                    ? 'bg-amber-500'
                  : 'animate-pulse bg-[var(--chat-accent)]'
              }`}
            />
            <span className="flex-1">
              {scrapeStatus === 'failed'
                ? (scrapeMessage || (language === 'ko' ? '상세 정보 수집에 실패했어요.' : language === 'zh' ? '获取商品详情失败。' : 'Failed to load product details.'))
                : scrapeStatus === 'cancelled'
                  ? (scrapeMessage || (language === 'ko' ? '상세 정보 수집이 취소되었어요.' : language === 'zh' ? '商品详情获取已取消。' : 'Product detail loading cancelled.'))
                  : (language === 'ko' ? '상세 정보 불러오는 중...' : language === 'zh' ? '正在加载商品详情...' : 'Loading product details...')}
            </span>
            {(scrapeStatus === 'failed' || scrapeStatus === 'cancelled') && onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="ml-1 flex items-center gap-1 rounded-lg border border-current px-2 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
              >
                <i className={`fas fa-redo text-[9px] ${isRefreshing ? 'fa-spin' : ''}`}></i>
                {language === 'ko' ? '다시 시도' : language === 'zh' ? '重试' : 'Retry'}
              </button>
            )}
          </div>
        )}

        {!isPreview && taskState === 'evidence_partial' && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <i className="fas fa-triangle-exclamation mt-0.5"></i>
            <span>
              견적 준비 전 상태입니다.
              {product._taskMissingFields?.length
                ? ` 부족한 항목: ${product._taskMissingFields.join(', ')}`
                : ''}
            </span>
          </div>
        )}

        {/* Phase 4: Overall Confidence Indicator */}
        {showDataSources && product.overallConfidence !== undefined && (
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className="text-[var(--chat-ink-muted)]">Data quality:</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--chat-surface-soft)]">
              <div
                className={`h-full rounded-full transition-all ${
                  product.overallConfidence >= 0.8
                    ? 'bg-green-500'
                    : product.overallConfidence >= 0.5
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${product.overallConfidence * 100}%` }}
              />
            </div>
            <span className={`font-medium ${
              product.overallConfidence >= 0.8
                ? 'text-green-600'
                : product.overallConfidence >= 0.5
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}>
              {Math.round(product.overallConfidence * 100)}%
            </span>
          </div>
        )}

        {/* Quantity Selector (only if showAddToCart) */}
        {showAddToCart && onAddToCart && canCalculate && !isAddToCartDisabled && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[var(--chat-ink-soft)]">{t.product.quantity}</span>
            <div className="flex items-center gap-0.5 rounded-xl bg-[var(--chat-surface-soft)] p-0.5">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent font-bold text-[var(--chat-ink-muted)] transition-colors hover:bg-[var(--chat-surface)] hover:text-[var(--chat-ink)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <i className="fas fa-minus text-xs"></i>
              </button>
              <span className="w-8 text-center text-sm font-bold text-[var(--chat-ink)]">{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(10, q + 1))}
                disabled={quantity >= 10}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent font-bold text-[var(--chat-ink-muted)] transition-colors hover:bg-[var(--chat-surface)] hover:text-[var(--chat-ink)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`flex gap-2 ${isClickDisabled ? 'pointer-events-none' : ''}`}>
          {/* Add to Cart Button - PRIMARY ACTION (enabled even during preview) */}
          {showAddToCart && onAddToCart && (
            <button
              onClick={handleAddToCart}
              disabled={!canCalculate || isAddToCartDisabled}
              className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                isAddToCartDisabled
                  ? 'cursor-not-allowed bg-[var(--chat-panel-soft)] text-[var(--chat-ink-muted)]'
                  : disabled && disabledMode === 'warn'
                    ? canCalculate
                      ? 'bg-[linear-gradient(135deg,var(--pn-accent-red)_0%,#c98a55_100%)] text-white shadow-lg transition hover:brightness-105 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                      : 'cursor-not-allowed bg-[var(--chat-panel-soft)] text-[var(--chat-ink-muted)]'
                    : canCalculate
                      ? isPreview
                        ? 'bg-[linear-gradient(135deg,var(--chat-accent)_0%,#2457c5_100%)] text-white shadow-lg opacity-80 transition hover:brightness-105 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-[linear-gradient(135deg,var(--chat-accent)_0%,#2457c5_100%)] text-white shadow-lg transition hover:brightness-105 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                      : 'cursor-not-allowed bg-[var(--chat-panel-soft)] text-[var(--chat-ink-muted)]'
              }`}
            >
              {isAddingToCart ? (
                <>
                  <i className="fas fa-spinner fa-spin text-sm"></i>
                  <span>{t.common.loading}</span>
                </>
              ) : (
                <>
                  <i className="fas fa-cart-plus text-sm"></i>
                  {canCalculate ? t.product.addToCart : t.product.selectOption}
                </>
              )}
            </button>
          )}

          {/* Calculate Shipping Button - SECONDARY ACTION */}
          <button
            onClick={handleCalculate}
            disabled={!canCalculate || isButtonDisabled}
            className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              isButtonDisabled
                ? 'cursor-not-allowed border border-[var(--chat-border)] bg-[var(--chat-surface-soft)] text-[var(--chat-ink-muted)]'
                : disabled && disabledMode === 'warn'
                  ? canCalculate
                    ? 'border border-[#dcc1aa] bg-[var(--chat-secondary-soft)] text-[var(--chat-secondary)] hover:bg-[#efd7c0] active:scale-[0.98]'
                    : 'cursor-not-allowed border border-[var(--chat-border)] bg-[var(--chat-surface-soft)] text-[var(--chat-ink-muted)]'
                  : canCalculate
                    ? 'border border-[var(--chat-border)] bg-[var(--chat-surface-soft)] text-[var(--chat-accent)] hover:border-[var(--chat-border-strong)] hover:bg-[var(--chat-panel-strong)] active:scale-[0.98]'
                    : 'cursor-not-allowed border border-[var(--chat-border)] bg-[var(--chat-surface-soft)] text-[var(--chat-ink-muted)]'
            }`}
          >
            <i className="fas fa-calculator text-sm"></i>
            {canCalculate ? t.product.calculateShipping : t.product.selectOption}
          </button>
        </div>
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--chat-overlay)]">
          <div className="mx-4 max-w-sm rounded-[28px] border border-[var(--chat-border)] bg-[var(--chat-panel-strong)] p-6 shadow-[0_30px_60px_rgba(27,22,18,0.18)]">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--chat-secondary-soft)]">
                <i className="fas fa-exclamation-triangle text-xl text-[var(--chat-secondary)]"></i>
              </div>
              <h3 className="text-lg font-semibold text-[var(--chat-ink)]">{t.product.usePreviousTitle}</h3>
              <p className="mt-2 text-sm text-[var(--chat-ink-soft)]">
                {t.product.usePreviousDesc}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded-xl border border-[var(--chat-border)] py-2.5 font-medium text-[var(--chat-ink-soft)] transition hover:bg-[var(--chat-surface-soft)]"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-xl bg-[var(--chat-secondary)] py-2.5 font-medium text-white transition hover:brightness-105"
              >
                {t.product.yesContinue}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
