import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import logger from '@/lib/utils/logger';
import type {
  CreateProcurementBatchInput,
  CreateProcurementTaskInput,
  ProcurementBatchRecord,
  ProcurementTaskRecord,
  UpdateProcurementBatchInput,
  UpdateProcurementTaskInput,
} from './types';

type ProcurementBatchRow = {
  id: string;
  status: string;
  source_vendor: string | null;
  selected_source_url: string | null;
  order_intent_ids: Prisma.JsonValue | null;
  operator_user_id: string | null;
  metadata: Prisma.JsonValue | null;
  created_at: Date;
  updated_at: Date;
};

type ProcurementTaskRow = {
  id: string;
  batch_id: string | null;
  order_intent_id: string | null;
  canonical_product_id: string | null;
  status: string;
  selected_source_url: string | null;
  lowest_price_krw: number | null;
  availability_status: string | null;
  review_summary: string | null;
  metadata: Prisma.JsonValue | null;
  created_at: Date;
  updated_at: Date;
};

const globalForProcurement = globalThis as unknown as {
  procurementBatchStore?: Map<string, ProcurementBatchRecord>;
  procurementTaskStore?: Map<string, ProcurementTaskRecord>;
};

function getBatchStore(): Map<string, ProcurementBatchRecord> {
  if (!globalForProcurement.procurementBatchStore) {
    globalForProcurement.procurementBatchStore = new Map();
  }
  return globalForProcurement.procurementBatchStore;
}

function getTaskStore(): Map<string, ProcurementTaskRecord> {
  if (!globalForProcurement.procurementTaskStore) {
    globalForProcurement.procurementTaskStore = new Map();
  }
  return globalForProcurement.procurementTaskStore;
}

export function resetProcurementMemoryStore(): void {
  getBatchStore().clear();
  getTaskStore().clear();
}

function isMissingProcurementTable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021') return true;
    if (error.code === 'P2010') {
      const message = JSON.stringify(error.meta ?? {});
      return message.includes('procurement_batches')
        || message.includes('procurement_tasks')
        || message.includes('42P01');
    }
  }

  return error instanceof Error
    && (
      error.message.includes('procurement_batches')
      || error.message.includes('procurement_tasks')
    );
}

function assertNotProductionFallback(tableName: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[Procurement] DB table "${tableName}" is missing in production. ` +
      'Run database migrations before deploying. In-memory fallback is not allowed in production.'
    );
  }
}

function batchRowToRecord(row: ProcurementBatchRow): ProcurementBatchRecord {
  return {
    id: row.id,
    status: row.status as ProcurementBatchRecord['status'],
    sourceVendor: row.source_vendor,
    selectedSourceUrl: row.selected_source_url,
    orderIntentIds: Array.isArray(row.order_intent_ids) ? row.order_intent_ids as string[] : [],
    operatorUserId: row.operator_user_id,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function taskRowToRecord(row: ProcurementTaskRow): ProcurementTaskRecord {
  return {
    id: row.id,
    batchId: row.batch_id,
    orderIntentId: row.order_intent_id,
    canonicalProductId: row.canonical_product_id,
    status: row.status as ProcurementTaskRecord['status'],
    selectedSourceUrl: row.selected_source_url,
    lowestPriceKrw: row.lowest_price_krw,
    availabilityStatus: row.availability_status,
    reviewSummary: row.review_summary,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createProcurementBatch(input: CreateProcurementBatchInput = {}): Promise<ProcurementBatchRecord> {
  const id = crypto.randomUUID();
  const now = new Date();

  try {
    const rows = await prisma.$queryRaw<ProcurementBatchRow[]>(Prisma.sql`
      INSERT INTO "procurement_batches" (
        "id",
        "status",
        "source_vendor",
        "selected_source_url",
        "order_intent_ids",
        "operator_user_id",
        "metadata",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${id},
        ${input.status ?? 'draft'},
        ${input.sourceVendor ?? null},
        ${input.selectedSourceUrl ?? null},
        ${input.orderIntentIds ? (input.orderIntentIds as unknown as Prisma.InputJsonValue) : Prisma.JsonNull},
        ${input.operatorUserId ?? null},
        ${input.metadata ? (input.metadata as unknown as Prisma.InputJsonValue) : Prisma.JsonNull},
        ${now},
        ${now}
      )
      RETURNING *
    `);
    return batchRowToRecord(rows[0]);
  } catch (error) {
    if (!isMissingProcurementTable(error)) throw error;
    assertNotProductionFallback('procurement_batches');
    logger.warn('[Procurement] procurement_batches table missing, using memory fallback');
    const record: ProcurementBatchRecord = {
      id,
      status: input.status ?? 'draft',
      sourceVendor: input.sourceVendor ?? null,
      selectedSourceUrl: input.selectedSourceUrl ?? null,
      orderIntentIds: input.orderIntentIds ?? [],
      operatorUserId: input.operatorUserId ?? null,
      metadata: input.metadata ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    getBatchStore().set(id, record);
    return record;
  }
}

export async function listProcurementBatches(): Promise<ProcurementBatchRecord[]> {
  try {
    const rows = await prisma.$queryRaw<ProcurementBatchRow[]>(Prisma.sql`
      SELECT *
      FROM "procurement_batches"
      ORDER BY "created_at" DESC
    `);
    return rows.map(batchRowToRecord);
  } catch (error) {
    if (!isMissingProcurementTable(error)) throw error;
    assertNotProductionFallback('procurement_batches');
    return Array.from(getBatchStore().values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export async function updateProcurementBatch(
  id: string,
  input: UpdateProcurementBatchInput
): Promise<ProcurementBatchRecord | null> {
  const now = new Date();

  try {
    const rows = await prisma.$queryRaw<ProcurementBatchRow[]>(Prisma.sql`
      UPDATE "procurement_batches"
      SET
        "status" = COALESCE(${input.status ?? null}, "status"),
        "source_vendor" = COALESCE(${input.sourceVendor ?? null}, "source_vendor"),
        "selected_source_url" = COALESCE(${input.selectedSourceUrl ?? null}, "selected_source_url"),
        "order_intent_ids" = COALESCE(${input.orderIntentIds ? (input.orderIntentIds as unknown as Prisma.InputJsonValue) : null}, "order_intent_ids"),
        "operator_user_id" = COALESCE(${input.operatorUserId ?? null}, "operator_user_id"),
        "metadata" = COALESCE(${input.metadata ? (input.metadata as unknown as Prisma.InputJsonValue) : null}, "metadata"),
        "updated_at" = ${now}
      WHERE "id" = ${id}
      RETURNING *
    `);
    return rows[0] ? batchRowToRecord(rows[0]) : null;
  } catch (error) {
    if (!isMissingProcurementTable(error)) throw error;
    assertNotProductionFallback('procurement_batches');

    const existing = getBatchStore().get(id);
    if (!existing) return null;

    const updated: ProcurementBatchRecord = {
      ...existing,
      status: input.status ?? existing.status,
      sourceVendor: input.sourceVendor ?? existing.sourceVendor,
      selectedSourceUrl: input.selectedSourceUrl ?? existing.selectedSourceUrl,
      orderIntentIds: input.orderIntentIds ?? existing.orderIntentIds,
      operatorUserId: input.operatorUserId ?? existing.operatorUserId,
      metadata: input.metadata ?? existing.metadata,
      updatedAt: now.toISOString(),
    };
    getBatchStore().set(id, updated);
    return updated;
  }
}

export async function createProcurementTask(input: CreateProcurementTaskInput = {}): Promise<ProcurementTaskRecord> {
  const id = crypto.randomUUID();
  const now = new Date();

  try {
    const rows = await prisma.$queryRaw<ProcurementTaskRow[]>(Prisma.sql`
      INSERT INTO "procurement_tasks" (
        "id",
        "batch_id",
        "order_intent_id",
        "canonical_product_id",
        "status",
        "selected_source_url",
        "lowest_price_krw",
        "availability_status",
        "review_summary",
        "metadata",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${id},
        ${input.batchId ?? null},
        ${input.orderIntentId ?? null},
        ${input.canonicalProductId ?? null},
        ${input.status ?? 'queued'},
        ${input.selectedSourceUrl ?? null},
        ${input.lowestPriceKrw ?? null},
        ${input.availabilityStatus ?? null},
        ${input.reviewSummary ?? null},
        ${input.metadata ? (input.metadata as unknown as Prisma.InputJsonValue) : Prisma.JsonNull},
        ${now},
        ${now}
      )
      RETURNING *
    `);
    return taskRowToRecord(rows[0]);
  } catch (error) {
    if (!isMissingProcurementTable(error)) throw error;
    assertNotProductionFallback('procurement_tasks');
    logger.warn('[Procurement] procurement_tasks table missing, using memory fallback');
    const record: ProcurementTaskRecord = {
      id,
      batchId: input.batchId ?? null,
      orderIntentId: input.orderIntentId ?? null,
      canonicalProductId: input.canonicalProductId ?? null,
      status: input.status ?? 'queued',
      selectedSourceUrl: input.selectedSourceUrl ?? null,
      lowestPriceKrw: input.lowestPriceKrw ?? null,
      availabilityStatus: input.availabilityStatus ?? null,
      reviewSummary: input.reviewSummary ?? null,
      metadata: input.metadata ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    getTaskStore().set(id, record);
    return record;
  }
}

export async function updateProcurementTask(
  id: string,
  input: UpdateProcurementTaskInput
): Promise<ProcurementTaskRecord | null> {
  const now = new Date();

  try {
    const rows = await prisma.$queryRaw<ProcurementTaskRow[]>(Prisma.sql`
      UPDATE "procurement_tasks"
      SET
        "status" = COALESCE(${input.status ?? null}, "status"),
        "selected_source_url" = COALESCE(${input.selectedSourceUrl ?? null}, "selected_source_url"),
        "lowest_price_krw" = COALESCE(${input.lowestPriceKrw ?? null}, "lowest_price_krw"),
        "availability_status" = COALESCE(${input.availabilityStatus ?? null}, "availability_status"),
        "review_summary" = COALESCE(${input.reviewSummary ?? null}, "review_summary"),
        "metadata" = COALESCE(${input.metadata ? (input.metadata as unknown as Prisma.InputJsonValue) : null}, "metadata"),
        "updated_at" = ${now}
      WHERE "id" = ${id}
      RETURNING *
    `);
    return rows[0] ? taskRowToRecord(rows[0]) : null;
  } catch (error) {
    if (!isMissingProcurementTable(error)) throw error;
    assertNotProductionFallback('procurement_tasks');

    const existing = getTaskStore().get(id);
    if (!existing) return null;

    const updated: ProcurementTaskRecord = {
      ...existing,
      status: input.status ?? existing.status,
      selectedSourceUrl: input.selectedSourceUrl ?? existing.selectedSourceUrl,
      lowestPriceKrw: input.lowestPriceKrw ?? existing.lowestPriceKrw,
      availabilityStatus: input.availabilityStatus ?? existing.availabilityStatus,
      reviewSummary: input.reviewSummary ?? existing.reviewSummary,
      metadata: input.metadata ?? existing.metadata,
      updatedAt: now.toISOString(),
    };
    getTaskStore().set(id, updated);
    return updated;
  }
}

export async function listProcurementTasks(): Promise<ProcurementTaskRecord[]> {
  try {
    const rows = await prisma.$queryRaw<ProcurementTaskRow[]>(Prisma.sql`
      SELECT *
      FROM "procurement_tasks"
      ORDER BY "created_at" DESC
    `);
    return rows.map(taskRowToRecord);
  } catch (error) {
    if (!isMissingProcurementTable(error)) throw error;
    assertNotProductionFallback('procurement_tasks');
    return Array.from(getTaskStore().values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
