'use client';

import { useState, type ReactNode } from 'react';
import { PriceBreakdown } from '@/lib/calculator/price';
import type { ProductDataSources } from '@/types';
import SourceBadge from '@/components/common/SourceBadge';
import { useLanguage } from '@/lib/i18n';

interface InvoiceProps {
  breakdown: PriceBreakdown;
  productName?: string;
  productImage?: string;
  checkoutEligible?: boolean;
  onCheckout: () => void;
  onSubmitForReview?: () => void;
  onModify?: () => void;
  dataSources?: ProductDataSources;
  showCalculationDetails?: boolean;
}

export default function Invoice({
  breakdown,
  productName,
  productImage,
  checkoutEligible = true,
  onCheckout,
  onSubmitForReview,
  onModify,
  dataSources,
  showCalculationDetails = true,
}: InvoiceProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { language } = useLanguage();
  const domesticShippingUsd = breakdown.domesticShippingUsd || 0;
  const subtotalWithDomestic = breakdown.subtotal + domesticShippingUsd;
  const qualityTone =
    breakdown.qualityGate?.status === 'red'
      ? 'border-[var(--pn-danger-soft)] bg-[var(--pn-danger-soft)] text-[var(--pn-danger)]'
      : 'border-[var(--pn-warning-soft)] bg-[var(--pn-warning-soft)] text-[var(--pn-warning)]';

  return (
    <div className="pn-card-soft p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--pn-brand)_0%,#2457c5_100%)] text-white shadow-[0_14px_28px_rgba(0,55,100,0.16)]">
            <i className="fas fa-file-invoice-dollar text-white"></i>
          </div>
          <h3 className="text-2xl font-bold text-[var(--pn-ink)]">Price Quote</h3>
        </div>
        <div className="rounded-full border border-[var(--pn-brand-soft)] bg-[var(--pn-brand-soft)] px-4 py-2">
          <span className="text-sm font-medium text-[var(--pn-brand)]">
            {checkoutEligible ? 'Quote Ready' : 'Review Required'}
          </span>
        </div>
      </div>

      {productName && (
        <div className="mb-6 rounded-[22px] border border-[var(--pn-border)] bg-white/82 p-4">
          <div className="flex gap-4">
            {productImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={productImage}
                alt={productName}
                loading="lazy"
                className="h-20 w-20 rounded-[18px] border border-[var(--pn-border)] object-cover"
              />
            )}
            <div className="flex-1">
              <h4 className="mb-1 font-medium text-[var(--pn-ink)]">{productName}</h4>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--pn-ink-muted)]">
                <span className="flex items-center gap-1">
                  Weight: {breakdown.weightKg} kg
                  {dataSources?.weight && (
                    <SourceBadge source={dataSources.weight} field="Weight" size="sm" />
                  )}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  HS: {breakdown.hsCode}
                  {dataSources?.hsCode && (
                    <SourceBadge source={dataSources.hsCode} field="HS Code" size="sm" />
                  )}
                </span>
                <span>•</span>
                <span>Destination: {breakdown.countryCode}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 space-y-3">
        {breakdown.qualityGate && breakdown.qualityGate.status !== 'green' && (
          <div className={`rounded-[20px] border p-4 ${qualityTone}`}>
            <p className="mb-1 font-semibold">
              {breakdown.qualityGate.status === 'amber'
                ? (language === 'ko' ? '일부 값은 추정치를 기반으로 합니다' : language === 'zh' ? '部分数值基于估算' : 'Some values are based on estimates')
                : (language === 'ko' ? '자동 견적의 정확도를 확인해야 합니다' : language === 'zh' ? '需要确认自动报价的准确性' : 'Please verify the accuracy of this estimate')}
            </p>
            {breakdown.qualityGate.reasons.map((reason) => (
              <p key={reason} className="text-sm opacity-90">
                {reason}
              </p>
            ))}
          </div>
        )}

        {/* Total — always visible */}
        <div className="flex items-center justify-between rounded-[22px] border border-[var(--pn-success-soft)] bg-[linear-gradient(135deg,var(--pn-success-soft)_0%,var(--pn-brand-soft)_100%)] p-4">
          <div>
            <p className="mb-1 text-sm text-[var(--pn-ink-soft)]">ESTIMATED TOTAL</p>
            <p className="text-2xl font-bold text-[var(--pn-ink)]">${breakdown.totalUSD.toFixed(2)} USD</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[var(--pn-ink-soft)]">Estimated Delivery</p>
            <p className="text-lg font-semibold text-[var(--pn-success)]">{breakdown.estimatedDays} days</p>
          </div>
        </div>

        {/* See breakdown toggle */}
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex w-full items-center justify-between rounded-[18px] border border-[var(--pn-border)] bg-white/82 p-3 transition-colors hover:bg-white"
        >
          <span className="text-sm font-medium text-[var(--pn-ink-soft)]">
            <i className="fas fa-receipt mr-2"></i>
            See breakdown
          </span>
          <i className={`fas fa-chevron-${showBreakdown ? 'up' : 'down'} text-xs text-[var(--pn-ink-muted)]`}></i>
        </button>

        {/* Collapsible line items */}
        {showBreakdown && (
          <div className="space-y-3">
            <LineItem
              title="Item Price"
              description={`₩${breakdown.itemPriceKRW.toLocaleString()} × ${breakdown.exchangeRate.toFixed(2)} rate`}
              value={`$${breakdown.itemPriceUSD.toFixed(2)}`}
            />

            <LineItem
              title="International Shipping"
              description={`${breakdown.weightKg} kg to ${breakdown.countryCode} • ${breakdown.estimatedDays} days`}
              value={`$${breakdown.shippingCost.toFixed(2)}`}
            />

            {domesticShippingUsd > 0 && (
              <LineItem
                title="Korea Domestic Shipping"
                description="Seller to PayNShip warehouse"
                value={`$${domesticShippingUsd.toFixed(2)}`}
                badge={dataSources?.domesticShipping ? (
                  <SourceBadge source={dataSources.domesticShipping} field="Domestic Shipping" size="sm" />
                ) : undefined}
              />
            )}

            <div className="flex items-center justify-between rounded-[18px] border border-[var(--pn-brand-soft)] bg-[var(--pn-brand-soft)] p-3">
              <p className="font-medium text-[var(--pn-ink)]">Subtotal</p>
              <p className="text-lg font-semibold text-[var(--pn-brand)]">${subtotalWithDomestic.toFixed(2)}</p>
            </div>

            <LineItem
              title="Customs Duty"
              description={
                breakdown.customsDuty > 0
                  ? `${(breakdown.calculations.dutyRate * 100).toFixed(1)}% on item value`
                  : 'Duty-free or below threshold'
              }
              value={breakdown.customsDuty > 0 ? `$${breakdown.customsDuty.toFixed(2)}` : 'Free'}
            />

            <LineItem
              title="Sales Tax / VAT"
              description={
                breakdown.salesTax > 0
                  ? `${(breakdown.calculations.taxRate * 100).toFixed(1)}% on taxable amount`
                  : 'Tax-free or below threshold'
              }
              value={breakdown.salesTax > 0 ? `$${breakdown.salesTax.toFixed(2)}` : 'Free'}
            />

            <LineItem
              title="PayNShip Service Fee"
              description={`${(breakdown.calculations.serviceFeeRate * 100).toFixed(0)}% of item + international shipping`}
              value={`$${breakdown.serviceFee.toFixed(2)}`}
            />
          </div>
        )}
      </div>

      {showCalculationDetails && (
        <div className="mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex w-full items-center justify-between rounded-[18px] border border-[var(--pn-border)] bg-white/82 p-3 transition-colors hover:bg-white"
          >
            <span className="text-sm font-medium text-[var(--pn-ink-soft)]">
              <i className="fas fa-info-circle mr-2"></i>
              Calculation Details
            </span>
            <i className={`fas fa-chevron-${showDetails ? 'up' : 'down'} text-xs text-[var(--pn-ink-muted)]`}></i>
          </button>

          {showDetails && (
            <div className="mt-2 space-y-3 rounded-[20px] border border-[var(--pn-border)] bg-white/78 p-4">
              <DetailBlock
                icon="fa-weight-hanging"
                title="Weight Calculation"
                badge={dataSources?.weight ? (
                  <SourceBadge source={dataSources.weight} field="Weight" size="sm" />
                ) : undefined}
              >
                {breakdown.weightDetails ? (
                  <>
                    <p>Actual weight: {breakdown.weightDetails.actualWeight} kg</p>
                    {breakdown.weightDetails.dimensions && (
                      <p>
                        Volumetric: {breakdown.weightDetails.volumetricWeight.toFixed(2)} kg
                        ({breakdown.weightDetails.dimensions.length}×{breakdown.weightDetails.dimensions.width}×{breakdown.weightDetails.dimensions.height} cm)
                      </p>
                    )}
                    <p className="text-[var(--pn-ink-soft)]">
                      Billed: {breakdown.weightDetails.billableWeight} kg
                      ({breakdown.weightDetails.chargedBy === 'volumetric' ? 'volumetric' : 'actual'} weight)
                    </p>
                  </>
                ) : (
                  <p>Weight: {breakdown.weightKg} kg</p>
                )}
              </DetailBlock>

              <DetailBlock
                icon="fa-tags"
                title="Customs Classification"
                badge={dataSources?.hsCode ? (
                  <SourceBadge source={dataSources.hsCode} field="HS Code" size="sm" />
                ) : undefined}
              >
                <p>HS Code: {breakdown.hsCode}</p>
                <p>Duty rate: {(breakdown.calculations.dutyRate * 100).toFixed(1)}%</p>
                <p>Tax rate: {(breakdown.calculations.taxRate * 100).toFixed(1)}%</p>
              </DetailBlock>

              <DetailBlock icon="fa-exchange-alt" title="Currency Conversion">
                <p>1 USD = ₩{breakdown.exchangeRate.toLocaleString()}</p>
              </DetailBlock>

              {dataSources && (
                <div className="border-t border-[var(--pn-border)] pt-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--pn-ink-muted)]">Data sources:</span>
                    <div className="flex gap-1">
                      <SourceBadge source={dataSources.weight} field="Weight" size="sm" />
                      <SourceBadge source={dataSources.hsCode} field="HS Code" size="sm" />
                      {dataSources.dimensions && (
                        <SourceBadge source={dataSources.dimensions} field="Dimensions" size="sm" />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mb-6 space-y-3">
        <InfoNote
          tone="warning"
          icon="fa-exclamation-triangle"
          title="Exchange Rate Notice:"
          body={` Exchange rate is ${breakdown.exchangeRate} KRW/USD. Final amount may vary slightly at checkout based on current rates.`}
        />
        <InfoNote
          tone="brand"
          icon="fa-info-circle"
          body="All fees included. No hidden charges. Tracking number provided after shipment."
        />
      </div>

      <div className="flex gap-3">
        {checkoutEligible ? (
          <button
            onClick={onCheckout}
            className="pn-button-primary flex-1 px-6 py-4 text-lg font-bold"
          >
            <i className="fas fa-shopping-cart mr-2"></i>
            Proceed to Checkout
          </button>
        ) : (
          <button
            onClick={onSubmitForReview}
            className="pn-button-primary flex-1 px-6 py-4 text-lg font-bold"
          >
            <i className="fas fa-clipboard-check mr-2"></i>
            Submit for Review
          </button>
        )}

        {onModify && (
          <button
            onClick={onModify}
            className="pn-button-secondary px-6 py-4 font-medium"
          >
            <i className="fas fa-edit mr-2"></i>
            Modify
          </button>
        )}
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-[var(--pn-ink-muted)]">
          Powered by PayNShip • Secure Payment via Shopify
        </p>
      </div>
    </div>
  );
}

function LineItem({
  title,
  description,
  value,
  badge,
}: {
  title: string;
  description: string;
  value: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-[var(--pn-border)] bg-white/82 p-3">
      <div>
        <p className="flex items-center gap-2 font-medium text-[var(--pn-ink)]">
          <span>{title}</span>
          {badge}
        </p>
        <p className="text-sm text-[var(--pn-ink-muted)]">{description}</p>
      </div>
      <p className="text-lg font-semibold text-[var(--pn-ink)]">{value}</p>
    </div>
  );
}

function DetailBlock({
  icon,
  title,
  badge,
  children,
}: {
  icon: string;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="text-sm">
      <div className="mb-1 flex items-center gap-2 text-[var(--pn-ink-soft)]">
        <i className={`fas ${icon} text-xs`}></i>
        <span className="font-medium">{title}</span>
        {badge}
      </div>
      <div className="space-y-0.5 pl-5 text-[var(--pn-ink-muted)]">{children}</div>
    </div>
  );
}

function InfoNote({
  tone,
  icon,
  title,
  body,
}: {
  tone: 'warning' | 'brand';
  icon: string;
  title?: string;
  body: string;
}) {
  const toneClasses =
    tone === 'warning'
      ? {
          shell: 'border-[var(--pn-warning-soft)] bg-[var(--pn-warning-soft)]',
          icon: 'text-[var(--pn-warning)]',
          title: 'text-[var(--pn-warning)]',
        }
      : {
          shell: 'border-[var(--pn-brand-soft)] bg-[var(--pn-brand-soft)]',
          icon: 'text-[var(--pn-brand)]',
          title: 'text-[var(--pn-brand)]',
        };

  return (
    <div className={`rounded-[18px] border p-3 ${toneClasses.shell}`}>
      <div className="flex gap-3">
        <i className={`fas ${icon} mt-1 text-sm ${toneClasses.icon}`}></i>
        <p className="text-sm text-[var(--pn-ink-soft)]">
          {title ? <strong className={toneClasses.title}>{title}</strong> : null}
          {body}
        </p>
      </div>
    </div>
  );
}
