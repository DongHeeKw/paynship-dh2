'use client';

interface OrderSuccessProps {
  totalAmount: number;
  checkoutUrl: string;
  quoteId?: string;
  mockMode?: boolean;
  onNewOrder: () => void;
}

export default function OrderSuccess({
  totalAmount,
  checkoutUrl,
  quoteId,
  mockMode = false,
  onNewOrder,
}: OrderSuccessProps) {
  const trackingUrl = quoteId
    ? `/orders?quoteId=${encodeURIComponent(quoteId)}`
    : '/orders';

  return (
    <div className="pn-card-soft mx-auto max-w-md p-8 text-center animate-slide-up">
      {/* Success Icon */}
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--pn-success)_0%,var(--pn-brand)_100%)] text-white shadow-[0_18px_36px_rgba(31,122,82,0.24)] animate-bounce">
        <i className="fas fa-check text-2xl"></i>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-2xl font-bold text-[var(--pn-ink)]">
        {mockMode ? 'Demo Payment Ready!' : 'Order Ready!'}
      </h3>
      <p className="mb-6 text-sm text-[var(--pn-ink-soft)]">
        {mockMode
          ? 'Test mode is enabled. No real charge will happen, and you will move directly to shipping status.'
          : 'Your cart has been reserved on Shopify. Complete payment to confirm your order.'}
      </p>

      {/* Order Summary */}
      <div className="mb-6 rounded-[22px] border border-[var(--pn-border)] bg-white/90 p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--pn-ink-soft)]">Total Amount</span>
          <span className="text-2xl font-bold text-[var(--pn-success)]">${totalAmount.toFixed(2)}</span>
        </div>
        <div className="mt-2 text-xs text-[var(--pn-ink-muted)]">
          Includes shipping, customs, taxes & service fee
        </div>
      </div>

      {/* Security Badge */}
      <div className="mb-6 flex items-center justify-center gap-2 text-xs text-[var(--pn-ink-muted)]">
        <i className={`fas ${mockMode ? 'fa-flask' : 'fa-lock'}`}></i>
        <span>{mockMode ? 'Demo checkout (No real charge)' : 'Secure checkout powered by Shopify'}</span>
      </div>

      {/* Payment Button */}
      <a
        href={checkoutUrl}
        target={mockMode ? '_self' : '_blank'}
        rel={mockMode ? undefined : 'noopener noreferrer'}
        className="pn-button-primary inline-flex w-full py-4 text-lg font-bold"
      >
        <i className={`fas ${mockMode ? 'fa-forward' : 'fa-credit-card'} mr-2`}></i>
        {mockMode ? 'Continue Demo Checkout' : `Pay $${totalAmount.toFixed(2)} Now`}
      </a>

      {!mockMode && (
        <>
          <a
            href={trackingUrl}
            className="pn-button-secondary mt-3 inline-flex w-full py-3 font-semibold text-[var(--pn-success)]"
          >
            <i className="fas fa-receipt mr-2"></i>
            I Paid - Check Order Status
          </a>
          <p className="mt-2 text-xs text-[rgba(31,122,82,0.8)]">
            Payment webhook sync may take 30-120 seconds.
          </p>
        </>
      )}

      {/* Secondary Action */}
      <button
        onClick={onNewOrder}
        className="mt-4 text-sm text-[var(--pn-brand)] transition-colors hover:text-[var(--pn-brand-strong)] hover:underline"
      >
        <i className="fas fa-plus mr-1"></i>
        Start New Order
      </button>

    </div>
  );
}
