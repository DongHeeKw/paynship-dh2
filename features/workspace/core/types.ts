import type { PurchaseDetail } from '@/components/purchases/types';
import type { DeliveryProfile } from '@/lib/purchases/schemas';

export interface GhostCustomer { id: string; email: string; name: string; country: 'CN' | 'JP' | 'US'; sampleOnly: true; }
export interface SampleProduct {
  id: string; sourceUrl: string; name: string; category: string; options: string;
  estimatedPriceKrw: number; observedPriceKrw: null; hsCode: null; evidenceStatus: 'UNVERIFIED_ESTIMATE';
}
export interface SampleQuote extends Record<string, unknown> {
  currency: 'USD'; productName: string; productCents: number; domesticShippingCents: number;
  serviceFeeCents: number; internationalShippingCents: number; insuranceCents: number;
  dutyCents: null; taxCents: null; totalCents: number; subtotalCents: number;
  exchangeRateKrwPerUsd: number; quoteVersion: number; sampleOnly: true; customsStatus: 'UNKNOWN';
}
export interface SampleRequest extends PurchaseDetail {
  sampleOnly: true; productId: string; productName: string; estimatedPriceKrw: number;
  observedPriceKrw: null; hsCode: null; quote: SampleQuote | null;
}
export interface SampleCreditEntry {
  id: string; requestId: string | null; amountCents: number; kind: 'OPENING' | 'TOP_UP' | 'PAYMENT'; label: string; createdAt: string;
}
export interface SamplePayment {
  id: string; requestId: string; amountCents: number; status: 'PENDING' | 'COMPLETED';
  provider: 'SAMPLE_CREDIT'; createdAt: string; completedAt: string | null; sampleOnly: true;
}
export interface SampleDelivery {
  requestId: string; carrier: string | null; trackingNumber: string | null; status: string; lastEventAt: string | null; sampleOnly: true;
}
export interface WorkspaceData {
  sampleOnly: true; notice: string; customers: GhostCustomer[]; customer: GhostCustomer; products: SampleProduct[];
  account: { currency: 'USD'; balanceCents: number; sampleOnly: true };
  creditEntries: SampleCreditEntry[]; payments: SamplePayment[]; requests: SampleRequest[]; deliveries: SampleDelivery[];
  deliveryProfile: DeliveryProfile; fixtureVersion: number;
}
export type WorkspaceAction = { customerId: string; idempotencyKey: string } & (
  | { action: 'top_up'; amountCents: number }
  | { action: 'pay'; requestId: string; version: number }
  | { action: 'advance_delivery'; requestId: string; version: number }
  | { action: 'create_sample_request'; productId: string }
  | { action: 'support'; requestId: string; subject: string; message: string }
  | { action: 'save_delivery'; delivery: DeliveryProfile }
  | { action: 'cancel_request'; requestId: string; version: number }
);
