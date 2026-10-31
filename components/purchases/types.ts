export interface PurchaseEvent { status: string; message: string; source: string; createdAt: string; }
export interface SupportTicket { id: string; subject: string; message: string; reply: string | null; status: string; version: number; createdAt: string; purchaseRequestId?: string; }
export interface PurchaseSummary {
  id: string; sourceUrl: string; category: string; quantity: number; options: string; destination: string; status: string; statusLabel: string; version: number;
  paymentReceived: boolean; checkoutAvailable: boolean; quote: Record<string, unknown> | null; quoteExpiresAt: string | null; carrier: string | null; trackingNumber: string | null; createdAt: string; updatedAt: string;
}
export interface PurchaseDetail extends PurchaseSummary { events: PurchaseEvent[]; tickets: SupportTicket[]; fulfilmentStarted: boolean; }
