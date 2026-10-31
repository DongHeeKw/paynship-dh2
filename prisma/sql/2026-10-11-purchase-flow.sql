-- Apply once, using the trusted server/migration role. Every change is atomic.
BEGIN;

-- CreateTable
CREATE TABLE "delivery_profiles" (
    "user_id" TEXT NOT NULL,
    "encrypted_data" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "purchase_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "options" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "encrypted_delivery" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "version" INTEGER NOT NULL DEFAULT 0,
    "review" JSONB,
    "quote" JSONB,
    "quote_expires_at" TIMESTAMP(3),
    "payment_draft_id" TEXT,
    "checkout_url" TEXT,
    "payment_order_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "carrier" TEXT,
    "tracking_number" TEXT,
    "last_carrier_event_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_events" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_support_tickets" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "reply" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_quotas" (
    "key" TEXT NOT NULL,
    "bucket" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "purchase_quotas_pkey" PRIMARY KEY ("key","bucket")
);

-- CreateTable
CREATE TABLE "purchase_webhook_receipts" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_webhook_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_payment_draft_id_key" ON "purchase_requests"("payment_draft_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_payment_order_id_key" ON "purchase_requests"("payment_order_id");

-- CreateIndex
CREATE INDEX "purchase_requests_user_id_created_at_idx" ON "purchase_requests"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "purchase_requests_status_created_at_idx" ON "purchase_requests"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_user_id_idempotency_key_key" ON "purchase_requests"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "purchase_events_request_id_created_at_idx" ON "purchase_events"("request_id", "created_at");
CREATE INDEX "purchase_events_request_id_status_idx" ON "purchase_events"("request_id", "status");

-- CreateIndex
CREATE INDEX "purchase_support_tickets_request_id_created_at_idx" ON "purchase_support_tickets"("request_id", "created_at");

-- CreateIndex
CREATE INDEX "purchase_support_tickets_status_created_at_idx" ON "purchase_support_tickets"("status", "created_at");

-- AddForeignKey
ALTER TABLE "delivery_profiles" ADD CONSTRAINT "delivery_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_events" ADD CONSTRAINT "purchase_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_support_tickets" ADD CONSTRAINT "purchase_support_tickets_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase's public REST API must not expose these private tables. Prisma uses
-- a trusted server database role; browser anon/authenticated roles get no policies.
ALTER TABLE "delivery_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_support_tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_quotas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_webhook_receipts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "delivery_profiles", "purchase_requests", "purchase_events", "purchase_support_tickets", "purchase_quotas", "purchase_webhook_receipts" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "delivery_profiles", "purchase_requests", "purchase_events", "purchase_support_tickets", "purchase_quotas", "purchase_webhook_receipts" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "delivery_profiles", "purchase_requests", "purchase_events", "purchase_support_tickets", "purchase_quotas", "purchase_webhook_receipts" FROM authenticated;
  END IF;
END $$;

-- Protect historical application tables too: a URL namespace cannot defend
-- against direct Supabase REST reads or writes to public.users.is_admin.
-- The list is explicit and comes from this repository's Prisma model maps.
DO $$
DECLARE target TEXT;
BEGIN
  FOREACH target IN ARRAY ARRAY['users', 'user_preferences', 'scrape_requests', 'product_tasks', 'products', 'canonical_products', 'quotes', 'orders', 'order_intents', 'payment_requests', 'procurement_batches', 'procurement_tasks', 'chat_sessions', 'messages', 'carts', 'cart_items', 'admin_settings', 'category_mappings', 'shipping_rates', 'hs_code_rates', 'country_tax_rates', 'fta_rates', 'unipass_cache', 'gtin_cache', 'llm_usage', 'api_usage', 'scraper_cache', 'tavily_cache', 'scraper_domain_stats', 'chat_logs', 'admin_audit_logs', 'shopify_webhook_events', 'stream_states', 'session_event_logs', 'research_tasks', 'scrapling_shadow_observations', 'user_memories', 'brand_official_domains', 'shopify_product_mirrors', 'shopify_variant_mirrors', 'shipping_box_masters', 'fee_cap_rules', 'line_items', 'exchange_rates', 'supported_currencies', 'return_requests', 'inspection_responses', 'abandonment_logs', 'chargeback_incidents', 'blacklist_entries', 'catalog_entries', 'catalog_matches', 'product_cross_platform_scans', 'acrossb_shipments'] LOOP
    IF to_regclass(format('public.%I', target)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target);
      EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', target);
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE format('REVOKE ALL ON public.%I FROM anon', target);
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', target);
      END IF;
    END IF;
  END LOOP;
END $$;

ALTER TABLE purchase_requests ADD CONSTRAINT purchase_quantity_bound CHECK (quantity BETWEEN 1 AND 10);
ALTER TABLE purchase_requests ADD CONSTRAINT purchase_version_nonnegative CHECK (version >= 0);
ALTER TABLE purchase_requests ADD CONSTRAINT purchase_status_valid CHECK (status IN ('REVIEW_REQUIRED','QUOTED','PAYMENT_PENDING','PAID','PURCHASING','AT_WAREHOUSE','READY_TO_SHIP','SHIPPED','DELIVERED','ON_HOLD','REJECTED','CANCELLED'));
ALTER TABLE purchase_quotas ADD CONSTRAINT purchase_quota_positive CHECK (count > 0);
ALTER TABLE purchase_support_tickets ADD CONSTRAINT purchase_support_status_valid CHECK (status IN ('OPEN','RESOLVED'));
ALTER TABLE purchase_support_tickets ADD CONSTRAINT purchase_support_version_nonnegative CHECK (version >= 0);

COMMIT;
