import { z } from 'zod';
import { buildStoredDeliveryProfile, type StoredDeliveryProfile } from '@/lib/customs/delivery';
import { createPurchaseSchema, supportSchema } from '@/lib/purchases/schemas';
import { validateProductUrl } from '@/lib/purchases/product-url';
import { intakeDecision } from '@/lib/purchases/categories';
import type { PurchaseDetail } from '@/components/purchases/types';
import { previewCustomer } from './customer-fixture';

const versionSchema = z.object({ version: z.number().int().nonnegative() }).strict();

export function createPreviewStore() {
  let profile: StoredDeliveryProfile | null = previewCustomer();
  const requests = new Map<string, PurchaseDetail>();
  const submissions = new Map<string, { id: string; body: string }>();
  const createdAt = new Date().toISOString();
  function makeRequest(id: string): PurchaseDetail {
    return { id, sourceUrl: 'https://www.yes24.com/product/goods/13137546', category: 'books', quantity: 1, options: '',
      destination: 'SG', status: 'REVIEW_REQUIRED', statusLabel: 'Awaiting review', version: 0, paymentReceived: false, checkoutAvailable: false,
      quote: null, quoteExpiresAt: null, carrier: null, trackingNumber: null, createdAt, updatedAt: createdAt, fulfilmentStarted: false,
      events: [{ status: 'REVIEW_REQUIRED', source: 'local_preview', createdAt, message: 'Fictional preview request. No seller purchase or payment was made.' }], tickets: [] };
  }
  const review = makeRequest('11111111-1111-4111-8111-111111111111');
  requests.set(review.id, review);
  const shipment = makeRequest('22222222-2222-4222-8222-222222222222');
  Object.assign(shipment, { status: 'SHIPPED', statusLabel: 'Example shipment', carrier: 'SAMPLE_ONLY', trackingNumber: 'SAMPLE-NOT-TRACKABLE-001', fulfilmentStarted: true });
  shipment.events = [{ status: 'SHIPPED', source: 'local_preview', createdAt, message: 'Fictional shipment display. This is not a carrier event or a usable tracking number.' }];
  requests.set(shipment.id, shipment);

  function find(id: string) {
    const row = requests.get(id);
    if (!row) throw new Error('This preview request was not found. Refreshing resets the preview.');
    return row;
  }
  function changed(row: PurchaseDetail, status: string, message: string) {
    row.status = status; row.version++; row.updatedAt = new Date().toISOString();
    row.events.push({ status, message, source: 'local_preview', createdAt: row.updatedAt });
  }
  return {
    getProfile: () => structuredClone(profile),
    saveProfile(input: unknown) { profile = buildStoredDeliveryProfile(input); return structuredClone(profile); },
    deleteProfile() { profile = null; },
    list() { return [...requests.values()].map(row => { const { events: _events, tickets: _tickets, ...summary } = row; return structuredClone({ ...summary, options: '' }); }); },
    get: (id: string) => structuredClone(find(id)),
    create(input: unknown) {
      const parsed = createPurchaseSchema.parse(input);
      const sourceUrl = validateProductUrl(parsed.sourceUrl);
      if (!profile) throw new Error('Add preview delivery details first.');
      if (intakeDecision(parsed.category) === 'OUT_OF_SCOPE') throw new Error('This category is outside the current service scope.');
      const body = JSON.stringify({ ...parsed, sourceUrl, destination: profile.country });
      const prior = submissions.get(parsed.idempotencyKey);
      if (prior) {
        if (prior.body !== body) throw new Error('This preview submission key already belongs to different details.');
        return structuredClone(find(prior.id));
      }
      if (requests.size >= 20) throw new Error('The local preview supports 20 requests. Refresh to reset.');
      const row = makeRequest(crypto.randomUUID());
      Object.assign(row, { sourceUrl, category: parsed.category, quantity: parsed.quantity, options: parsed.options, destination: profile.country });
      requests.set(row.id, row); submissions.set(parsed.idempotencyKey, { id: row.id, body });
      return structuredClone(row);
    },
    cancel(id: string, input: unknown) {
      const { version } = versionSchema.parse(input); const row = find(id);
      if (row.status === 'CANCELLED') return structuredClone(row);
      if (row.version !== version || !['REVIEW_REQUIRED', 'QUOTED'].includes(row.status)) throw new Error('This preview request cannot be cancelled at its current stage.');
      changed(row, 'CANCELLED', 'Cancelled in local preview only.'); row.statusLabel = 'Cancelled';
      return structuredClone(row);
    },
    support(id: string, input: unknown) {
      const parsed = supportSchema.parse(input); const row = find(id);
      if (row.tickets.length >= 3) throw new Error('The local preview supports three messages per request.');
      const ticket = { ...parsed, id: crypto.randomUUID(), reply: null, status: 'OPEN', version: 0, createdAt: new Date().toISOString() };
      row.tickets.unshift(ticket); return structuredClone(ticket);
    },
  };
}
