import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import logger from '@/lib/utils/logger';
import type {
  CreateOrderIntentInput,
  CreatePaymentRequestInput,
  ListPaymentRequestsInput,
  ListOrderIntentsInput,
  OrderIntentRecord,
  PaymentRequestRecord,
  UpdateOrderIntentInput,
} from './types';

type OrderIntentRow = {
  id: string;
  quote_id: string | null;
  user_id: string | null;
  session_id: string | null;
  status: string;
  quote_quality: string;
  checkout_eligible: boolean;
  total_usd: number;
  currency: string;
  destination_country: string | null;
  acceptance_reason: string | null;
  review_summary: string | null;
  payment_request_id: string | null;
  metadata: Prisma.JsonValue | null;
  created_at: Date;
  updated_at: Date;
};

type PaymentRequestRow = {
  id: string;
  order_intent_id: string;
  quote_id: string | null;
  user_id: string | null;
  status: string;
  amount_usd: number;
  currency: string;
  shopify_draft_id: string | null;
  invoice_url: string | null;
  expires_at: Date | null;
  metadata: Prisma.JsonValue | null;
  created_at: Date;
  updated_at: Date;
};

const globalForOrderIntake = globalThis as unknown as {
  orderIntentMemoryStore?: Map<string, OrderIntentRecord>;
  paymentRequestMemoryStore?: Map<string, PaymentRequestRecord>;
};

function getOrderIntentStore(): Map<string, OrderIntentRecord> {
  if (!globalForOrderIntake.orderIntentMemoryStore) {
    globalForOrderIntake.orderIntentMemoryStore = new Map();
  }
  return globalForOrderIntake.orderIntentMemoryStore;
}

function getPaymentRequestStore(): Map<string, PaymentRequestRecord> {
  if (!globalForOrderIntake.paymentRequestMemoryStore) {
    globalForOrderIntake.paymentRequestMemoryStore = new Map();
  }
  return globalForOrderIntake.paymentRequestMemoryStore;
}

export function resetOrderIntakeMemoryStore(): void {
  getOrderIntentStore().clear();
  getPaymentRequestStore().clear();
}

function isMissingOrderIntakeTable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021') return true;
    if (error.code === 'P2010') {
      const message = JSON.stringify(error.meta ?? {});
      return message.includes('order_intents')
        || message.includes('payment_requests')
        || message.includes('42P01');
    }
  }

  return error instanceof Error
    && (
      error.message.includes('order_intents')
      || error.message.includes('payment_requests')
    );
}

function assertNotProductionFallback(tableName: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[OrderIntake] DB table "${tableName}" is missing in production. ` +
      'Run database migrations before deploying. In-memory fallback is not allowed in production.'
    );
  }
}

function orderIntentRowToRecord(row: OrderIntentRow): OrderIntentRecord {
  return {
    id: row.id,
    quoteId: row.quote_id,
    userId: row.user_id,
    sessionId: row.session_id,
    status: row.status as OrderIntentRecord['status'],
    quoteQuality: row.quote_quality as OrderIntentRecord['quoteQuality'],
    checkoutEligible: row.checkout_eligible,
    totalUsd: row.total_usd,
    currency: row.currency,
    destinationCountry: row.destination_country,
    acceptanceReason: row.acceptance_reason,
    reviewSummary: row.review_summary,
    paymentRequestId: row.payment_request_id,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function paymentRequestRowToRecord(row: PaymentRequestRow): PaymentRequestRecord {
  return {
    id: row.id,
    orderIntentId: row.order_intent_id,
    quoteId: row.quote_id,
    userId: row.user_id,
    status: row.status as PaymentRequestRecord['status'],
    amountUsd: row.amount_usd,
    currency: row.currency,
    shopifyDraftId: row.shopify_draft_id,
    invoiceUrl: row.invoice_url,
    expiresAt: row.expires_at?.toISOString() ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createOrderIntent(input: CreateOrderIntentInput): Promise<OrderIntentRecord> {
  const id = crypto.randomUUID();
  const now = new Date();

  try {
    const rows = await prisma.$queryRaw<OrderIntentRow[]>(Prisma.sql`
      INSERT INTO "order_intents" (
        "id",
        "quote_id",
        "user_id",
        "session_id",
        "status",
        "quote_quality",
        "checkout_eligible",
        "total_usd",
        "currency",
        "destination_country",
        "acceptance_reason",
        "review_summary",
        "payment_request_id",
        "metadata",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${id},
        ${input.quoteId ?? null},
        ${input.userId ?? null},
        ${input.sessionId ?? null},
        ${input.status},
        ${input.quoteQuality},
        ${input.checkoutEligible},
        ${input.totalUsd},
        ${input.currency ?? 'USD'},
        ${input.destinationCountry ?? null},
        ${input.acceptanceReason ?? null},
        ${input.reviewSummary ?? null},
        ${input.paymentRequestId ?? null},
        ${input.metadata ? (input.metadata as unknown as Prisma.InputJsonValue) : Prisma.JsonNull},
        ${now},
        ${now}
      )
      RETURNING *
    `);

    return orderIntentRowToRecord(rows[0]);
  } catch (error) {
    if (!isMissingOrderIntakeTable(error)) throw error;
    assertNotProductionFallback('order_intents');

    logger.warn('[OrderIntent] order_intents table missing, using memory fallback');
    const record: OrderIntentRecord = {
      id,
      quoteId: input.quoteId ?? null,
      userId: input.userId ?? null,
      sessionId: input.sessionId ?? null,
      status: input.status,
      quoteQuality: input.quoteQuality,
      checkoutEligible: input.checkoutEligible,
      totalUsd: input.totalUsd,
      currency: input.currency ?? 'USD',
      destinationCountry: input.destinationCountry ?? null,
      acceptanceReason: input.acceptanceReason ?? null,
      reviewSummary: input.reviewSummary ?? null,
      paymentRequestId: input.paymentRequestId ?? null,
      metadata: input.metadata ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    getOrderIntentStore().set(id, record);
    return record;
  }
}

export async function getOrderIntent(id: string): Promise<OrderIntentRecord | null> {
  try {
    const rows = await prisma.$queryRaw<OrderIntentRow[]>(Prisma.sql`
      SELECT *
      FROM "order_intents"
      WHERE "id" = ${id}
      LIMIT 1
    `);
    return rows[0] ? orderIntentRowToRecord(rows[0]) : null;
  } catch (error) {
    if (!isMissingOrderIntakeTable(error)) throw error;
    assertNotProductionFallback('order_intents');
    return getOrderIntentStore().get(id) ?? null;
  }
}

export async function listOrderIntents(input: ListOrderIntentsInput = {}): Promise<OrderIntentRecord[]> {
  const limit = Math.max(1, Math.min(input.limit ?? 20, 100));

  try {
    const conditions = [Prisma.sql`1=1`];
    if (input.status) {
      conditions.push(Prisma.sql`"status" = ${input.status}`);
    }
    if (input.userId !== undefined) {
      conditions.push(Prisma.sql`"user_id" = ${input.userId}`);
    }

    const rows = await prisma.$queryRaw<OrderIntentRow[]>(Prisma.sql`
      SELECT *
      FROM "order_intents"
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY "created_at" DESC
      LIMIT ${limit}
    `);
    return rows.map(orderIntentRowToRecord);
  } catch (error) {
    if (!isMissingOrderIntakeTable(error)) throw error;
    assertNotProductionFallback('order_intents');

    return Array.from(getOrderIntentStore().values())
      .filter((intent) => !input.status || intent.status === input.status)
      .filter((intent) => input.userId === undefined || intent.userId === input.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}

export async function updateOrderIntent(
  id: string,
  input: UpdateOrderIntentInput
): Promise<OrderIntentRecord | null> {
  const now = new Date();

  try {
    const rows = await prisma.$queryRaw<OrderIntentRow[]>(Prisma.sql`
      UPDATE "order_intents"
      SET
        "status" = COALESCE(${input.status ?? null}, "status"),
        "acceptance_reason" = COALESCE(${input.acceptanceReason ?? null}, "acceptance_reason"),
        "review_summary" = COALESCE(${input.reviewSummary ?? null}, "review_summary"),
        "payment_request_id" = COALESCE(${input.paymentRequestId ?? null}, "payment_request_id"),
        "metadata" = COALESCE(${input.metadata ? (input.metadata as unknown as Prisma.InputJsonValue) : null}, "metadata"),
        "updated_at" = ${now}
      WHERE "id" = ${id}
      RETURNING *
    `);

    return rows[0] ? orderIntentRowToRecord(rows[0]) : null;
  } catch (error) {
    if (!isMissingOrderIntakeTable(error)) throw error;
    assertNotProductionFallback('order_intents');

    const existing = getOrderIntentStore().get(id);
    if (!existing) return null;

    const updated: OrderIntentRecord = {
      ...existing,
      status: input.status ?? existing.status,
      acceptanceReason: input.acceptanceReason ?? existing.acceptanceReason,
      reviewSummary: input.reviewSummary ?? existing.reviewSummary,
      paymentRequestId: input.paymentRequestId ?? existing.paymentRequestId,
      metadata: input.metadata ?? existing.metadata,
      updatedAt: now.toISOString(),
    };
    getOrderIntentStore().set(id, updated);
    return updated;
  }
}

export async function createPaymentRequest(input: CreatePaymentRequestInput): Promise<PaymentRequestRecord> {
  const id = crypto.randomUUID();
  const now = new Date();

  try {
    const rows = await prisma.$queryRaw<PaymentRequestRow[]>(Prisma.sql`
      INSERT INTO "payment_requests" (
        "id",
        "order_intent_id",
        "quote_id",
        "user_id",
        "status",
        "amount_usd",
        "currency",
        "shopify_draft_id",
        "invoice_url",
        "expires_at",
        "metadata",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${id},
        ${input.orderIntentId},
        ${input.quoteId ?? null},
        ${input.userId ?? null},
        ${input.status ?? 'ready'},
        ${input.amountUsd},
        ${input.currency ?? 'USD'},
        ${input.shopifyDraftId ?? null},
        ${input.invoiceUrl ?? null},
        ${input.expiresAt ? new Date(input.expiresAt) : null},
        ${input.metadata ? (input.metadata as unknown as Prisma.InputJsonValue) : Prisma.JsonNull},
        ${now},
        ${now}
      )
      RETURNING *
    `);

    return paymentRequestRowToRecord(rows[0]);
  } catch (error) {
    if (!isMissingOrderIntakeTable(error)) throw error;
    assertNotProductionFallback('payment_requests');

    logger.warn('[PaymentRequest] payment_requests table missing, using memory fallback');
    const record: PaymentRequestRecord = {
      id,
      orderIntentId: input.orderIntentId,
      quoteId: input.quoteId ?? null,
      userId: input.userId ?? null,
      status: input.status ?? 'ready',
      amountUsd: input.amountUsd,
      currency: input.currency ?? 'USD',
      shopifyDraftId: input.shopifyDraftId ?? null,
      invoiceUrl: input.invoiceUrl ?? null,
      expiresAt: input.expiresAt ?? null,
      metadata: input.metadata ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    getPaymentRequestStore().set(id, record);
    return record;
  }
}

export async function getPaymentRequest(id: string): Promise<PaymentRequestRecord | null> {
  try {
    const rows = await prisma.$queryRaw<PaymentRequestRow[]>(Prisma.sql`
      SELECT *
      FROM "payment_requests"
      WHERE "id" = ${id}
      LIMIT 1
    `);
    return rows[0] ? paymentRequestRowToRecord(rows[0]) : null;
  } catch (error) {
    if (!isMissingOrderIntakeTable(error)) throw error;
    assertNotProductionFallback('payment_requests');
    return getPaymentRequestStore().get(id) ?? null;
  }
}

export async function listPaymentRequests(input: ListPaymentRequestsInput = {}): Promise<PaymentRequestRecord[]> {
  const limit = Math.max(1, Math.min(input.limit ?? 20, 100));

  try {
    const conditions = [Prisma.sql`1=1`];
    if (input.quoteId !== undefined) {
      conditions.push(Prisma.sql`"quote_id" = ${input.quoteId}`);
    }
    if (input.userId !== undefined) {
      conditions.push(Prisma.sql`"user_id" = ${input.userId}`);
    }
    if (input.status) {
      conditions.push(Prisma.sql`"status" = ${input.status}`);
    }

    const rows = await prisma.$queryRaw<PaymentRequestRow[]>(Prisma.sql`
      SELECT *
      FROM "payment_requests"
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY "created_at" DESC
      LIMIT ${limit}
    `);
    return rows.map(paymentRequestRowToRecord);
  } catch (error) {
    if (!isMissingOrderIntakeTable(error)) throw error;
    assertNotProductionFallback('payment_requests');

    return Array.from(getPaymentRequestStore().values())
      .filter((request) => input.quoteId === undefined || request.quoteId === input.quoteId)
      .filter((request) => input.userId === undefined || request.userId === input.userId)
      .filter((request) => !input.status || request.status === input.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}
