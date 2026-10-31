'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';

interface GridProduct {
  id: string;
  name: string;
  imageUrl: string;
  priceKrw: number;
  priceUsd?: number;
  category: string;
  weightKg?: number;
  platform?: string;
  sourceUrl?: string;
}

interface ProductGridProps {
  products: GridProduct[];
  query?: string;
  onSelect: (product: GridProduct, index: number) => void;
  disabled?: boolean;
  disabledMode?: 'disable' | 'warn';
}

export default function ProductGrid({ products, query, onSelect, disabled = false, disabledMode = 'disable' }: ProductGridProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{ product: GridProduct; index: number } | null>(null);
  const { formatPrice } = useLanguage();

  const handleClick = (product: GridProduct, index: number) => {
    if (!disabled) {
      onSelect(product, index);
      return;
    }

    if (disabledMode === 'warn') {
      setPendingSelection({ product, index });
      setShowWarning(true);
    }
    // If disabledMode === 'disable', do nothing (clicks are blocked by CSS)
  };

  const handleConfirm = () => {
    if (pendingSelection) {
      onSelect(pendingSelection.product, pendingSelection.index);
    }
    setShowWarning(false);
    setPendingSelection(null);
  };

  const handleCancel = () => {
    setShowWarning(false);
    setPendingSelection(null);
  };
  if (!products || products.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6 text-center text-[var(--chat-ink-muted)]">
        <i className="fas fa-search text-2xl mb-2"></i>
        <p>No products found</p>
      </div>
    );
  }

  const isClickDisabled = disabled && disabledMode === 'disable';

  return (
    <div className={disabled ? 'relative' : ''}>
      {query && (
        <p className={`mb-3 text-sm ${disabled ? 'text-[var(--chat-ink-muted)]' : 'text-[var(--chat-ink-soft)]'}`}>
          <i className="fas fa-search mr-1"></i>
          Results for &quot;{query}&quot;
        </p>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ${isClickDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {products.map((product, index) => (
          <div
            key={product.id}
            onClick={() => handleClick(product, index + 1)}
            className={`group rounded-2xl border bg-[var(--chat-surface)] p-3 shadow-[0_14px_24px_rgba(35,29,24,0.05)] transition-all duration-200 ${
              disabled
                ? disabledMode === 'warn'
                  ? 'cursor-pointer border-[var(--chat-border)] hover:border-[#dcc1aa] hover:shadow-[0_20px_34px_rgba(35,29,24,0.1)]'
                  : 'cursor-not-allowed border-[var(--chat-border)]'
                : 'cursor-pointer border-[var(--chat-border)] hover:border-[var(--chat-border-strong)] hover:shadow-[0_20px_34px_rgba(35,29,24,0.1)]'
            }`}
          >
            {/* Product Image */}
            <div className="relative mb-3 h-32 overflow-hidden rounded-xl bg-[var(--chat-surface-soft)]">
{/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrl}
                alt={product.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/product-placeholder.svg';
                }}
              />
              {/* Index Badge */}
              <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--chat-accent)] text-xs font-bold text-white shadow">
                {index + 1}
              </div>
              {/* Platform Badge */}
              {product.platform && (
                <div className="absolute bottom-2 right-2 rounded-full bg-[rgba(33,54,51,0.82)] px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                  {product.platform}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              <h4 className="mb-1 truncate text-sm font-bold text-[var(--chat-ink)] transition-colors group-hover:text-[var(--chat-accent)]">
                {product.name}
              </h4>
              <div className="mb-2 text-xs text-[var(--chat-ink-muted)]">{product.category}</div>

              {/* Price */}
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-[var(--chat-accent)]">
                    {formatPrice(product.priceKrw)}
                  </span>
                  <span className="ml-1 text-xs text-[var(--chat-ink-muted)]">
                    (~₩{product.priceKrw.toLocaleString()})
                  </span>
                </div>
                <button className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  disabled
                    ? disabledMode === 'warn'
                      ? 'bg-[var(--chat-secondary-soft)] text-[var(--chat-secondary)] group-hover:bg-[var(--chat-secondary)] group-hover:text-white'
                      : 'bg-[var(--chat-surface-soft)] text-[var(--chat-ink-muted)]'
                    : 'bg-[var(--chat-accent-soft)] text-[var(--chat-accent)] group-hover:bg-[var(--chat-accent)] group-hover:text-white'
                }`}>
                  Select
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Help Text */}
      {!disabled && (
        <p className="mt-3 text-center text-xs text-[var(--chat-ink-muted)]">
          <i className="fas fa-hand-pointer mr-1"></i>
          Click a product or type its number to select
        </p>
      )}

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--chat-overlay)]">
          <div className="mx-4 max-w-sm rounded-[28px] border border-[var(--chat-border)] bg-[var(--chat-panel-strong)] p-6 shadow-[0_30px_60px_rgba(27,22,18,0.18)]">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--chat-secondary-soft)]">
                <i className="fas fa-exclamation-triangle text-xl text-[var(--chat-secondary)]"></i>
              </div>
              <h3 className="text-lg font-semibold text-[var(--chat-ink)]">Select from Previous Results?</h3>
              <p className="mt-2 text-sm text-[var(--chat-ink-soft)]">
                This is from an older search. Are you sure you want to select this product?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded-xl border border-[var(--chat-border)] py-2.5 font-medium text-[var(--chat-ink-soft)] transition hover:bg-[var(--chat-surface-soft)]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-xl bg-[var(--chat-secondary)] py-2.5 font-medium text-white transition hover:brightness-105"
              >
                Yes, Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
